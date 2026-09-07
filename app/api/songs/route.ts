import getSongs from "@/actions/getSongs"
import getSongsByTitle from "@/actions/getSongsByTitle"
import { SongCursor } from "@/types"
import { NextRequest, NextResponse } from "next/server"

/**
 * Halaman berikutnya untuk infinite scroll di beranda dan pencarian.
 *
 * Sengaja Route Handler, bukan Server Action: firebase-admin adalah paket Node
 * murni yang webpack perlakukan sebagai async module, dan begitu ia masuk graph
 * Server Action, bundle-nya memuat top-level await di fungsi non-async sehingga
 * build gagal. Route Handler dikompilasi sebagai modul server biasa dan bebas
 * dari masalah itu.
 *
 * Data yang dilayani adalah katalog lagu, yang di firestore.rules juga sudah
 * publik — jadi endpoint ini memang tidak butuh autentikasi.
 */

/** Cursor dikirim sebagai "<epochMillis>:<docId>" */
const parseCursor = (raw: string | null): SongCursor => {
    if (!raw) {
        return null
    }

    const separator = raw.indexOf(":")

    if (separator < 1) {
        return null
    }

    const createdAt = Number(raw.slice(0, separator))
    const id = raw.slice(separator + 1)

    if (!Number.isFinite(createdAt) || !id) {
        return null
    }

    return { createdAt, id }
}

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams
    const title = params.get("title") ?? ""
    const cursor = parseCursor(params.get("cursor"))

    const page = title
        ? await getSongsByTitle(title, cursor)
        : await getSongs(cursor)

    return NextResponse.json(page)
}
