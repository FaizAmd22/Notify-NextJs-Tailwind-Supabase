"use client"

import LikeButton from "@/components/LikeButton";
import MediaItem from "@/components/MediaItem";
import useInfiniteScroll, { createLocalPager } from "@/hooks/useInfiniteScroll";
import useOnPlay from "@/hooks/UseOnPlay";
import { useUser } from "@/hooks/useUser";
import { Song } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react"
import { BeatLoader } from "react-spinners";

const PAGE_SIZE = 20

interface LikedContentProps {
    songs: Song[]
}

const LikedContent: React.FC<LikedContentProps> = ({
    songs
}) => {
    const router = useRouter()
    const { isLoading: isLoadingUser, user } = useUser()

    // Di-memo agar identitasnya hanya berubah saat data dari server berubah.
    // Tanpa ini, slice baru di setiap render akan terus-menerus me-reset
    // pagination di dalam hook.
    const firstPage = useMemo(() => songs.slice(0, PAGE_SIZE), [songs])
    const pager = useMemo(() => createLocalPager(songs, PAGE_SIZE), [songs])

    const { items, sentinelRef, isLoading, hasMore } = useInfiniteScroll({
        initialItems: firstPage,
        initialCursor: songs.length > PAGE_SIZE ? PAGE_SIZE : null,
        loadMore: pager,
    })

    // Antrean pemutar memakai seluruh lagu yang disukai, bukan hanya yang
    // sudah ter-render, supaya next/prev tetap menelusuri playlist penuh
    const onPlay = useOnPlay(songs)

    useEffect(() => {
      if (!isLoadingUser && !user) {
        router.replace('/')
      }
    }, [isLoadingUser, user, router])

    if (songs.length === 0) {
        return (
            <div
                className="flex flex-col gap-y-2 w-full px-6 text-neutral-400"
            >
                No liked songs.
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-y-2 w-full p-6">
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
                    <LikeButton songId={song.id}/>
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

export default LikedContent;
