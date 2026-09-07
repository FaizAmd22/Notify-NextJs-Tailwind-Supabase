import { getAdminDb } from "@/libs/firebaseAdmin";
import { toSong } from "@/libs/serialize";
import { SongCursor, SongPage } from "@/types";
import { Timestamp } from "firebase-admin/firestore";

export const SONGS_PAGE_SIZE = 12

/**
 * Mengambil satu halaman lagu, terbaru dulu.
 *
 * Hanya memakai orderBy('createdAt') tanpa where, sehingga dilayani index
 * single-field bawaan Firestore — tidak perlu composite index apa pun.
 */
const getSongs = async (
    cursor: SongCursor = null,
    pageSize: number = SONGS_PAGE_SIZE
): Promise<SongPage> => {
    try {
        let query = getAdminDb()
            .collection('songs')
            .orderBy('createdAt', 'desc')
            // __name__ dideklarasikan eksplisit sebagai tie-breaker. Firestore
            // memang mengurutkannya begitu secara implisit, tapi validasi cursor
            // di Admin SDK menghitung orderBy yang tertulis saja — tanpa baris
            // ini, startAfter dua nilai ditolak "Too many cursor values".
            // Tetap dilayani index single-field bawaan, tidak perlu composite.
            .orderBy('__name__', 'desc')

        if (cursor) {
            query = query.startAfter(Timestamp.fromMillis(cursor.createdAt), cursor.id)
        }

        const snapshot = await query.limit(pageSize).get()
        const songs = snapshot.docs.map((doc) => toSong(doc.id, doc.data()))
        const last = songs[songs.length - 1]

        return {
            songs,
            // Halaman yang tidak penuh berarti sudah mentok di akhir koleksi
            nextCursor:
                songs.length === pageSize && last
                    ? { createdAt: last.createdAt, id: last.id }
                    : null,
        }
    } catch (error) {
        console.error('[getSongs]', error)
        return { songs: [], nextCursor: null }
    }
}

export default getSongs
