/**
 * Pengecek kredensial Firebase + Cloudinary.
 *
 *   node scripts/check-setup.mjs
 *
 * Skrip ini tidak pernah mencetak nilai rahasia — hanya panjang/prefiks-nya,
 * supaya aman dijalankan sambil berbagi layar.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const RESET = "\x1b[0m"
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const DIM = "\x1b[2m"

const ok = (msg) => console.log(`${GREEN}  OK${RESET}   ${msg}`)
const bad = (msg) => console.log(`${RED} GAGAL${RESET} ${msg}`)
const warn = (msg) => console.log(`${YELLOW} CATAT${RESET} ${msg}`)
const hint = (msg) => console.log(`${DIM}       ${msg}${RESET}`)

/** Parser .env sederhana — menghindari tambahan dependency */
const loadEnv = (file) => {
    let raw
    try {
        raw = readFileSync(resolve(process.cwd(), file), "utf8")
    } catch {
        return null
    }

    const env = {}

    for (const line of raw.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue

        const eq = trimmed.indexOf("=")
        if (eq === -1) continue

        const key = trimmed.slice(0, eq).trim()
        let value = trimmed.slice(eq + 1).trim()

        // Buang tanda kutip pembungkus, tapi pertahankan \n literal di dalamnya
        if (
            (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
            (value.startsWith("'") && value.endsWith("'") && value.length > 1)
        ) {
            value = value.slice(1, -1)
        }

        env[key] = value
    }

    return env
}

const REQUIRED = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
]

let failed = 0

console.log("\n=== 1. Variabel di .env.local ===\n")

const env = loadEnv(".env.local")

if (!env) {
    bad(".env.local tidak ditemukan")
    hint("Salin dari .env.example lalu isi nilainya")
    process.exit(1)
}

for (const key of REQUIRED) {
    const value = env[key]

    if (!value) {
        bad(`${key} kosong / belum ada`)
        failed++
    } else {
        ok(`${key} terisi ${DIM}(${value.length} karakter)${RESET}`)
    }
}

if (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_SERVICE_ROLE_KEY) {
    warn("Masih ada variabel SUPABASE_* — sudah tidak dipakai, sebaiknya dihapus")
    hint("Cabut juga service role key-nya di dashboard Supabase")
}

if (failed) {
    console.log(`\n${RED}Ada ${failed} variabel yang belum terisi. Lengkapi dulu sebelum lanjut.${RESET}\n`)
    process.exit(1)
}

// Bentuk private key adalah sumber error paling sering
console.log("\n=== 2. Bentuk private key ===\n")

const rawKey = env.FIREBASE_ADMIN_PRIVATE_KEY
const privateKey = rawKey.replace(/\\n/g, "\n")

if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    bad("FIREBASE_ADMIN_PRIVATE_KEY tidak mengandung '-----BEGIN PRIVATE KEY-----'")
    hint("Salin nilai private_key dari file JSON service account apa adanya")
    process.exit(1)
}

if (!privateKey.trimEnd().endsWith("-----END PRIVATE KEY-----")) {
    bad("Private key tidak diakhiri '-----END PRIVATE KEY-----'")
    process.exit(1)
}

ok("Private key berbentuk PEM yang valid")

if (!rawKey.includes("\\n") && !rawKey.includes("\n")) {
    bad("Private key tidak punya newline sama sekali")
    process.exit(1)
}

console.log("\n=== 3. Koneksi Firebase Admin ===\n")

try {
    const { cert, initializeApp } = await import("firebase-admin/app")
    const { getFirestore } = await import("firebase-admin/firestore")
    const { getAuth } = await import("firebase-admin/auth")

    const app = initializeApp({
        credential: cert({
            projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey,
        }),
    })

    // Membaca daftar koleksi sekaligus membuktikan kredensial diterima
    // DAN database Firestore-nya memang sudah dibuat
    const collections = await getFirestore(app).listCollections()
    ok(`Firestore terhubung ${DIM}(${collections.length} koleksi: ${collections.map((c) => c.id).join(", ") || "masih kosong"})${RESET}`)

    await getAuth(app).listUsers(1)
    ok("Firebase Auth dapat diakses")
} catch (error) {
    bad(`Firebase Admin gagal: ${error.message}`)

    if (/NOT_FOUND|does not exist/i.test(error.message)) {
        hint("Database Firestore belum dibuat — buka Console > Firestore Database > Create database")
    }
    if (/DECODER|PEM|invalid_grant/i.test(error.message)) {
        hint("Private key rusak — pastikan \\n tetap literal dan seluruh nilai dibungkus tanda kutip ganda")
    }
    if (/PERMISSION_DENIED/i.test(error.message)) {
        hint("Service account kurang izin, atau projectId tidak cocok dengan service account-nya")
    }

    failed++
}

console.log("\n=== 4. Kredensial Cloudinary ===\n")

try {
    const auth = Buffer.from(
        `${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`
    ).toString("base64")

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/ping`,
        { headers: { Authorization: `Basic ${auth}` } }
    )

    if (res.ok) {
        ok("Cloudinary merespons ping dengan status ok")
    } else {
        bad(`Cloudinary menolak: HTTP ${res.status}`)
        if (res.status === 401) {
            hint("API key atau API secret salah")
        }
        if (res.status === 404) {
            hint("Cloud name salah — cek lagi di Dashboard Cloudinary")
        }
        failed++
    }
} catch (error) {
    bad(`Cloudinary tidak terjangkau: ${error.message}`)
    failed++
}

console.log("")

if (failed) {
    console.log(`${RED}Setup belum lengkap — perbaiki item yang GAGAL di atas.${RESET}\n`)
    process.exit(1)
}

console.log(`${GREEN}Semua kredensial valid. Lanjutkan dengan: npm run dev${RESET}\n`)
