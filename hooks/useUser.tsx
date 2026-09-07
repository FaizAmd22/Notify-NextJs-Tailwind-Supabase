import { db } from "@/libs/firebase"
import { FirebaseAuthContext } from "@/providers/FirebaseAuthProvider"
import { UserDetails } from "@/types"
import { User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { createContext, useContext, useEffect, useState } from "react"

type UserContextType = {
    user: User | null
    userDetails: UserDetails | null
    isLoading: boolean
}

export const UserContext = createContext<UserContextType | undefined>(
    undefined
)

export interface Props {
    [propsName: string]: any
}

export const MyUserContextProvider = (props: Props) => {
    const { user, isLoading: isLoadingUser } = useContext(FirebaseAuthContext)
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [userDetails, setUserDetails] = useState<UserDetails | null>(null)

    useEffect(() => {
        if (!user) {
            setUserDetails(null)
            return
        }

        let cancelled = false
        setIsLoadingData(true)

        getDoc(doc(db, "users", user.uid))
            .then((snapshot) => {
                if (cancelled) {
                    return
                }

                const data = snapshot.data()

                setUserDetails({
                    id: user.uid,
                    fullName: data?.fullName ?? user.displayName ?? undefined,
                    avatarUrl: data?.avatarUrl ?? user.photoURL ?? undefined,
                    email: data?.email ?? user.email ?? undefined,
                })
            })
            .catch((error) => console.log("[useUser] getUserDetails", error))
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingData(false)
                }
            })

        return () => {
            cancelled = true
        }
    }, [user])

    const value = {
        user,
        userDetails,
        isLoading: isLoadingUser || isLoadingData,
    }

    return <UserContext.Provider value={value} {...props} />
}

export const useUser = () => {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useUser must be used within a MyUserContextProvider')
    }
    return context
}
