/**
 * Mengelola daftar Authorized domains Firebase Authentication.
 *
 *   npm run auth:domain -- notify-chill.vercel.app
 *   npm run auth:domain -- domain-a.vercel.app domain-b.vercel.app
 *   npm run auth:domain -- --remove domain-yang-salah.vercel.app
 *
 * Tanpa domain terdaftar, signInWithPopup menolak dengan
 * `auth/unauthorized-domain`. Memakai service account, jadi tidak perlu
 * `firebase login`.
 */

import { readFileSync } from "node:fs"
import { cert } from "firebase-admin/app"

const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const DIM = "\x1b[2m"
const RESET = "\x1b[0m"

const env = {}
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i < 0) continue
    let v = t.slice(i + 1).trim()
    if (v.length > 1 && v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    env[t.slice(0, i).trim()] = v
}

const project = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

// Terima bentuk apa pun yang disalin user: URL penuh, dengan/tanpa slash akhir
const normalise = (input) =>
    input
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .toLowerCase()

const args = process.argv.slice(2)
const isRemoving = args.includes("--remove")
const wanted = args.filter((a) => a !== "--remove").map(normalise).filter(Boolean)

if (!wanted.length) {
    console.error(`${RED}GAGAL${RESET} Domain belum diberikan`)
    console.error(`${DIM}      Contoh: npm run auth:domain -- notify-chill.vercel.app${RESET}`)
    process.exit(1)
}

if (wanted.some((d) => d.includes("*"))) {
    console.error(`${RED}GAGAL${RESET} Firebase tidak menerima wildcard pada authorized domains`)
    console.error(`${DIM}      Setiap domain harus didaftarkan utuh.${RESET}`)
    process.exit(1)
}

const credential = cert({
    projectId: project,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.split(
        String.fromCharCode(92) + "n"
    ).join(String.fromCharCode(10)),
})

const { access_token: token } = await credential.getAccessToken()
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
const configUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`

const current = await fetch(configUrl, { headers })
const config = await current.json()

if (!current.ok) {
    console.error(`${RED}GAGAL${RESET} membaca config: ${config.error?.message}`)
    process.exit(1)
}

const existing = config.authorizedDomains || []
console.log(`\nSekarang terdaftar: ${existing.join(", ")}\n`)

// Domain bawaan Firebase dipagari: menghapusnya akan mematikan alur OAuth
// (handler login dilayani dari <project>.firebaseapp.com).
const protectedDomains = ["localhost", `${project}.firebaseapp.com`, `${project}.web.app`]

if (isRemoving) {
    const blocked = wanted.filter((d) => protectedDomains.includes(d))

    if (blocked.length) {
        console.error(`${RED}GAGAL${RESET} domain bawaan Firebase tidak boleh dihapus: ${blocked.join(", ")}`)
        process.exit(1)
    }
}

const toAdd = isRemoving ? [] : wanted.filter((d) => !existing.includes(d))
const toRemove = isRemoving ? wanted.filter((d) => existing.includes(d)) : []

if (!toAdd.length && !toRemove.length) {
    console.log(`${GREEN}Tidak ada perubahan yang perlu dilakukan.${RESET}\n`)
    process.exit(0)
}

const res = await fetch(`${configUrl}?updateMask=authorizedDomains`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
        authorizedDomains: isRemoving
            ? existing.filter((d) => !toRemove.includes(d))
            : [...existing, ...toAdd],
    }),
})

const body = await res.json()

if (!res.ok) {
    console.error(`${RED}GAGAL${RESET} HTTP ${res.status}: ${body.error?.message}`)
    process.exit(1)
}

for (const domain of toAdd) {
    console.log(`${GREEN}OK${RESET}    ditambahkan: ${domain}`)
}

for (const domain of toRemove) {
    console.log(`${GREEN}OK${RESET}    dihapus: ${domain}`)
}

console.log(`\nDaftar terbaru: ${(body.authorizedDomains || []).join(", ")}`)
console.log(
    `${YELLOW}Catatan:${RESET} URL preview Vercel berganti tiap deploy dan Firebase tidak\nmendukung wildcard, jadi login Google hanya jalan di domain yang terdaftar.\n`
)
