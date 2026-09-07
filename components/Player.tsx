"use client"

import useGetSongById from "@/hooks/useGetSongById";
import useLoadSongUrl from "@/hooks/useLoadSongUrl";
import usePlayer from "@/hooks/usePlayer";
import PlayerContent from "./PlayerContent";
import { BeatLoader } from "react-spinners";

const Player = () => {
    const player = usePlayer()
    const { song, isLoading } = useGetSongById(player.activeId)

    const songUrl = useLoadSongUrl(song!)

    if (!player.activeId) {
        return null
    }

    // Sebelumnya bar player tidak muncul sama sekali selama dokumen lagu diambil,
    // jadi klik pada sebuah lagu terasa tidak berefek. Sekarang bar langsung
    // muncul dengan indikator, lalu diganti kontrol asli begitu datanya siap.
    if (isLoading || !song || !songUrl) {
        return (
            <div className="fixed bottom-0 bg-black py-2 w-full h-[80px] flex items-center justify-center">
                <BeatLoader color="#22c55e" size={10} />
            </div>
        )
    }

    return ( 
        <div
            className="fixed bottom-0 bg-black py-2 w-full h-[80px] "
        >
            <PlayerContent
                key={songUrl}
                song={song}
                songUrl={songUrl}
            />
        </div>
     );
}
 
export default Player;
