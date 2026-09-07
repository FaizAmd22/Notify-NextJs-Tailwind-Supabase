/**
 * Menyalin client_email + private_key dari file JSON service account Firebase
 * ke .env.local, dengan format yang benar.
 *
 *   node scripts/import-service-account.mjs "C:\Users\Anda\Downloads\xxx.json"
 *
 * Menulis private key secara manual adalah sumber error paling sering pada
 * setup ini: newline asli harus diubah jadi \n literal dan seluruh nilai
 * dibungkus tanda kutip ganda. Skrip ini yang mengerjakannya.
 *
 * Nilai rahasia tidak pernah dicetak ke layar.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const DIM = "\x1b[2m"
const RESET = "\x1b[0m"

const die = (msg, hint) => {
    console.error(`${RED}GAGAL${RESET} ${msg}`)
    if (hint) console.error(`${DIM}      ${hint}${RESET}`)
    process.exit(1)
}

const jsonPath = process.argv[2]

if (!jsonPath) {
    die(
        "Path file JSON belum diberikan",
        'Contoh: node scripts/import-service-account.mjs C:/Users/Sherlock/Downloads/notify-server-xxx.json'
    )
}

if (!existsSync(jsonPath)) {
    die(`File tidak ditemukan: ${jsonPath}`)
}

let sa
try {
    sa = JSON.parse(readFileSync(jsonPath, "utf8"))
} catch (error) {
    die(`File bukan JSON yang valid: ${error.message}`)
}

if (sa.type !== "service_account") {
    die(
        "File ini bukan service account key",
        'File yang benar punya field "type": "service_account" dan "private_key"'
    )
}

for (const field of ["project_id", "client_email", "private_key"]) {
    if (!sa[field]) die(`Field "${field}" tidak ada di JSON`)
}

const envPath = resolve(process.cwd(), ".env.local")

if (!existsSync(envPath)) {
    die(".env.local tidak ditemukan", "Salin dulu dari .env.example")
}

let env = readFileSync(envPath, "utf8")

// Pastikan JSON-nya milik project yang sama dengan konfigurasi web
const configuredProject = env.match(/^NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.*)$/m)?.[1]?.trim()

if (configuredProject && configuredProject !== sa.project_id) {
    die(
        `Project tidak cocok: JSON ini milik "${sa.project_id}", sedangkan .env.local diset ke "${configuredProject}"`,
        "Unduh service account dari project yang benar, atau perbaiki NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    )
}

// Newline asli -> \n literal, karena format .env hanya satu baris per variabel
// JSON.stringify menghasilkan string ber-tanda-kutip yang newline-nya sudah
// jadi escape dua-karakter, persis format yang dibutuhkan .env. Dipakai juga
// agar file ini sendiri tidak perlu memuat literal backslash yang rawan
// termakan escaping saat di-generate.
const quotedPrivateKey = JSON.stringify(sa.private_key)

const upsert = (source, key, value) => {
    const line = `${key}=${value}`
    const pattern = new RegExp(`^${key}=.*$`, "m")
    return pattern.test(source) ? source.replace(pattern, line) : `${source.trimEnd()}\n${line}\n`
}

copyFileSync(envPath, `${envPath}.bak`)

env = upsert(env, "FIREBASE_ADMIN_CLIENT_EMAIL", sa.client_email)
env = upsert(env, "FIREBASE_ADMIN_PRIVATE_KEY", quotedPrivateKey)

writeFileSync(envPath, env)

console.log(`${GREEN}OK${RESET}    project_id      ${sa.project_id}`)
console.log(`${GREEN}OK${RESET}    client_email    ${sa.client_email}`)
console.log(`${GREEN}OK${RESET}    private_key     ${DIM}${quotedPrivateKey.length} karakter, satu baris, escape aman${RESET}`)
console.log(`${DIM}      cadangan .env.local sebelumnya: .env.local.bak${RESET}`)
console.log(`\n${YELLOW}Hapus file JSON dari Downloads setelah ini${RESET} — isinya kunci penuh ke project Anda.`)
console.log(`Lanjutkan dengan: npm run check:setup\n`)
