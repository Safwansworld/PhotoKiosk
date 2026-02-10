import React from "react"
import type { Metadata, Viewport } from 'next'

import { Analytics } from '@vercel/analytics/next'
import './globals.css'



export const metadata: Metadata = {
  title: 'PhotoPoint | Self-Service Photo Kiosk',
  description: 'Government-grade photo capture and printing. Studio lighting, auto-retouching, and instant prints.',
  generator: 'v0.app'
}



import { Toaster } from "@/components/ui/toaster"

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`antialiased font-sans`}>
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
