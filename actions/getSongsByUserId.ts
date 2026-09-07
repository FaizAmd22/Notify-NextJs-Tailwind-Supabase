import { getAdminDb } from "@/libs/firebaseAdmin";
import { toSong } from "@/libs/serialize";
import getCurrentUserId from "@/libs/session";
import { Song } from "@/types";

const getSongsByUserId = async (): Promise<Song[]> => {
    const userId = await getCurrentUserId()

    if (!userId) {
        return []
    }

    try {
        const snapshot = await getAdminDb()
            .collection('songs')
            .where('userId', '==', userId)
            .get()

        return snapshot.docs
            .map((doc) => toSong(doc.id, doc.data()))
            .sort((a, b) => b.createdAt - a.createdAt)
    } catch (error) {
        console.error('[getSongsByUserId]', error)
        return []
    }
}

export default getSongsByUserId
