import "server-only"

import { cookies } from "next/headers"
import { SESSION_COOKIE } from "./authCookies"
import { getAdminAuth } from "./firebaseAdmin"

/**
 * Pengganti supabase.auth.getSession() di sisi server.
 * Mengembalikan uid user yang login, atau null kalau cookie tidak ada/tidak valid.
 *
 * Verifikasi sengaja tanpa checkRevoked: argumen itu memicu satu round-trip
 * ke Firebase setiap kali dipanggil, sementara helper ini jalan di app/layout.tsx
 * pada SETIAP page load. Tanpanya verifikasi murni lokal (cek signature JWT).
 */
const getCurrentUserId = async (): Promise<string | null> => {
    const sessionCookie = cookies().get(SESSION_COOKIE)?.value

    if (!sessionCookie) {
        return null
    }

    try {
        const decoded = await getAdminAuth().verifySessionCookie(sessionCookie)
        return decoded.uid
    } catch {
        // cookie kedaluwarsa atau dirusak — perlakukan sebagai belum login
        return null
    }
}

export default getCurrentUserId
