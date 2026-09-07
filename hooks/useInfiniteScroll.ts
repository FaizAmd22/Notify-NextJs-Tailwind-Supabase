import { useCallback, useEffect, useRef, useState } from "react"

interface Page<TItem, TCursor> {
    items: TItem[]
    nextCursor: TCursor | null
}

interface Options<TItem, TCursor> {
    /** Halaman pertama, sudah di-render server */
    initialItems: TItem[]
    initialCursor: TCursor | null
    loadMore: (cursor: TCursor | null) => Promise<Page<TItem, TCursor>>
}

/**
 * Menyambung daftar berikutnya begitu elemen sentinel mendekati layar.
 *
 * rootMargin 300px membuat pemuatan dimulai sebelum sentinel benar-benar
 * terlihat, sehingga sambungan halaman terasa mulus alih-alih tersendat di
 * ujung daftar.
 *
 * Observer sengaja memakai root default (viewport), bukan container: daftar di
 * aplikasi ini menggulir di dalam div ber-overflow, dan posisi sentinel relatif
 * viewport tetap berubah saat container itu digulir.
 */
const useInfiniteScroll = <TItem, TCursor>({
    initialItems,
    initialCursor,
    loadMore,
}: Options<TItem, TCursor>) => {
    const [items, setItems] = useState(initialItems)
    const [cursor, setCursor] = useState<TCursor | null>(initialCursor)
    const [isLoading, setIsLoading] = useState(false)

    const sentinelRef = useRef<HTMLDivElement | null>(null)

    // Disimpan di ref supaya identitas fungsi yang berubah tiap render tidak
    // memicu observer dibongkar-pasang terus-menerus
    const loadMoreRef = useRef(loadMore)
    loadMoreRef.current = loadMore

    // Server mengirim data awal baru saat navigasi atau router.refresh()
    // (misal setelah upload lagu) — pagination harus mulai dari nol lagi.
    useEffect(() => {
        setItems(initialItems)
        setCursor(initialCursor)
    }, [initialItems, initialCursor])

    const handleLoadMore = useCallback(async () => {
        if (!cursor || isLoading) {
            return
        }

        setIsLoading(true)

        try {
            const page = await loadMoreRef.current(cursor)

            setItems((current) => [...current, ...page.items])
            setCursor(page.nextCursor)
        } catch (error) {
            console.error('[useInfiniteScroll]', error)
            // Cursor dinolkan supaya tidak terjebak mencoba halaman yang sama
            // berulang kali setiap sentinel terlihat
            setCursor(null)
        } finally {
            setIsLoading(false)
        }
    }, [cursor, isLoading])

    useEffect(() => {
        const sentinel = sentinelRef.current

        if (!sentinel || !cursor) {
            return
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    void handleLoadMore()
                }
            },
            { rootMargin: "300px" }
        )

        observer.observe(sentinel)

        return () => observer.disconnect()
    }, [cursor, handleLoadMore])

    return {
        items,
        sentinelRef,
        isLoading,
        hasMore: cursor !== null,
    }
}

/**
 * loadMore untuk daftar yang datanya sudah ada seluruhnya di client.
 *
 * Dipakai halaman Liked dan sidebar Library: keduanya berisi data milik satu
 * user saja sehingga jumlahnya terbatas, dan mem-paginasi-nya di server justru
 * menuntut composite index (where + orderBy) yang tidak sebanding manfaatnya.
 * Di sini infinite scroll murni soal tidak me-render ribuan node sekaligus.
 */
export const createLocalPager =
    <TItem,>(all: TItem[], pageSize: number) =>
    async (cursor: number | null) => {
        const start = cursor ?? 0
        const next = start + pageSize

        return {
            items: all.slice(start, next),
            nextCursor: next < all.length ? next : null,
        }
    }

export default useInfiniteScroll
