import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://watchparty.app'
const TITLE   = 'Watch Party — Watch YouTube & Videos Together in Sync'
const DESC    = 'Watch YouTube videos and local files with friends in perfect sync. No signup, no uploads. Create a room in seconds and share the link.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default:  TITLE,
    template: '%s | Watch Party',
  },
  description: DESC,
  keywords: [
    'watch party', 'watch together online', 'youtube watch party',
    'sync video with friends', 'watch videos together', 'webrtc video sync',
    'teleparty alternative', 'watch2gether alternative', 'local video stream',
  ],
  authors: [{ name: 'Watch Party' }],
  creator: 'Watch Party',
  openGraph: {
    type:        'website',
    url:         APP_URL,
    title:       TITLE,
    description: DESC,
    siteName:    'Watch Party',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Watch Party — Watch together in sync' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       TITLE,
    description: DESC,
    images:      ['/og.png'],
  },
  robots: {
    index:               true,
    follow:              true,
    googleBot: {
      index:             true,
      follow:            true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },
  alternates: { canonical: APP_URL },
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  themeColor:            '#09090b',
  width:                 'device-width',
  initialScale:          1,
  maximumScale:          1,
  userScalable:          false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-white">
        {children}
      </body>
    </html>
  )
}
