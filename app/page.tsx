import type { Viewport } from 'next'
import KioskMain from '@/components/kiosk/kiosk-main'

export const viewport: Viewport = {
  width: 1920,
  height: 1080,
  initialScale: 1,
  userScalable: false,
}

export default function Page() {
  return <KioskMain />
}
