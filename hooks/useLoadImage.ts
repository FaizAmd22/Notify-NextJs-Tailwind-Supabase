import { Song } from "@/types";

/**
 * Cloudinary mengembalikan secure_url lengkap saat upload, dan URL itu yang
 * disimpan di Firestore — jadi tidak ada lagi perakitan URL dari path seperti
 * getPublicUrl() milik Supabase Storage.
 */
const useLoadImage = (song: Song) => {
    return song?.imageUrl || null
}

export default useLoadImage
