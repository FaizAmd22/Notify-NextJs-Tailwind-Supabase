import { Song } from "@/types";

const useLoadSongUrl = (song: Song) => {
    return song?.songUrl || ''
}

export default useLoadSongUrl
