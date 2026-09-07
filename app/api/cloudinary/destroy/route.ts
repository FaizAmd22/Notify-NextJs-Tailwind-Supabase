import { API_KEY, CLOUD_NAME, signParams } from "@/libs/cloudinary"
import getCurrentUserId from "@/libs/session"
import { NextRequest, NextResponse } from "next/server"

/**
 * Menghapus aset dari Cloudinary. Dipakai UploadModal untuk rollback: kalau
 * penulisan dokumen Firestore gagal setelah file berhasil ter-upload, file itu
 * harus dibersihkan supaya tidak jadi aset yatim yang memakan kuota.
 *
 * Payload-nya hanya public_id, jadi tidak kena batas body 4.5 MB.
 */
export async function POST(request: NextRequest) {
    const userId = await getCurrentUserId()

    if (!userId) {
        return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 })
    }

    if (!CLOUD_NAME || !API_KEY) {
        return NextResponse.json({ error: "Cloudinary belum dikonfigurasi" }, { status: 500 })
    }

    const { publicId, resourceType } = await request.json()

    if (typeof publicId !== "string" || !publicId) {
        return NextResponse.json({ error: "publicId wajib diisi" }, { status: 400 })
    }

    // mp3 diperlakukan Cloudinary sebagai resource "video"
    const type = resourceType === "video" ? "video" : "image"
    const timestamp = Math.round(Date.now() / 1000)
    const signature = signParams({ public_id: publicId, timestamp })

    const body = new FormData()
    body.append("public_id", publicId)
    body.append("timestamp", String(timestamp))
    body.append("api_key", API_KEY)
    body.append("signature", signature)

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${type}/destroy`,
        { method: "POST", body }
    )

    if (!res.ok) {
        console.log("[cloudinary/destroy]", await res.text())
        return NextResponse.json({ error: "Gagal menghapus aset" }, { status: 502 })
    }

    return NextResponse.json({ status: "ok" })
}
