"use client"

import { useRouter } from "next/navigation";
import { twMerge } from "tailwind-merge"
import { RxCaretLeft, RxCaretRight} from "react-icons/rx"
import { HiHome } from "react-icons/hi";
import { BiSearch } from "react-icons/bi";
import Button from "./Button";
import useAuthModal from "@/hooks/useAuthModal";
import { auth } from "@/libs/firebase";
import { signOut } from "firebase/auth";
import { useUser } from "@/hooks/useUser";
import { toast } from "react-hot-toast"
import usePlayer from "@/hooks/usePlayer";
import useUploadModal from "@/hooks/useUploadModal";
import { AiOutlinePlus } from "react-icons/ai";

interface HeaderProps {
    children: React.ReactNode
    className?: string
}

const Header: React.FC<HeaderProps> = ({
    children,
    className
}) => {
    const authModal = useAuthModal()
    const router = useRouter()
    const { user, isLoading } = useUser()
    const player = usePlayer()
    const uploadModal = useUploadModal()

    const handleLogout = async () => {
        try {
            await signOut(auth)
            // Cookie server dihapus terpisah dari sesi client — signOut() hanya
            // membersihkan sisi browser, session cookie httpOnly tidak terjangkau dari sini.
            await fetch('/api/auth/session', { method: 'DELETE' })

            player.reset()
            router.refresh()
            toast.success('Logged out!')
        } catch (error) {
            toast.error((error as Error).message)
        }
    }

    const onClick = () => {
        if (!user) {
            return authModal.onOpen()
        }

        return uploadModal.onOpen()
    }

    return ( 
        <div className={twMerge(`h-fit bg-gradient-to-b from-emerald-800 p-6`, className)}>
            <div
                className="w-full mb-4 flex items-center justify-between"
            >
                <div className="hidden md:flex gap-x-2 items-center">
                    <button 
                        onClick={() => router.back()}
                        className=" rounded-full bg-black flex items-center justify-center hover:opacity-75 transition"
                    >
                        <RxCaretLeft className="text-white" size={35} />
                    </button>
                    <button 
                        onClick={() => router.forward()}
                        className=" rounded-full bg-black flex items-center justify-center hover:opacity-75 transition"
                    >
                        <RxCaretRight className="text-white" size={35} />
                    </button>
                </div>
                <div className="flex md:hidden gap-x-2 items-center">
                    <button 
                        onClick={() => router.push('/')}
                        className="rounded-full p-2 bg-white flex items-center justify-center hover:opacity-75 transition"
                    >
                        <HiHome className="text-black" size={20}/>
                    </button>
                    <button 
                        onClick={() => router.push('/search')}
                        className="rounded-full p-2 bg-white flex items-center justify-center hover:opacity-75 transition"
                    >
                        <BiSearch className="text-black" size={20}/>
                    </button>
                    <button
                        onClick={onClick}
                        className="rounded-full p-2 bg-white flex items-center justify-center hover:opacity-75 transition"
                    >
                        <AiOutlinePlus className="text-black" size={20}/>
                    </button>
                </div>
                <div className="flex justify-between items-center gap-x-4">
                    {isLoading ? (
                        // Placeholder seukuran tombolnya, supaya "Log in" tidak
                        // sempat berkedip lalu berganti "Logout" saat status
                        // auth baru diketahui.
                        <div className="h-[40px] w-[92px] rounded-full bg-neutral-800 animate-pulse" />
                    ) : user ? (
                        <div className="flex gap-x-4 items-center">
                            <Button
                                onClick={handleLogout}
                                className="bg-white px-6 py-2"
                            >
                                Logout
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* <div>
                                <Button 
                                    onClick={authModal.onOpen}
                                    className="bg-transparent text-neutral-300 font-medium"
                                >
                                    Sign up
                                </Button>
                            </div> */}
                            <div>
                                <Button 
                                    onClick={authModal.onOpen}
                                    className="bg-white px-6 py-2"
                                >
                                    Log in
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {children}
        </div>
     );
}
 
export default Header;