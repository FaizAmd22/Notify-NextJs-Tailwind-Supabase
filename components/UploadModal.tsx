"use client"

import useUploadModal from "@/hooks/useUploadModal";
import { useUser } from "@/hooks/useUser";
import { db } from "@/libs/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import Button from "./Button";
import Input from "./Input";
import Modal from "./Modal";

const SONG_FOLDER = "notify/songs"
const IMAGE_FOLDER = "notify/images"

type ResourceType = "image" | "video"

type Signature = {
    signature: string
    timestamp: number
    apiKey: string
    cloudName: string
}

type UploadedAsset = {
    url: string
    publicId: string
    resourceType: ResourceType
}

const getSignature = async (folder: string): Promise<Signature> => {
    const res = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
    })

    if (!res.ok) {
        throw new Error("Failed to authorize upload")
    }

    return res.json()
}

/**
 * XMLHttpRequest dipakai, bukan fetch, semata karena hanya XHR yang memberi
 * event progres unggahan — fetch belum punya padanannya di browser.
 *
 * File tetap dikirim langsung ke Cloudinary, tidak lewat API route Next.js:
 * body request serverless di Vercel dibatasi 4.5 MB dan mp3 hampir selalu
 * lebih besar dari itu.
 */
const uploadToCloudinary = (
    file: File,
    folder: string,
    resourceType: ResourceType,
    sign: Signature,
    onProgress: (loaded: number) => void
) =>
    new Promise<UploadedAsset>((resolve, reject) => {
        const body = new FormData()
        body.append("file", file)
        body.append("folder", folder)
        body.append("timestamp", String(sign.timestamp))
        body.append("api_key", sign.apiKey)
        body.append("signature", sign.signature)

        const xhr = new XMLHttpRequest()
        xhr.open(
            "POST",
            `https://api.cloudinary.com/v1_1/${sign.cloudName}/${resourceType}/upload`
        )

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                onProgress(event.loaded)
            }
        }

        xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) {
                return reject(new Error("Failed upload"))
            }

            try {
                const data = JSON.parse(xhr.responseText)
                resolve({
                    url: data.secure_url,
                    publicId: data.public_id,
                    resourceType,
                })
            } catch {
                reject(new Error("Unexpected response from Cloudinary"))
            }
        }

        xhr.onerror = () => reject(new Error("Network error while uploading"))
        xhr.send(body)
    })

const destroyAsset = async (asset: UploadedAsset) => {
    try {
        await fetch("/api/cloudinary/destroy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                publicId: asset.publicId,
                resourceType: asset.resourceType,
            }),
        })
    } catch (error) {
        console.log("[UploadModal] rollback", error)
    }
}

const UploadModal = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const uploadModal = useUploadModal()
    const { user } = useUser()
    const router = useRouter()

    const {
        register,
        handleSubmit,
        reset
    } = useForm<FieldValues>({
        defaultValues: {
            author: '',
            title: '',
            song: null,
            image: null,
        }
    })

    const onChange = (open: boolean) => {
        // Menutup modal di tengah unggahan akan meninggalkan file yatim di
        // Cloudinary tanpa dokumen Firestore-nya, jadi ditahan selagi berjalan.
        if (isLoading) {
            return
        }

        if (!open) {
            reset()
            setProgress(0)
            uploadModal.onClose()
        }
    }

    const onSubmit: SubmitHandler<FieldValues> = async (values) => {
        const imageFile = values.image?.[0]
        const songFile = values.song?.[0]

        if (!imageFile || !songFile || !user) {
            toast.error('Missing fields')
            return
        }

        setIsLoading(true)
        setProgress(0)

        const totalBytes = songFile.size + imageFile.size
        const loaded = { song: 0, image: 0 }
        const report = () =>
            setProgress(Math.round(((loaded.song + loaded.image) / totalBytes) * 100))

        try {
            // Kedua signature diminta sekaligus, lalu kedua file diunggah
            // bersamaan. Versi sebelumnya menjalankan keempat langkah ini
            // berurutan sehingga waktunya menumpuk.
            const [songSign, imageSign] = await Promise.all([
                getSignature(SONG_FOLDER),
                getSignature(IMAGE_FOLDER),
            ])

            const results = await Promise.allSettled([
                uploadToCloudinary(songFile, SONG_FOLDER, "video", songSign, (n) => {
                    loaded.song = n
                    report()
                }),
                uploadToCloudinary(imageFile, IMAGE_FOLDER, "image", imageSign, (n) => {
                    loaded.image = n
                    report()
                }),
            ])

            const uploaded = results
                .filter(
                    (r): r is PromiseFulfilledResult<UploadedAsset> =>
                        r.status === "fulfilled"
                )
                .map((r) => r.value)

            const failure = results.find((r) => r.status === "rejected")

            if (failure) {
                // Salah satu gagal — bersihkan yang terlanjur berhasil
                await Promise.all(uploaded.map(destroyAsset))
                throw (failure as PromiseRejectedResult).reason
            }

            const [song, image] = uploaded

            try {
                await addDoc(collection(db, 'songs'), {
                    userId: user.uid,
                    title: values.title,
                    author: values.author,
                    songUrl: song.url,
                    songPublicId: song.publicId,
                    imageUrl: image.url,
                    imagePublicId: image.publicId,
                    createdAt: serverTimestamp(),
                })
            } catch (error) {
                await Promise.all(uploaded.map(destroyAsset))
                throw error
            }

            router.refresh()
            toast.success('Song created!')
            reset()
            setProgress(0)
            uploadModal.onClose()
        } catch (error) {
            toast.error((error as Error).message || "Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Modal
            title="Add a song"
            description="Upload an mp3 file"
            isOpen={uploadModal.isOpen}
            onChange={onChange}
        >
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-y-4"
            >
                <Input
                    id="title"
                    disabled={isLoading}
                    {...register('title', {required: true})}
                    placeholder="Song title"
                />
                <Input
                    id="author"
                    disabled={isLoading}
                    {...register('author', {required: true})}
                    placeholder="Song author"
                />
                <div>
                    <div className="pb-1">
                        Select a song file
                    </div>
                    <Input
                        id="song"
                        type="file"
                        disabled={isLoading}
                        {...register('song', {required: true})}
                        accept=".mp3"
                    />
                </div>
                <div>
                    <div className="pb-1">
                        Select an image
                    </div>
                    <Input
                        id="image"
                        type="file"
                        disabled={isLoading}
                        {...register('image', {required: true})}
                        accept="image/*"
                    />
                </div>

                {isLoading && (
                    <div className="flex flex-col gap-y-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-700">
                            <div
                                className="h-full bg-green-500 transition-all duration-200"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-neutral-400 text-center">
                            {progress < 100 ? `Uploading ${progress}%` : 'Finishing up'}
                        </p>
                    </div>
                )}

                <Button disabled={isLoading} type="submit">
                    {isLoading ? 'Uploading' : 'Create'}
                </Button>
            </form>
        </Modal>
     );
}

export default UploadModal;
