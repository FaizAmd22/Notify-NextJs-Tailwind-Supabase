"use client"

import { Song } from "@/types";
import LikeButton from "./LikeButton";
import MediaItem from "./MediaItem";
import { BsPauseFill, BsPlayFill } from "react-icons/bs"
import { AiFillStepBackward, AiFillStepForward } from "react-icons/ai";
import { HiSpeakerXMark, HiSpeakerWave } from "react-icons/hi2"
import Slider from "./Slider";
import usePlayer from "@/hooks/usePlayer";
import { useEffect, useState } from "react"
import useSound from "use-sound";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";

interface PlayerContentProps {
    song: Song
    songUrl: string
}

const PlayerContent: React.FC<PlayerContentProps> = ({
    song,
    songUrl
}) => {
    const player = usePlayer()
    const [volume, setVolume] = useState(1)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const Icon = isPlaying ? BsPauseFill : BsPlayFill
    const VolumeIcon = volume === 0 ? HiSpeakerXMark : HiSpeakerWave

    const onPlayNext = () => {
        if (player.ids.length === 0) {
            return
        }

        const currentIndex = player.ids.findIndex((id) => id === player.activeId)
        const nextSong = player.ids[currentIndex + 1]

        if (!nextSong) {
            return player.setId(player.ids[0])
        }

        player.setId(nextSong)
    }

    const onPlayPrev = () => {
        if (player.ids.length === 0) {
            return
        }

        const currentIndex = player.ids.findIndex((id) => id === player.activeId)
        const prevSong = player.ids[currentIndex - 1]

        if (!prevSong) {
            return player.setId(player.ids[player.ids.length - 1])
        }

        player.setId(prevSong)
    }

    const [play, { pause, sound }] = useSound(
        songUrl,
        {
            volume: volume,
            // Kunci performa playback. Default Howler adalah html5:false, yang
            // memakai Web Audio API: seluruh mp3 diunduh DAN di-decode dulu
            // sebelum bunyi pertama keluar — untuk file 320kbps itu lama sekali.
            // html5:true memakai elemen <audio> yang men-stream, jadi lagu mulai
            // berbunyi begitu buffer awal siap.
            html5: true,
            format: ['mp3'],
            onload: () => setIsReady(true),
            onplay: () => setIsPlaying(true),
            onend: () => {
                setIsPlaying(false)
                onPlayNext()
            },
            onpause: () => setIsPlaying(false),
            onloaderror: () => {
                setIsReady(true)
                toast.error('Failed to load audio')
            },
        }
    )

    useEffect(() => {
        sound?.play()

        return () => {
            sound?.unload()
        }
    }, [sound])

    const handlePlay = () => {
        if (!isPlaying) {
            play()
        } else {
            pause()
        }
    }

    const toggleMute = () => {
        if (volume === 0) {
            setVolume(1)
        } else {
            setVolume(0)
        }
    }

    // Tombol play berubah jadi spinner selama audio belum siap, supaya klik yang
    // belum berbunyi tidak terasa seperti aplikasi menggantung.
    const PlayControl = ({ size }: { size: number }) => (
        <div
            onClick={isReady ? handlePlay : undefined}
            className={`flex items-center justify-center h-10 w-10 rounded-full bg-white p-1 ${isReady ? "cursor-pointer" : "cursor-wait"}`}
        >
            {isReady
                ? <Icon size={size} className="text-black" />
                : <BeatLoader color="#000000" size={6} />
            }
        </div>
    )

    return ( 
        <div className="grid grid-cols-2 md:grid-cols-3 h-full px-2">
            <div className="flex w-full justify-start">
                <div className="flex items-center gap-x-4">
                    <MediaItem data={song} onClick={() => {}}/>
                    <LikeButton songId={song.id}/>
                </div>
            </div>

            <div className="flex md:hidden col-auto w-full justify-end items-center">
                <PlayControl size={30} />
            </div>

            <div className="hidden h-full md:flex justify-center items-center w-full max-w-[722px] gap-x-6">
                <AiFillStepBackward 
                    onClick={onPlayPrev}
                    size={30} 
                    className="text-neutral-400 cursor-pointer hover:text-white transition"
                />
                <PlayControl size={30} />
                <AiFillStepForward
                    onClick={onPlayNext}
                    size={30}
                    className="text-neutral-400 cursor-pointer hover:text-white transition"
                />
            </div>

            <div className="hidden md:flex w-full justify-end pr-2">
                <div className="flex items-center gap-x-2 w-[120px]">
                    <VolumeIcon 
                        onClick={toggleMute}
                        className="cursor-pointer"
                        size={18}
                    />
                    <Slider 
                        value={volume}
                        onChange={(value) => setVolume(value)}
                    />
                </div>
            </div>
        </div>
     );
}
 
export default PlayerContent;
