"use client"

import React, { useState, useRef, useEffect } from "react"
import { Usb, MessageCircle, Smartphone, Check, Loader2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UploadScreenProps {
  onUpload: (imageUrl: string) => void
  onBack: () => void
  language: "ENG" | "MAL"
}

export function UploadScreen({
  onUpload,
  onBack,
  language,
}: UploadScreenProps) {
  const [usbConnected, setUsbConnected] = useState(false)
  const [showMobileDialog, setShowMobileDialog] = useState(false)
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string>("")
  const [isGeneratingSession, setIsGeneratingSession] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const content = {
    ENG: {
      title: "Choose Upload Method",
      subtitle: "Select how you'd like to transfer your photo",
      mobile: {
        headline: "Mobile Transfer",
        subtext: "Scan to Upload from Phone",
        note: "No App Needed",
        preferred: "Recommended",
        dialogTitle: "Scan QR Code",
        dialogDesc: "Scan this with your phone camera to upload a photo instantly.",
        waiting: "Waiting for upload...",
      },
      whatsapp: {
        headline: "WhatsApp",
        subtext: "Send Photo to",
        number: "+91 95671 03770",
      },
      usb: {
        headline: "USB / Memory Card",
        subtext: "Insert Drive Below",
        connected: "Device Connected",
        select: "Select File",
      },
    },
    MAL: {
      title: "അപ്‌ലോഡ് രീതി തിരഞ്ഞെടുക്കുക",
      subtitle: "നിങ്ങളുടെ ഫോട്ടോ കൈമാറാൻ ഒരു വഴി തിരഞ്ഞെടുക്കുക",
      mobile: {
        headline: "മൊബൈൽ ട്രാൻസ്ഫർ",
        subtext: "ഫോണിൽ നിന്ന് അപ്‌ലോഡ് ചെയ്യാൻ സ്കാൻ ചെയ്യുക",
        note: "ആപ്പ് ആവശ്യമില്ല",
        preferred: "ശുപാർശ ചെയ്യുന്നു",
        dialogTitle: "QR കോഡ് സ്കാൻ ചെയ്യുക",
        dialogDesc: "ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യാൻ ഇത് സ്കാൻ ചെയ്യുക.",
        waiting: "അപ്‌ലോഡിനായി കാത്തിരിക്കുന്നു...",
      },
      whatsapp: {
        headline: "WhatsApp",
        subtext: "ഫോട്ടോ അയയ്ക്കുക",
        number: "+91 98765 43210",
      },
      usb: {
        headline: "USB / മെമ്മറി കാർഡ്",
        subtext: "ഡ്രൈവ് താഴെ ചേർക്കുക",
        connected: "ഉപകരണം ബന്ധിപ്പിച്ചു",
        select: "ഫയൽ തിരഞ്ഞെടുക്കുക",
      },
    },
  }

  const t = content[language]

  // Simulate USB detection
  useEffect(() => {
    const timer = setTimeout(() => {
      setUsbConnected(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleUploadSuccess = (url: string) => {
    setShowMobileDialog(false)
    toast({
      title: "Upload Successful",
      description: "Your photo has been transferred.",
    })
    // Small delay to allow dialog to close smoothly
    setTimeout(() => {
      onUpload(url)
    }, 300)
  }

  // Listen for realtime updates when waiting for upload
  useEffect(() => {
    if (!uploadSessionId || !showMobileDialog) return

    const channel = supabase
      .channel(`mobile-upload-${uploadSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mobile_uploads',
          filter: `id=eq.${uploadSessionId}`,
        },
        (payload) => {
          const newData = payload.new as { status: string, image_url: string }
          if (newData.status === 'completed' && newData.image_url) {
            handleUploadSuccess(newData.image_url)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [uploadSessionId, showMobileDialog])

  const handleMobileTransfer = async () => {
    setIsGeneratingSession(true)
    try {
      // 1. Create a session in DB
      const { data, error } = await supabase
        .from('mobile_uploads')
        .insert([{ status: 'pending' }])
        .select()
        .single()

      if (error) throw error

      if (data) {
        setUploadSessionId(data.id)
        // Ensure we use the correct origin
        const origin = window.location.origin
        const urlRaw = `${origin}/mobile-upload/${data.id}`
        setQrUrl(urlRaw)
        setShowMobileDialog(true)
      }

    } catch (err) {
      console.error("Failed to start session:", err)
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Could not start upload session. check network.",
      })
    } finally {
      setIsGeneratingSession(false)
    }
  }

  const handleCardClick = (type: "mobile" | "whatsapp" | "usb") => {
    if (type === "mobile") {
      handleMobileTransfer()
    } else if (type === "usb" && usbConnected) {
      fileInputRef.current?.click()
    } else if (type === "whatsapp") {
      // Keep existing demo logic for WhatsApp
      toast({
        title: "WhatsApp Transfer",
        description: "Simulating receiving photo...",
      })
      setTimeout(() => {
        onUpload("/api/placeholder/600/800")
      }, 2000)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        onUpload(imageUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-center pb-24 px-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-5xl font-bold tracking-tight text-[#0F172A]">
            {t.title}
          </h1>
          <p className="text-xl text-[#6B7280]">{t.subtitle}</p>
        </div>

        {/* Upload Method Cards */}
        <div className="flex w-full max-w-6xl items-stretch justify-center gap-8">
          {/* Card 1: Mobile Transfer (Primary - 20% larger) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleCardClick("mobile")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleCardClick("mobile")
              }
            }}
            className="group relative flex w-[420px] cursor-pointer flex-col items-center rounded-3xl bg-white p-10 transition-all hover:scale-[1.02] active:scale-[0.98] soft-shadow z-10 pointer-events-auto outline-none focus:ring-4 focus:ring-blue-500/20"
          >
            {/* Preferred Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
              <div className="rounded-full bg-[#2563EB] px-4 py-1.5 shadow-sm">
                <span className="text-sm font-semibold text-white">
                  {t.mobile.preferred}
                </span>
              </div>
            </div>

            {/* Icon Main */}
            <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-[#EFF6FF] group-hover:bg-blue-100 transition-colors">
              <Smartphone className="h-16 w-16 text-[#2563EB]" />
            </div>

            {/* Text */}
            <h3 className="mb-2 text-2xl font-bold text-[#0F172A]">
              {t.mobile.headline}
            </h3>
            <p className="mb-3 text-center text-lg text-[#6B7280]">
              {t.mobile.subtext}
            </p>
            <span className="rounded-full bg-[#F3F4F6] px-4 py-1.5 text-sm font-medium text-[#6B7280]">
              {t.mobile.note}
            </span>

            {/* Loading Overlay if generating */}
            {isGeneratingSession && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-3xl z-30">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
            )}

            {/* Hover Glow */}
            <div className="absolute inset-0 rounded-3xl border-2 border-transparent transition-colors group-hover:border-[#2563EB]/30 z-10" />
          </div>

          {/* Card 2: WhatsApp */}
          <div
            onClick={() => handleCardClick("whatsapp")}
            className="group flex w-[340px] cursor-pointer flex-col items-center rounded-3xl bg-white p-10 transition-all hover:scale-[1.02] active:scale-[0.98] soft-shadow"
          >
            {/* WhatsApp Logo */}
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#25D366]">
              <MessageCircle className="h-12 w-12 text-white" fill="white" />
            </div>

            {/* Text */}
            <h3 className="mb-2 text-2xl font-bold text-[#0F172A]">
              {t.whatsapp.headline}
            </h3>
            <p className="mb-3 text-center text-lg text-[#6B7280]">
              {t.whatsapp.subtext}
            </p>
            <span className="rounded-xl bg-[#F3F4F6] px-5 py-2.5 font-mono text-lg font-semibold text-[#0F172A]">
              {t.whatsapp.number}
            </span>

            {/* Hover Border */}
            <div className="absolute inset-0 rounded-3xl border-2 border-transparent transition-colors group-hover:border-[#25D366]/30" />
          </div>

          {/* Card 3: USB */}
          <div
            onClick={() => handleCardClick("usb")}
            className="group flex w-[340px] cursor-pointer flex-col items-center rounded-3xl bg-white p-10 transition-all hover:scale-[1.02] active:scale-[0.98] soft-shadow"
          >
            {/* USB Icon with Status */}
            <div className="relative mb-8">
              <div className={`flex h-24 w-24 items-center justify-center rounded-full ${usbConnected ? "bg-[#ECFDF5]" : "bg-[#F3F4F6]"
                } transition-colors`}>
                <Usb className={`h-12 w-12 ${usbConnected ? "text-[#059669]" : "text-[#6B7280]"
                  } transition-colors`} />
              </div>
              {/* Connection indicator */}
              {usbConnected && (
                <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#059669]">
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}
            </div>

            {/* Text */}
            <h3 className="mb-2 text-2xl font-bold text-[#0F172A]">
              {t.usb.headline}
            </h3>
            <p className="mb-3 text-center text-lg text-[#6B7280]">
              {usbConnected ? t.usb.connected : t.usb.subtext}
            </p>

            {usbConnected && (
              <button className="rounded-xl bg-[#0F172A] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1e293b]">
                {t.usb.select}
              </button>
            )}

            {/* Pulse animation when not connected */}
            {!usbConnected && (
              <div className="h-2 w-24 animate-pulse rounded-full bg-[#E5E7EB]" />
            )}

            {/* Hover Border */}
            <div className="absolute inset-0 rounded-3xl border-2 border-transparent transition-colors group-hover:border-[#0F172A]/20" />
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Select image file"
        />
      </div>

      {/* Scan Dialog */}
      <Dialog open={showMobileDialog} onOpenChange={setShowMobileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.mobile.dialogTitle}</DialogTitle>
            <DialogDescription>
              {t.mobile.dialogDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-6">
            <div className="p-4 bg-white border-4 border-gray-100 rounded-xl shadow-inner">
              {qrUrl && <QRCodeSVG value={qrUrl} size={256} />}
            </div>

            <div className="flex items-center gap-2 text-blue-600 font-medium">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t.mobile.waiting}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

