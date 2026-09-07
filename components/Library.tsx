"use client"
import { TbPlaylist } from "react-icons/tb"
import { AiOutlinePlus } from "react-icons/ai"
import useAuthModal from "@/hooks/useAuthModal"
import { useUser } from "@/hooks/useUser"
import useUploadModal from "@/hooks/useUploadModal"
import { Song } from "@/types"
import MediaItem from "./MediaItem"
import useOnPlay from "@/hooks/UseOnPlay"
import useInfiniteScroll, { createLocalPager } from "@/hooks/useInfiniteScroll"
import { useMemo } from "react"
import { BeatLoader } from "react-spinners"

const PAGE_SIZE = 20

interface LabraryProps {
    songs: Song[]
}

const Library: React.FC<LabraryProps> = ({
    songs
}) => {
    const authModal = useAuthModal()
    const uploadModal = useUploadModal()
    const { user } = useUser()

    // Lihat catatan di LikedContent: slice dan pager harus di-memo supaya
    // pagination tidak ter-reset setiap render
    const firstPage = useMemo(() => songs.slice(0, PAGE_SIZE), [songs])
    const pager = useMemo(() => createLocalPager(songs, PAGE_SIZE), [songs])

    const { items, sentinelRef, isLoading, hasMore } = useInfiniteScroll({
        initialItems: firstPage,
        initialCursor: songs.length > PAGE_SIZE ? PAGE_SIZE : null,
        loadMore: pager,
    })

    const onPlay = useOnPlay(songs)

    const onClick = () => {
        if (!user) {
            return authModal.onOpen()
        }

        return uploadModal.onOpen()
    }

    return (
        <div className="flex flex-col">
            <div className="flex items-center justify-between px-5 pt-4"
            >
                <div className=" inline-flex items-center gap-x-2"
                >
                    <TbPlaylist className="text-neutral-400" size={26}/>
                    <p className=" text-neutral-400 font-medium text-base">Your Library</p>
                </div>
                <AiOutlinePlus
                    onClick={onClick}
                    size={20}
                    className="
                        text-neutral-400
                        cursor-pointer
                        hover:text-white
                        transition
                    "
                />
            </div>
            <div className="flex flex-col gap-y-2 mt-4 px-3">
                {items.map((item) => (
                    <MediaItem
                        onClick={(id: string) => onPlay(id)}
                        key={item.id}
                        data={item}
                    />
                ))}

                {hasMore && (
                    <div ref={sentinelRef} className="flex justify-center py-4">
                        {isLoading && <BeatLoader color="#22c55e" size={8} />}
                    </div>
                )}
            </div>
        </div>
     );
}

export default Library;
