import { db } from "@/libs/firebase"
import { toSong } from "@/libs/serialize"
import { Song } from "@/types"
import { doc, getDoc } from "firebase/firestore"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

const useGetSongById = (id?: string) => {
    const [isLoading, setIsLoading] = useState(false)
    const [song, setSong] = useState<Song | undefined>()

    useEffect(() => {
      if (!id) {
        return
      }

      setIsLoading(true)

      const fetchSong = async () => {
        try {
            const snapshot = await getDoc(doc(db, 'songs', id))

            if (!snapshot.exists()) {
                setIsLoading(false)
                return toast.error('Song not found')
            }

            setSong(toSong(snapshot.id, snapshot.data()))
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setIsLoading(false)
        }
      }

      fetchSong()
    }, [id])

    return useMemo(() => ({
        isLoading,
        song
    }), [isLoading, song])
}

export default useGetSongById
