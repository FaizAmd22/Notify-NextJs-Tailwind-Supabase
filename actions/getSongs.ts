import { getAdminDb } from "@/libs/firebaseAdmin";
import { toSong } from "@/libs/serialize";
import { Song } from "@/types";

const getSongs = async (): Promise<Song[]> => {
    try {
        const snapshot = await getAdminDb()
            .collection('songs')
            .orderBy('createdAt', 'desc')
            .get()

        return snapshot.docs.map((doc) => toSong(doc.id, doc.data()))
    } catch (error) {
        console.log(error)
        return []
    }
}

export default getSongs
