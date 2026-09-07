import { getAdminAuth, getAdminDb } from "@/libs/firebaseAdmin"
import { SESSION_COOKIE, SESSION_HINT_COOKIE, SESSION_MAX_AGE_MS } from "@/libs/authCookies"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

/**
 * Menukar ID token Firebase (dari client SDK) jadi session cookie httpOnly,
 * supaya Server Component di actions/ bisa tahu siapa yang login.
 *
 * Sekaligus meng-upsert dokumen users/{uid}. Di Supabase ini dikerjakan trigger
 * handle_new_user() di sisi database; Firestore tidak punya trigger bawaan,
 * jadi tempat paling tepat adalah di sini — satu-satunya jalur yang pasti
 * dilewati setiap kali user login.
 */
export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json()

        if (!idToken) {
            return NextResponse.json({ error: "idToken wajib diisi" }, { status: 400 })
        }

        const adminAuth = getAdminAuth()
        const decoded = await adminAuth.verifyIdToken(idToken)

        // Firebase me-refresh ID token tiap jam, dan setiap refresh memanggil
        // route ini. Tanpa pengecekan berikut, setiap page load ikut menulis
        // dokumen users — menambah latensi sekaligus menggerus jatah 20k
        // write/hari Firestore hanya untuk menulis data yang sama persis.
        const existing = cookies().get(SESSION_COOKIE)?.value
        let sameUserAlreadySignedIn = false

        if (existing) {
            try {
                const previous = await adminAuth.verifySessionCookie(existing)
                sameUserAlreadySignedIn = previous.uid === decoded.uid
            } catch {
                // cookie lama kedaluwarsa — perlakukan sebagai login baru
            }
        }

        const sessionCookie = await adminAuth.createSessionCookie(idToken, {
            expiresIn: SESSION_MAX_AGE_MS,
        })

        if (!sameUserAlreadySignedIn) {
            await getAdminDb().collection("users").doc(decoded.uid).set(
                {
                    email: decoded.email ?? null,
                    fullName: decoded.name ?? null,
                    avatarUrl: decoded.picture ?? null,
                },
                { merge: true }
            )
        }

        const shared = {
            maxAge: SESSION_MAX_AGE_MS / 1000,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            path: "/",
        }

        cookies().set({
            name: SESSION_COOKIE,
            value: sessionCookie,
            httpOnly: true,
            ...shared,
        })

        // Penanda yang bisa dibaca client agar tidak perlu menunggu route ini
        // pada page load berikutnya. Lihat komentar di libs/session.ts.
        cookies().set({
            name: SESSION_HINT_COOKIE,
            value: decoded.uid,
            httpOnly: false,
            ...shared,
        })

        return NextResponse.json({ status: "ok" })
    } catch (error) {
        console.log("[auth/session] POST", error)
        return NextResponse.json({ error: "Gagal membuat session" }, { status: 401 })
    }
}

export async function DELETE() {
    cookies().delete(SESSION_COOKIE)
    cookies().delete(SESSION_HINT_COOKIE)
    return NextResponse.json({ status: "ok" })
}
