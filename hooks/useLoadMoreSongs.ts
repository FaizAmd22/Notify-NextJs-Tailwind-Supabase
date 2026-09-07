import { Song, SongCursor } from "@/types"

/**
 * Memanggil /api/songs untuk halaman berikutnya.
 *
 * Dipakai beranda (tanpa title) maupun pencarian (dengan title), sehingga
 * pengkodean cursor hanya ditulis di satu tempat.
 */
const loadMoreSongs = async (
    cursor: SongCursor,
    title?: string
): Promise<{ items: Song[]; nextCursor: SongCursor }> => {
    const params = new URLSearchParams()

    if (cursor) {
        params.set("cursor", `${cursor.createdAt}:${cursor.id}`)
    }

    if (title) {
        params.set("title", title)
    }

    const res = await fetch(`/api/songs?${params.toString()}`)

    if (!res.ok) {
        throw new Error("Failed to load more songs")
    }

    const page = await res.json()

    return { items: page.songs, nextCursor: page.nextCursor }
}

export default loadMoreSongs
