import "server-only"

import { App, cert, getApps, initializeApp } from "firebase-admin/app"
import { Auth, getAuth } from "firebase-admin/auth"
import { Firestore, getFirestore } from "firebase-admin/firestore"

const ADMIN_APP_NAME = "notify-admin"

/**
 * Inisialisasi sengaja lazy, bukan di module scope.
 *
 * `next build` meng-import setiap modul saat mengumpulkan data halaman. Kalau
 * kredensial dicek saat import, build akan gagal total hanya karena env belum
 * terisi — padahal yang seharusnya gagal cuma request yang benar-benar
 * menyentuh Firestore.
 */
let cachedApp: App | null = null

const getAdminApp = (): App => {
    if (cachedApp) {
        return cachedApp
    }

    const existing = getApps().find((app) => app.name === ADMIN_APP_NAME)

    if (existing) {
        cachedApp = existing
        return cachedApp
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    // Private key disimpan di .env dengan \n literal, kembalikan ke newline asli
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Firebase Admin belum dikonfigurasi. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, dan FIREBASE_ADMIN_PRIVATE_KEY di .env.local"
        )
    }

    cachedApp = initializeApp(
        { credential: cert({ projectId, clientEmail, privateKey }) },
        ADMIN_APP_NAME
    )

    return cachedApp
}

export const getAdminAuth = (): Auth => getAuth(getAdminApp())

export const getAdminDb = (): Firestore => getFirestore(getAdminApp())
