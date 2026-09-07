export interface Song {
    id: string
    userId: string
    author: string
    title: string
    /** URL penuh dari Cloudinary (secure_url), bukan path seperti di Supabase Storage */
    songUrl: string
    imageUrl: string
    /** epoch millis — Timestamp Firestore tidak serializable ke Client Component */
    createdAt: number
}

/**
 * Penanda posisi untuk pagination Firestore. Harus serializable karena
 * bolak-balik antara Server Component dan Client Component.
 *
 * Menyimpan id dokumen selain createdAt supaya dua lagu dengan timestamp
 * identik tidak saling menutupi saat dijadikan titik lanjut.
 */
export type SongCursor = {
    createdAt: number
    id: string
} | null

export interface SongPage {
    songs: Song[]
    nextCursor: SongCursor
}

export interface UserDetails {
    id: string
    fullName?: string
    avatarUrl?: string
    email?: string
}
