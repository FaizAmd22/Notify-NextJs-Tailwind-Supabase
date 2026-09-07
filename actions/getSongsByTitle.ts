import { Song } from "@/types";
import getSongs from "./getSongs";

/**
 * Firestore tidak punya padanan ILIKE '%...%' — hanya bisa prefix match,
 * jadi pencarian substring dilakukan di memori.
 *
 * Ini aman selama koleksi lagu masih kecil, dan getSongs() memang sudah
 * mengambil seluruh koleksi untuk homepage. Kalau nanti tembus ~1000 lagu,
 * ganti dengan Algolia atau simpan field titleLower + query range prefix.
 */
const getSongsBTitle = async (title: string): Promise<Song[]> => {
    const allSongs = await getSongs()

    if (!title) {
        return allSongs
    }

    const query = title.toLowerCase()

    return allSongs.filter((song) =>
        song.title.toLowerCase().includes(query)
    )
}

export default getSongsBTitle
