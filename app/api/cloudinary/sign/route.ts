import { API_KEY, CLOUD_NAME, isAllowedFolder, signParams } from "@/libs/cloudinary"
import getCurrentUserId from "@/libs/session"
import { NextRequest, NextResponse } from "next/server"

/**
 * Mengembalikan signature supaya browser bisa upload LANGSUNG ke Cloudinary.
 *
 * File sengaja tidak dilewatkan API route ini: body request serverless di Vercel
 * dibatasi 4.5 MB, sementara file mp3 hampir selalu lebih besar dari itu.
 */
export async function POST(request: NextRequest) {
    const userId = await getCurrentUserId()

    if (!userId) {
        return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 })
    }

    if (!CLOUD_NAME || !API_KEY) {
        return NextResponse.json({ error: "Cloudinary belum dikonfigurasi" }, { status: 500 })
    }

    const { folder } = await request.json()

    if (typeof folder !== "string" || !isAllowedFolder(folder)) {
        return NextResponse.json({ error: "Folder tidak diizinkan" }, { status: 400 })
    }

    const timestamp = Math.round(Date.now() / 1000)
    const signature = signParams({ folder, timestamp })

    return NextResponse.json({
        signature,
        timestamp,
        apiKey: API_KEY,
        cloudName: CLOUD_NAME,
    })
}
