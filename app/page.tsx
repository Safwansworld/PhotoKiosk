"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { AttractScreen } from "@/components/kiosk/attract-screen"
import { CaptureScreen } from "@/components/kiosk/capture-screen"
import { UploadScreen } from "@/components/kiosk/upload-screen"
import { EditScreen } from "@/components/kiosk/edit-screen"
import { PaymentScreen } from "@/components/kiosk/payment-screen"
import { StatusBar } from "@/components/kiosk/status-bar"

import type { Viewport } from 'next'

export const viewport: Viewport = {
  width: 1920,
  height: 1080,
  initialScale: 1,
  userScalable: false,
}

export type KioskScreen = "attract" | "capture" | "upload" | "edit" | "payment"

export interface PhotoData {
  imageUrl: string | null
  source: "camera" | "upload" | null
}

export default function PhotoPointKiosk() {
  const { toast } = useToast()
  const [currentScreen, setCurrentScreen] = useState<KioskScreen>("attract")
  const [language, setLanguage] = useState<"ENG" | "MAL">("ENG")
  const [photoData, setPhotoData] = useState<PhotoData>({
    imageUrl: null,
    source: null,
  })
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleCapture = (imageUrl: string) => {
    setPhotoData({ imageUrl, source: "camera" })
    setCurrentScreen("edit")
  }

  const handleUpload = (imageUrl: string) => {
    setPhotoData({ imageUrl, source: "upload" })
    setCurrentScreen("edit")
  }

  const handleProceedToPayment = async (processedImageUrl?: string) => {
    // Use the processed image if provided, otherwise fallback to the original
    const imageToUpload = processedImageUrl || photoData.imageUrl

    if (!imageToUpload) return

    setIsUploading(true)
    try {
      // 1. Convert Base64/DataURL to Blob
      // Handle both cases: photoData.imageUrl might be a blob URL or base64?
      // Actually capture-screen returns data URL. Upload returns likely base64 or blob URL?
      // Let's assume data URL for now as per capture-screen.
      const base64Data = imageToUpload.split(',')[1]
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/png' }) // Use PNG for transparency support

      // 2. Upload to Supabase Storage
      const fileName = `session_${Date.now()}.png`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: 'image/png',
        })

      if (uploadError) throw uploadError

      // 3. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName)

      const publicUrl = publicUrlData.publicUrl

      // 4. Create DB Record
      const { data: sessionData, error: dbError } = await supabase
        .from('kiosk_sessions')
        .insert({
          image_url: publicUrl,
          payment_status: 'pending',
          print_status: 'pending',
          amount: 100
        })
        .select()
        .single()

      if (dbError) throw dbError

      if (sessionData) {
        setSessionId(sessionData.id)
      }

      setCurrentScreen("payment")
    } catch (error) {
      console.error("Error uploading/creating session:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handlePaymentComplete = async () => {
    // Update DB status to completed
    if (sessionId) {
      await supabase
        .from('kiosk_sessions')
        .update({
          payment_status: 'completed',
          print_status: 'printing'
        })
        .eq('id', sessionId)
    }

    // Reset after printing
    setTimeout(async () => {
      // Mark as print completed
      if (sessionId) {
        await supabase
          .from('kiosk_sessions')
          .update({ print_status: 'completed' })
          .eq('id', sessionId)
      }

      setPhotoData({ imageUrl: null, source: null })
      setSessionId(null)
      setCurrentScreen("attract")
    }, 5000)
  }

  const handleBack = () => {
    if (currentScreen === "capture" || currentScreen === "upload") {
      setCurrentScreen("attract")
    } else if (currentScreen === "edit") {
      setCurrentScreen(photoData.source === "camera" ? "capture" : "upload")
    } else if (currentScreen === "payment") {
      setCurrentScreen("edit")
    }
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#F9FAFB]">
      {/* Screen Content */}
      <div className="h-full w-full">
        {currentScreen === "attract" && (
          <AttractScreen
            onStartCamera={() => setCurrentScreen("capture")}
            onUploadFile={() => setCurrentScreen("upload")}
            language={language}
          />
        )}
        {currentScreen === "capture" && (
          <CaptureScreen
            onCapture={handleCapture}
            onBack={handleBack}
            language={language}
          />
        )}
        {currentScreen === "upload" && (
          <UploadScreen
            onUpload={handleUpload}
            onBack={handleBack}
            language={language}
          />
        )}
        {currentScreen === "edit" && (
          <EditScreen
            photoData={photoData}
            onProceedToPayment={handleProceedToPayment}
            onBack={handleBack}
            language={language}
            isUploading={isUploading}
          />
        )}
        {currentScreen === "payment" && (
          <PaymentScreen
            photoData={photoData}
            onComplete={handlePaymentComplete}
            onBack={handleBack}
            language={language}
          />
        )}
      </div>

      {/* Global Status Bar */}
      <StatusBar
        language={language}
        onLanguageChange={setLanguage}
        showBack={currentScreen !== "attract"}
        onBack={handleBack}
      />
    </main>
  )
}
