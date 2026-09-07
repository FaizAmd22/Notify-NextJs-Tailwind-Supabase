import { Song } from "@/types"

type TimestampLike = { toMillis: () => number }

const isTimestampLike = (value: unknown): value is TimestampLike =>
    typeof (value as TimestampLike)?.toMillis === "function"

/**
 * Timestamp Firestore adalah object kelas dan TIDAK serializable saat dilempar
 * dari Server Component ke Client Component — Next.js akan melempar error.
 * Semua data lagu wajib lewat sini dulu supaya createdAt jadi number biasa.
 *
 * Dipakai oleh Admin SDK (actions/) maupun client SDK (hooks/), karena
 * Timestamp di kedua SDK sama-sama punya toMillis().
 */
export const toMillis = (value: unknown): number => {
    if (isTimestampLike(value)) {
        return value.toMillis()
    }

    if (typeof value === "number") {
        return value
    }

    // serverTimestamp() belum ter-resolve pada snapshot lokal tepat setelah write
    return 0
}

export const toSong = (id: string, data: Record<string, any> | undefined): Song => ({
    id,
    userId: data?.userId ?? "",
    author: data?.author ?? "",
    title: data?.title ?? "",
    songUrl: data?.songUrl ?? "",
    imageUrl: data?.imageUrl ?? "",
    createdAt: toMillis(data?.createdAt),
})
