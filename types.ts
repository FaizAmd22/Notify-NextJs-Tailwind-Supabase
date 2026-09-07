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

export interface UserDetails {
    id: string
    fullName?: string
    avatarUrl?: string
    email?: string
}
