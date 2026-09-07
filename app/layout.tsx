import getSongsByUserId from '@/actions/getSongsByUserId'
import Player from '@/components/Player'
import Sidebar from '@/components/Sidebar'
import ModalProvider from '@/providers/ModalProvider'
import FirebaseAuthProvider from '@/providers/FirebaseAuthProvider'
import ToasterProvider from '@/providers/ToasterProvider'
import UserProvider from '@/providers/UserProvider'
import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import './globals.css'

const font = Figtree({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Notify',
  description: 'Music app by cloning spotify',
  icons: {
    icon: [
      'favicon.ico?v=4',
    ],
    apple: [
      '/apple-touch-icon.png?v=4',
    ],
    shortcut: [
      'apple-touch-icon.png'
    ]
  },
  manifest: 'site.webmanifest'
}

export const revalidate = 0

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userSongs = await getSongsByUserId()

  return (
    <html lang="en">
      <body className={font.className}>
        <ToasterProvider />
        <FirebaseAuthProvider>
          <UserProvider>
            <ModalProvider />
            <Sidebar songs={userSongs}>
              {children}
            </Sidebar>
            <Player />
          </UserProvider>
        </FirebaseAuthProvider>
      </body>
    </html>
  )
}
