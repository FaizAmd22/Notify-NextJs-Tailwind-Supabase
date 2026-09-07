"use client"

import useAuthModal from "@/hooks/useAuthModal";
import { useUser } from "@/hooks/useUser";
import { db } from "@/libs/firebase";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from 'react'
import toast from "react-hot-toast";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";

interface LikeButtonProps {
    songId: string
}

/** Doc ID gabungan yang deterministik: cek/insert/delete cukup satu operasi
 *  langsung ke dokumen, tanpa query, dan duplikat mustahil terjadi. */
const likeId = (userId: string, songId: string) => `${userId}_${songId}`

const LikeButton: React.FC<LikeButtonProps> = ({
    songId
}) => {
    const router = useRouter()
    const authModal = useAuthModal()
    const { user } = useUser()

    const [isLiked, setIsLiked] = useState<boolean>(false)

    useEffect(() => {
      if (!user?.uid) {
        setIsLiked(false)
        return
      }

      let cancelled = false

      getDoc(doc(db, 'liked_songs', likeId(user.uid, songId)))
        .then((snapshot) => {
            if (!cancelled) {
                setIsLiked(snapshot.exists())
            }
        })
        .catch((error) => console.log('[LikeButton] fetch', error))

      return () => {
        cancelled = true
      }
    }, [songId, user?.uid])

    const Icon = isLiked ? AiFillHeart : AiOutlineHeart;

    const handleLike = async () => {
        if (!user) {
            return authModal.onOpen()
        }

        const ref = doc(db, 'liked_songs', likeId(user.uid, songId))

        try {
            if (isLiked) {
                await deleteDoc(ref)
                setIsLiked(false)
                toast.success('Removed from your liked song!')
            } else {
                await setDoc(ref, {
                    userId: user.uid,
                    songId,
                    createdAt: serverTimestamp()
                })
                setIsLiked(true)
                toast.success('Add to your liked song!')
            }

            router.refresh()
        } catch (error) {
            toast.error((error as Error).message)
        }
    }

    return (
        <button
            onClick={handleLike}
            className="hover:opacity-75 transition"
        >
            <Icon color={isLiked ? '#22c55e' : 'white'} size={25}/>
        </button>
     );
}

export default LikeButton;
