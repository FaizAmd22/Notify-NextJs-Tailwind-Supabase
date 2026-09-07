/**
 * Deploy firestore.rules + composite index dari firestore.indexes.json.
 *
 *   npm run deploy:firebase
 *
 * Memakai service account di .env.local lewat REST API Firebase, sehingga tidak
 * perlu `firebase login` (yang butuh alur OAuth di browser).
 */

import { readFileSync } from "node:fs"
import { cert, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const DIM = "\x1b[2m"
const RESET = "\x1b[0m"

const loadEnv = () => {
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
    return env
}

const env = loadEnv()
const project = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

if (!project || !env.FIREBASE_ADMIN_CLIENT_EMAIL || !env.FIREBASE_ADMIN_PRIVATE_KEY) {
    console.error(`${RED}GAGAL${RESET} Kredensial Firebase Admin belum lengkap di .env.local`)
    process.exit(1)
}

const credential = cert({
    projectId: project,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    // Nilai di .env menyimpan newline sebagai escape dua karakter
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.split(String.fromCharCode(92) + "n").join(
        String.fromCharCode(10)
    ),
})

const { access_token: token } = await credential.getAccessToken()

const api = async (url, options = {}) => {
    const res = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers,
        },
    })

    const text = await res.text()
    let body
    try {
        body = JSON.parse(text)
    } catch {
        body = { raw: text.slice(0, 300) }
    }

    return { ok: res.ok, status: res.status, body }
}

let failed = 0

console.log(`\n=== Deploy ke project ${project} ===\n`)

// ---------- 1. Security rules ----------

const rulesSource = readFileSync("firestore.rules", "utf8")

const created = await api(
    `https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`,
    {
        method: "POST",
        body: JSON.stringify({
            source: { files: [{ name: "firestore.rules", content: rulesSource }] },
        }),
    }
)

if (!created.ok) {
    console.log(`${RED}GAGAL${RESET} membuat ruleset: HTTP ${created.status}`)
    console.log(`${DIM}      ${created.body.error?.message || JSON.stringify(created.body)}${RESET}`)

    // Error sintaks rules dilaporkan per baris — tampilkan supaya bisa diperbaiki
    for (const issue of created.body.error?.details?.[0]?.issues || []) {
        console.log(`${DIM}      baris ${issue.sourcePosition?.line}: ${issue.description}${RESET}`)
    }
    process.exit(1)
}

const rulesetName = created.body.name
console.log(`${GREEN}OK${RESET}    ruleset dibuat ${DIM}(${rulesetName.split("/").pop()})${RESET}`)

const released = await api(
    `https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`,
    {
        method: "PATCH",
        body: JSON.stringify({
            release: {
                name: `projects/${project}/releases/cloud.firestore`,
                rulesetName,
            },
        }),
    }
)

if (released.ok) {
    console.log(`${GREEN}OK${RESET}    rules aktif untuk cloud.firestore`)
} else {
    console.log(`${RED}GAGAL${RESET} mengaktifkan rules: HTTP ${released.status}`)
    console.log(`${DIM}      ${released.body.error?.message || ""}${RESET}`)
    failed++
}

// ---------- 2. Composite index ----------

console.log("")

const { indexes } = JSON.parse(readFileSync("firestore.indexes.json", "utf8"))

initializeApp({ credential })
const db = getFirestore()

/** Menjalankan query yang butuh index tersebut; Firestore membalas dengan
 *  tautan pembuatan index di pesan error-nya. Mengembalikan null kalau
 *  query ternyata jalan (index tidak diperlukan). */
const probeIndexUrl = async (index) => {
    const [equality, sort] = index.fields

    try {
        await db
            .collection(index.collectionGroup)
            .where(equality.fieldPath, "==", "probe")
            .orderBy(sort.fieldPath, sort.order === "DESCENDING" ? "desc" : "asc")
            .get()
        return null
    } catch (error) {
        return /https:\/\/\S+/.exec(error.message)?.[0] ?? null
    }
}

for (const index of indexes) {
    const label = `${index.collectionGroup} (${index.fields
        .map((f) => `${f.fieldPath} ${f.order === "DESCENDING" ? "desc" : "asc"}`)
        .join(", ")})`

    const res = await api(
        `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups/${index.collectionGroup}/indexes`,
        {
            method: "POST",
            body: JSON.stringify({
                queryScope: index.queryScope,
                fields: index.fields.map((f) => ({ fieldPath: f.fieldPath, order: f.order })),
            }),
        }
    )

    if (res.ok) {
        console.log(`${GREEN}OK${RESET}    index dibuat: ${label}`)
        console.log(`${DIM}      pembangunan index berjalan di latar belakang, biasanya < 1 menit${RESET}`)
    } else if (res.status === 409 || /already exists/i.test(res.body.error?.message || "")) {
        console.log(`${GREEN}OK${RESET}    index sudah ada: ${label}`)
    } else {
        console.log(`${YELLOW}LEWAT${RESET} index ${label}: HTTP ${res.status} ${DIM}${res.body.error?.message || ""}${RESET}`)

        // Service account Firebase Admin SDK biasanya tidak punya izin
        // datastore.indexes.create. Jalankan query-nya sekali supaya Firestore
        // sendiri yang memberi tautan pembuatan index sekali-klik.
        const url = await probeIndexUrl(index)

        if (url) {
            console.log(`${DIM}      buat lewat tautan ini:${RESET}`)
            console.log(`      ${url}`)
            failed++
        } else {
            console.log(`${GREEN}      ternyata tidak diperlukan — query jalan tanpa index ini${RESET}`)
        }
    }
}

console.log("")

if (failed) {
    console.log(`${YELLOW}Selesai dengan ${failed} kegagalan.${RESET}\n`)
    process.exit(1)
}

console.log(`${GREEN}Rules dan index ter-deploy.${RESET}\n`)
