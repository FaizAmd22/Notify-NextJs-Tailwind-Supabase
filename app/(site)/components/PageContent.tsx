"use client"

import loadMoreSongs from "@/hooks/useLoadMoreSongs";
import SongItem from "@/components/SongItem";
import useInfiniteScroll from "@/hooks/useInfiniteScroll";
import useOnPlay from "@/hooks/UseOnPlay";
import { Song, SongCursor } from "@/types";
import { BeatLoader } from "react-spinners";

interface PageContentProps {
    songs: Song[]
    nextCursor: SongCursor
}

const PageContent: React.FC<PageContentProps> = ({
    songs,
    nextCursor
}) => {
    const { items, sentinelRef, isLoading, hasMore } = useInfiniteScroll({
        initialItems: songs,
        initialCursor: nextCursor,
        loadMore: (cursor) => loadMoreSongs(cursor),
    })

    // Antrean pemutar mengikuti apa yang sudah dimuat, sehingga tombol
    // next/prev di player tetap konsisten dengan daftar yang terlihat
    const onPLay = useOnPlay(items)

    if (items.length === 0) {
        return (
            <div className="mt-4 text-neutral-400">
                No Songs available.
            </div>
        )
    }

    return (
        <>
            <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-4 mt-4"
            >
                {items.map((item) => (
                    <SongItem
                        onClick={(id: string) => onPLay(id)}
                        key={item.id}
                        data={item}
                    />
                ))}
            </div>

            {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-6">
                    {isLoading && <BeatLoader color="#22c55e" size={10} />}
                </div>
            )}
        </>
     );
}

export default PageContent;
