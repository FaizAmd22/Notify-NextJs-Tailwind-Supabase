import "server-only"

import crypto from "crypto"

export const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
export const API_KEY = process.env.CLOUDINARY_API_KEY
const API_SECRET = process.env.CLOUDINARY_API_SECRET

/** Folder yang boleh dipakai upload — mencegah client mengarang lokasi sendiri */
export const SONG_FOLDER = "notify/songs"
export const IMAGE_FOLDER = "notify/images"

export const isAllowedFolder = (folder: string) =>
    folder === SONG_FOLDER || folder === IMAGE_FOLDER

/**
 * Signature Cloudinary: semua param diurutkan alfabetis, digabung jadi
 * "key=value&key=value", lalu di-SHA1 bersama api_secret.
 * api_secret tidak pernah ikut dikirim ke browser.
 */
export const signParams = (params: Record<string, string | number>) => {
    if (!API_SECRET) {
        throw new Error("CLOUDINARY_API_SECRET belum di-set di .env.local")
    }

    const toSign = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&")

    return crypto.createHash("sha1").update(toSign + API_SECRET).digest("hex")
}
