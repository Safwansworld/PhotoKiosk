"use client"

import { useState, useEffect } from "react"
import { Check, Printer, Shield, Clock, Share2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import Script from "next/script"
import { supabase } from "@/lib/supabase"
import type { PhotoData } from "@/components/kiosk/kiosk-main"

interface PaymentScreenProps {
  photoData: PhotoData
  onComplete: () => void
  onBack: () => void
  onCancel: () => void
  language: "ENG" | "MAL"
  sessionId: string | null
}

type PaymentStatus = "pending" | "processing" | "confirmed" | "printing" | "complete"

export function PaymentScreen({
  photoData,
  onComplete,
  onBack,
  onCancel,
  language,
  sessionId,
}: PaymentScreenProps) {
  const [status, setStatus] = useState<PaymentStatus>("pending")
  const [printProgress, setPrintProgress] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    if (status === "pending" || status === "processing") {
      if (timeLeft <= 0) {
        // Enforce cleanup of Razorpay iframe if it's still injected
        const razorpayContainer = document.querySelector('.razorpay-container')
        if (razorpayContainer) razorpayContainer.remove()
        
        onCancel() // Cancel payment and reset session
        return
      }
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [status, timeLeft, onCancel])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const razorpayContainer = document.querySelector('.razorpay-container')
      if (razorpayContainer) razorpayContainer.remove()
    }
  }, [])

  const content = {
    ENG: {
      title: "Complete Payment",
      subtitle: "Pay via UPI, Card, or Netbanking",
      amount: "₹100",
      status: {
        pending: "Waiting for payment...",
        processing: "Processing payment...",
        confirmed: "Payment confirmed!",
        printing: "Printing your photo...",
        complete: "Print complete!",
      },
      secure: "Secured by Razorpay",
      timeout: "Auto-cancel in 5:00",
      collectPhoto: "Please collect your photo from the tray below",
      printAnother: "Print Another",
      cancelButton: "Cancel & Start Over",
    },
    MAL: {
      title: "പേയ്‌മെന്റ് പൂർത്തിയാക്കുക",
      subtitle: "UPI, കാർഡ് അല്ലെങ്കിൽ നെറ്റ്ബാങ്കിംഗ് വഴി പണമടയ്ക്കുക",
      amount: "₹100",
      status: {
        pending: "പേയ്‌മെന്റിനായി കാത്തിരിക്കുന്നു...",
        processing: "പേയ്‌മെന്റ് പ്രോസസ്സ് ചെയ്യുന്നു...",
        confirmed: "പേയ്‌മെന്റ് സ്ഥിരീകരിച്ചു!",
        printing: "നിങ്ങളുടെ ഫോട്ടോ പ്രിന്റ് ചെയ്യുന്നു...",
        complete: "പ്രിന്റ് പൂർത്തിയായി!",
      },
      secure: "Razorpay സുരക്ഷിതം",
      timeout: "5:00-ൽ ഓട്ടോ-ക്യാൻസൽ",
      collectPhoto: "ചുവടെയുള്ള ട്രേയിൽ നിന്ന് നിങ്ങളുടെ ഫോട്ടോ എടുക്കുക",
      printAnother: "മറ്റൊന്ന് പ്രിന്റ് ചെയ്യുക",
      cancelButton: "റദ്ദാക്കുക",
    },
  }

  const t = content[language]

  // Razorpay payment flow
  const handlePayment = async () => {
    try {
      setStatus("processing")
      // 1. Create order
      const orderRes = await fetch("/api/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 1, sessionId }), // Changed to 1 INR for live testing
      })
      const orderData = await orderRes.json()

      if (!orderData.id) {
        throw new Error("Failed to create Razorpay order")
      }

      // 2. Open Razorpay Checkout Modal Overlay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Photo Kiosk",
        description: "Photo Print Transaction",
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            setStatus("processing")
            const verifyRes = await fetch("/api/verify-razorpay-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response }),
            })

            if (verifyRes.ok) {
              if (sessionId) {
                await supabase
                  .from('kiosk_sessions')
                  .update({ payment_status: 'completed' })
                  .eq('id', sessionId)
              }
              setStatus("confirmed")
            } else {
              alert("Payment verification failed")
              setStatus("pending")
            }
          } catch (err) {
            console.error(err)
            setStatus("pending")
          }
        },
        prefill: {
          name: "User",
          contact: "9999999999"
        },
        theme: {
          color: "#2563EB"
        },
        modal: {
          ondismiss: function () {
            setStatus("pending")
          }
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any) {
        alert("Payment failed: " + response.error.description);
        setStatus("pending")
      });
      rzp1.open();

    } catch (err) {
      console.error(err)
      setStatus("pending")
      alert("Failed to initialize payment")
    }
  }

  useEffect(() => {
    // Automatically trigger payment on mount
    handlePayment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status === "confirmed") {
      const timer = setTimeout(() => {
        if (sessionId) {
          supabase.from("kiosk_sessions").update({ print_status: "printing" }).eq("id", sessionId)
        }
        setStatus("printing")
      }, 1500)
      return () => clearTimeout(timer)
    }

    if (status === "printing") {
      if (photoData.imageUrl) {
        const iframe = document.createElement('iframe')
        iframe.style.cssText = 'position:absolute;width:0px;height:0px;border:none;visibility:hidden;'
        document.body.appendChild(iframe)

        const iframeDoc = iframe.contentWindow?.document
        if (iframeDoc) {
          iframeDoc.write(`
            <html>
              <head>
                <style>
                  @page { margin: 0.5in; size: auto; }
                  body { 
                    margin: 0; 
                    padding: 0; 
                    display: grid; 
                    grid-template-columns: repeat(2, 1fr); 
                    grid-template-rows: repeat(2, 1fr); 
                    gap: 0.5in;
                    width: 100%; 
                    height: 100vh; 
                    box-sizing: border-box; 
                    background: white;
                  }
                  .photo-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                  }
                  img { 
                    max-width: 100%; 
                    max-height: 100%; 
                    object-fit: contain; 
                  }
                </style>
              </head>
              <body>
                <div class="photo-container"><img src="${photoData.imageUrl}" /></div>
                <div class="photo-container"><img src="${photoData.imageUrl}" /></div>
                <div class="photo-container"><img src="${photoData.imageUrl}" /></div>
                <div class="photo-container"><img src="${photoData.imageUrl}" onload="window.print(); setTimeout(function(){ window.parent.document.body.removeChild(window.frameElement); }, 2000);" /></div>
              </body>
            </html>
          `)
          iframeDoc.close()
        }
      }

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
  }, [status, onComplete, sessionId])

  return (
    <div className="flex h-full w-full items-center justify-center pb-24">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="rounded-3xl bg-white p-12 soft-shadow">
          {status === "pending" || status === "processing" ? (
            <div className="flex flex-col items-center justify-center py-20">
              {/* Header */}
              <div className="mb-10 text-center">
                <h1 className="mb-2 text-4xl font-bold tracking-tight text-[#0F172A]">
                  {t.title}
                </h1>
                <p className="text-xl text-[#6B7280]">Connecting to Razorpay Gateway...</p>
              </div>

              {/* Payment Loading Section */}
              <div className="flex flex-col items-center">
                {/* Circular 1-minute countdown */}
                <div className="mt-8 flex flex-col items-center animate-in fade-in duration-500">
                  <div className="relative flex items-center justify-center">
                    <svg className="h-24 w-24 -rotate-90 transform">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-gray-200"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={(2 * Math.PI * 40) * (1 - timeLeft / 60)}
                        className="text-[#2563EB] transition-all duration-1000 ease-linear"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-xl font-bold text-[#0F172A]">
                       00:{timeLeft.toString().padStart(2, '0')}
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-medium text-[#6B7280]">
                    Cancelling payment in 00:{timeLeft.toString().padStart(2, '0')}
                  </p>
                </div>

                {/* Action Buttons in case modal was closed */}
                {status === "pending" && (
                  <div className="mt-8 flex gap-4">
                    <button
                      onClick={onCancel}
                      className="rounded-xl border-2 border-[#E5E7EB] bg-white px-8 py-4 text-xl font-bold text-[#4B5563] shadow-sm hover:bg-[#F9FAFB] hover:text-[#111827] transition-all"
                    >
                      {t.cancelButton}
                    </button>
                    <button
                      onClick={handlePayment}
                      className="rounded-xl bg-[#0F172A] px-8 py-4 text-xl font-bold text-white shadow-xl hover:bg-[#1E293B] transition-colors"
                    >
                      Retry Payment
                    </button>
                  </div>
                )}

                {/* Development Test Button */}
                {process.env.NODE_ENV === 'development' && status === "pending" && (
                  <button
                    onClick={async () => {
                      if (sessionId) {
                        await supabase.from('kiosk_sessions').update({ payment_status: 'completed' }).eq('id', sessionId)
                      }
                      setStatus('confirmed')
                    }}
                    className="mt-6 rounded-lg bg-red-100 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-200"
                  >
                    Bypass Mock Verify (Dev Only)
                  </button>
                )}
              </div>
            </div>
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

        {/* Payment Network Logo Bar */}
        <div className="mt-6 flex items-center justify-center gap-6 opacity-50">
          <span className="text-sm font-medium text-[#6B7280]">Powered by</span>
          <div className="flex items-center gap-4">
            <div className="font-bold text-[#0F172A] px-3 py-1 rounded bg-gray-200/50">
              Razorpay Checkout
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
