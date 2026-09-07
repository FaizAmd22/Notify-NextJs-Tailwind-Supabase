import { getAdminDb } from "@/libs/firebaseAdmin";
import { toMillis, toSong } from "@/libs/serialize";
import getCurrentUserId from "@/libs/session";
import { Song } from "@/types";

/**
 * Pengganti join PostgREST `.select('*, songs(*)')`.
 * Firestore tidak punya join, jadi dilakukan dua langkah: ambil dokumen like
 * milik user, lalu ambil dokumen lagunya sekaligus lewat getAll().
 */
const getLikedSongs = async (): Promise<Song[]> => {
    const userId = await getCurrentUserId()

    if (!userId) {
        return []
    }

    try {
        const db = getAdminDb()

        // Tanpa .orderBy() supaya tidak menuntut composite index — lihat alasan
        // yang sama di getSongsByUserId. Urutannya dibereskan di memori.
        const likes = await db
            .collection('liked_songs')
            .where('userId', '==', userId)
            .get()

        if (likes.empty) {
            return []
        }

        const ordered = likes.docs
            .map((like) => ({
                songId: like.data().songId as string,
                likedAt: toMillis(like.data().createdAt),
            }))
            .sort((a, b) => b.likedAt - a.likedAt)

        const songRefs = ordered.map((like) =>
            db.collection('songs').doc(like.songId)
        )

        const songDocs = await db.getAll(...songRefs)

        // getAll mempertahankan urutan input, jadi urutan "terakhir di-like"
        // tetap terjaga. Lagu yang sudah dihapus disaring di sini.
        return songDocs
            .filter((doc) => doc.exists)
            .map((doc) => toSong(doc.id, doc.data()))
    } catch (error) {
        console.error('[getLikedSongs]', error)
        return []
    }
}

export default getLikedSongs
