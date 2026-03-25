"use client"

import { useState, useEffect } from "react"
import { Check, Printer, Shield, Clock, Share2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import type { PhotoData } from "@/components/kiosk/kiosk-main"

interface PaymentScreenProps {
  photoData: PhotoData
  onComplete: () => void
  onBack: () => void
  language: "ENG" | "MAL"
  sessionId: string | null
}

type PaymentStatus = "pending" | "processing" | "confirmed" | "printing" | "complete"

export function PaymentScreen({
  photoData,
  onComplete,
  onBack,
  language,
  sessionId,
}: PaymentScreenProps) {
  const [status, setStatus] = useState<PaymentStatus>("pending")
  const [printProgress, setPrintProgress] = useState(0)

  const content = {
    ENG: {
      title: "Complete Payment",
      subtitle: "Scan QR code with any UPI app",
      amount: "₹100",
      status: {
        pending: "Waiting for payment...",
        processing: "Processing payment...",
        confirmed: "Payment confirmed!",
        printing: "Printing your photo...",
        complete: "Print complete!",
      },
      secure: "Secured by UPI",
      timeout: "Auto-cancel in 5:00",
      collectPhoto: "Please collect your photo from the tray below",
      printAnother: "Print Another",
    },
    MAL: {
      title: "പേയ്‌മെന്റ് പൂർത്തിയാക്കുക",
      subtitle: "ഏതെങ്കിലും UPI ആപ്പ് ഉപയോഗിച്ച് QR കോഡ് സ്കാൻ ചെയ്യുക",
      amount: "₹100",
      status: {
        pending: "പേയ്‌മെന്റിനായി കാത്തിരിക്കുന്നു...",
        processing: "പേയ്‌മെന്റ് പ്രോസസ്സ് ചെയ്യുന്നു...",
        confirmed: "പേയ്‌മെന്റ് സ്ഥിരീകരിച്ചു!",
        printing: "നിങ്ങളുടെ ഫോട്ടോ പ്രിന്റ് ചെയ്യുന്നു...",
        complete: "പ്രിന്റ് പൂർത്തിയായി!",
      },
      secure: "UPI സുരക്ഷിതം",
      timeout: "5:00-ൽ ഓട്ടോ-ക്യാൻസൽ",
      collectPhoto: "ചുവടെയുള്ള ട്രേയിൽ നിന്ന് നിങ്ങളുടെ ഫോട്ടോ എടുക്കുക",
      printAnother: "മറ്റൊന്ന് പ്രിന്റ് ചെയ്യുക",
    },
  }

  const t = content[language]

  // Simulate payment flow
  useEffect(() => {
    if (status === "pending") {
      const timer = setTimeout(() => {
        setStatus("processing")
      }, 3000)
      return () => clearTimeout(timer)
    }

    if (status === "processing") {
      const timer = setTimeout(() => {
        setStatus("confirmed")
      }, 2000)
      return () => clearTimeout(timer)
    }

    if (status === "confirmed") {
      const timer = setTimeout(() => {
        setStatus("printing")
      }, 1500)
      return () => clearTimeout(timer)
    }

    if (status === "printing") {
      const interval = setInterval(() => {
        setPrintProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setStatus("complete")
            return 100
          }
          return prev + 2
        })
      }, 50)
      return () => clearInterval(interval)
    }

    if (status === "complete") {
      const timer = setTimeout(() => {
        onComplete()
      }, 30000)
      return () => clearTimeout(timer)
    }
  }, [status, onComplete])

  return (
    <div className="flex h-full w-full items-center justify-center pb-24">
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="rounded-3xl bg-white p-12 soft-shadow">
          {status === "pending" || status === "processing" ? (
            <>
              {/* Header */}
              <div className="mb-10 text-center">
                <h1 className="mb-2 text-4xl font-bold tracking-tight text-[#0F172A]">
                  {t.title}
                </h1>
                <p className="text-xl text-[#6B7280]">{t.subtitle}</p>
              </div>

              {/* QR Code Section */}
              <div className="mb-10 flex flex-col items-center">
                <div className={`relative rounded-3xl border-4 p-6 transition-all ${status === "processing"
                  ? "border-[#2563EB] bg-[#EFF6FF]"
                  : "border-[#E5E7EB] bg-white"
                  }`}>
                  <QRCodeSVG
                    value="upi://pay?pa=photopoint@upi&pn=PhotoPoint&am=100&cu=INR"
                    size={240}
                    level="H"
                    bgColor="transparent"
                    fgColor="#0F172A"
                  />

                  {/* Processing Overlay */}
                  {status === "processing" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/80 backdrop-blur-sm">
                      <div className="flex flex-col items-center">
                        <div className="mb-3 h-12 w-12 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
                        <span className="font-semibold text-[#0F172A]">
                          {t.status.processing}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div className="mt-6 rounded-2xl bg-[#F3F4F6] px-8 py-4">
                  <span className="text-4xl font-bold text-[#0F172A]">{t.amount}</span>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="flex items-center justify-center gap-8">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#059669]" />
                  <span className="text-sm font-medium text-[#6B7280]">{t.secure}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#6B7280]" />
                  <span className="text-sm font-medium text-[#6B7280]">{t.timeout}</span>
                </div>
              </div>

              {/* Waiting Animation */}
              {status === "pending" && (
                <div className="mt-8 flex justify-center">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-[#2563EB]" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 animate-pulse rounded-full bg-[#2563EB]" style={{ animationDelay: "200ms" }} />
                    <div className="h-2 w-2 animate-pulse rounded-full bg-[#2563EB]" style={{ animationDelay: "400ms" }} />
                    <span className="ml-2 text-sm text-[#6B7280]">{t.status.pending}</span>
                  </div>
                </div>
              )}
            </>
          ) : status === "confirmed" ? (
            /* Payment Confirmed State */
            <div className="flex flex-col items-center py-8">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#ECFDF5]">
                <Check className="h-12 w-12 text-[#059669]" />
              </div>
              <h2 className="mb-2 text-3xl font-bold text-[#059669]">
                {t.status.confirmed}
              </h2>
              <p className="text-lg text-[#6B7280]">Starting print...</p>
            </div>
          ) : (
            /* Printing / Complete State */
            <div className="flex flex-col items-center py-8">
              {/* Printer Icon */}
              <div className={`mb-8 flex h-24 w-24 items-center justify-center rounded-full ${status === "complete" ? "bg-[#ECFDF5]" : "bg-[#EFF6FF]"
                }`}>
                {status === "complete" ? (
                  <Check className="h-12 w-12 text-[#059669]" />
                ) : (
                  <Printer className="h-12 w-12 text-[#2563EB]" />
                )}
              </div>

              {/* Status Text */}
              <h2 className={`mb-6 text-3xl font-bold ${status === "complete" ? "text-[#059669]" : "text-[#0F172A]"
                }`}>
                {t.status[status]}
              </h2>

              {/* Progress Bar */}
              {status === "printing" && (
                <div className="w-full max-w-md">
                  <div className="h-4 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#059669] transition-all duration-100"
                      style={{ width: `${printProgress}%` }}
                    />
                  </div>
                  <p className="mt-3 text-center text-sm text-[#6B7280]">
                    {printProgress}% complete
                  </p>
                </div>
              )}

              {/* Collect Photo Message & Share */}
              {status === "complete" && (
                <div className="mt-6 flex flex-col gap-6 w-full animate-in slide-in-from-bottom-4 fade-in duration-700">
                  <div className="rounded-2xl bg-[#ECFDF5] p-6 text-center transform transition-all hover:scale-[1.02]">
                    <p className="text-lg font-bold text-[#059669]">
                      {t.collectPhoto}
                    </p>
                  </div>

                  {/* WhatsApp Share Section */}
                  {sessionId && (
                    <div className="bg-white rounded-2xl border-2 border-[#25D366] p-6 flex flex-row items-center justify-between gap-6 shadow-sm">
                      <div className="text-left space-y-2 flex-1">
                        <div className="flex items-center gap-2 text-[#25D366]">
                          <Share2 className="w-6 h-6" />
                          <span className="font-bold text-lg">Get Digital Copy</span>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          Scan to get your photo and share on WhatsApp instantly.
                        </p>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm shrink-0">
                        <QRCodeSVG
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/mobile-share/${sessionId}`}
                          size={120}
                          level="M"
                          fgColor="#0F172A"
                        />
                      </div>
                    </div>
                  )}

                  {/* Manual Done Button */}
                  <button
                    onClick={onComplete}
                    className="w-full py-4 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    Done & Start New Session
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* UPI Logo Bar */}
        <div className="mt-6 flex items-center justify-center gap-6 opacity-50">
          <span className="text-sm font-medium text-[#6B7280]">Powered by</span>
          <div className="flex items-center gap-4">
            <div className="rounded bg-[#5F259F] px-3 py-1 text-xs font-bold text-white">
              PhonePe
            </div>
            <div className="rounded bg-[#002E6E] px-3 py-1 text-xs font-bold text-white">
              Paytm
            </div>
            <div className="rounded bg-[#4285F4] px-3 py-1 text-xs font-bold text-white">
              GPay
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
