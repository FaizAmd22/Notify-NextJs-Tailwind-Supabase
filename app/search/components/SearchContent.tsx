"use client"

import loadMoreSongs from "@/hooks/useLoadMoreSongs";
import LikeButton from "@/components/LikeButton";
import MediaItem from "@/components/MediaItem";
import useInfiniteScroll from "@/hooks/useInfiniteScroll";
import useOnPlay from "@/hooks/UseOnPlay";
import { Song, SongCursor } from "@/types";
import { BeatLoader } from "react-spinners";

interface SearchContentProps {
    songs: Song[]
    nextCursor: SongCursor
    title: string
}

const SearchContent: React.FC<SearchContentProps> = ({
    songs,
    nextCursor,
    title
}) => {
    const { items, sentinelRef, isLoading, hasMore } = useInfiniteScroll({
        initialItems: songs,
        initialCursor: nextCursor,
        loadMore: (cursor) => loadMoreSongs(cursor, title),
    })

    const onPlay = useOnPlay(items)

    if (items.length === 0) {
        return (
            <div
                className="flex flex-col gap-y-2 w-full px-6 text-neutral-400"
            >
                No songs found.
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-y-2 w-full px-6">
            {items.map((song) => (
                <div
                    key={song.id}
                    className="flex items-center gap-x-4 w-full"
                >
                    <div className="flex-1">
                        <MediaItem
                            onClick={(id: string) => onPlay(id)}
                            data={song}
                        />
                    </div>
                    {/* add button like */}
                    <LikeButton songId={song.id} />
                </div>
            ))}

            {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-6">
                    {isLoading && <BeatLoader color="#22c55e" size={10} />}
                </div>
            )}
        </div>
     );
}

export default SearchContent;
