"use client"

import { auth } from "@/libs/firebase"
import { SESSION_HINT_COOKIE } from "@/libs/authCookies"
import { User, onIdTokenChanged } from "firebase/auth"
import { createContext, useEffect, useState } from "react"

export type FirebaseAuthContextType = {
    user: User | null
    isLoading: boolean
}

export const FirebaseAuthContext = createContext<FirebaseAuthContextType>({
    user: null,
    isLoading: true,
})

interface FirebaseAuthProviderProps {
    children: React.ReactNode
}

const readSessionHint = () => {
    if (typeof document === "undefined") {
        return null
    }

    const match = document.cookie.match(
        new RegExp(`(?:^|; )${SESSION_HINT_COOKIE}=([^;]*)`)
    )

    return match ? decodeURIComponent(match[1]) : null
}

const syncSession = async (user: User | null) => {
    if (!user) {
        await fetch("/api/auth/session", { method: "DELETE" })
        return
    }

    const idToken = await user.getIdToken()

    await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
    })
}

/**
 * Pengganti SupabaseProvider/SessionContextProvider.
 *
 * onIdTokenChanged (bukan onAuthStateChanged) dipakai supaya session cookie di
 * server ikut diperbarui setiap kali Firebase me-refresh ID token, bukan hanya
 * saat login/logout.
 */
const FirebaseAuthProvider: React.FC<FirebaseAuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        return onIdTokenChanged(auth, async (firebaseUser) => {
            // Jalur cepat: penanda menunjukkan server sudah punya session untuk
            // uid ini, jadi UI boleh langsung tampil dan penyegaran cookie
            // dikerjakan di latar belakang. Ini menghapus satu round-trip yang
            // sebelumnya memblokir SETIAP page load.
            if (firebaseUser && readSessionHint() === firebaseUser.uid) {
                setUser(firebaseUser)
                setIsLoading(false)
                void syncSession(firebaseUser).catch((error) =>
                    console.log("[FirebaseAuthProvider] background sync", error)
                )
                return
            }

            // Jalur lambat: login/logout baru. Di sini penantian memang perlu —
            // konsumen seperti AuthModal langsung memanggil router.refresh(),
            // dan kalau cookie belum ada di server, halaman ter-render seolah
            // belum login.
            try {
                await syncSession(firebaseUser)
            } catch (error) {
                console.log("[FirebaseAuthProvider] sync session", error)
            } finally {
                setUser(firebaseUser)
                setIsLoading(false)
            }
        })
    }, [])

    return (
        <FirebaseAuthContext.Provider value={{ user, isLoading }}>
            {children}
        </FirebaseAuthContext.Provider>
    )
}

export default FirebaseAuthProvider
