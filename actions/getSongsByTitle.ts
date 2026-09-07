import { SongCursor, SongPage } from "@/types";
import getSongs, { SONGS_PAGE_SIZE } from "./getSongs";

/** Berapa dokumen diambil per putaran pemindaian */
const SCAN_BATCH = 60

/** Batas dokumen yang dipindai dalam SATU permintaan, agar kuota baca Firestore
 *  tidak terkuras oleh kata kunci yang nyaris tidak cocok apa pun */
const MAX_SCAN_PER_REQUEST = 300

/**
 * Firestore tidak punya padanan ILIKE '%...%' — hanya prefix match — jadi
 * pencocokan substring dikerjakan di memori.
 *
 * Supaya tetap bisa infinite scroll, koleksi dipindai per batch memakai cursor
 * yang sama dengan getSongs, lalu berhenti begitu satu halaman hasil terkumpul.
 * Cursor yang dikembalikan menunjuk posisi pemindaian, bukan posisi hasil,
 * sehingga permintaan berikutnya melanjutkan dari tempat pemindaian berhenti.
 *
 * Kalau koleksi tumbuh sampai puluhan ribu lagu, ganti dengan layanan pencarian
 * (Algolia/Typesense) atau simpan field titleLower lalu pakai query range prefix.
 */
const getSongsBTitle = async (
    title: string,
    cursor: SongCursor = null,
    pageSize: number = SONGS_PAGE_SIZE
): Promise<SongPage> => {
    if (!title) {
        return getSongs(cursor, pageSize)
    }

    const query = title.toLowerCase()
    const matches: SongPage["songs"] = []

    let scanCursor = cursor
    let scanned = 0

    while (matches.length < pageSize && scanned < MAX_SCAN_PER_REQUEST) {
        const page = await getSongs(scanCursor, SCAN_BATCH)

        scanned += page.songs.length
        scanCursor = page.nextCursor

        for (const song of page.songs) {
            if (song.title.toLowerCase().includes(query)) {
                matches.push(song)
            }
        }

        if (!scanCursor) {
            break
        }
    }

    return { songs: matches, nextCursor: scanCursor }
}

export default getSongsBTitle
