"use client"

import useAuthModal from "@/hooks/useAuthModal";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AuthForm from "./AuthForm";
import Modal from "./Modal";

const AuthModal = () => {
    const router = useRouter()
    const { user } = useUser()
    const { onClose, isOpen } = useAuthModal()

    useEffect(() => {
        if (user) {
            router.refresh()
            onClose()
        }
    }, [user, router, onClose])

    const onChange = (open: boolean) => {
        if (!open) {
            onClose()
        }
    }

    return (
        <Modal
            title="Welcome!"
            description="Login to your account"
            isOpen={isOpen}
            onChange={onChange}
        >
            <AuthForm />
        </Modal>
     );
}

export default AuthModal;
