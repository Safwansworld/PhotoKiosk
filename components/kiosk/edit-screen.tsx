"use client"

import React from "react"


import { useState, useEffect, useRef, useCallback } from "react"
import { Check, Lock, Sparkles, Sun, Crop, ArrowRight, Loader2, Palette, Shirt, Move, ZoomIn, ZoomOut, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import type { PhotoData } from "@/components/kiosk/kiosk-main"
import { removeBackground } from "@/lib/image-segmenter"
import { useToast } from "@/hooks/use-toast"

interface EditScreenProps {
  photoData: PhotoData
  onProceedToPayment: (processedImage?: string) => void
  onBack: () => void
  language: "ENG" | "MAL"
  isUploading?: boolean
}

interface Toggle {
  id: string
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
  locked?: boolean
}

export function EditScreen({
  photoData,
  onProceedToPayment,
  onBack,
  language,
  isUploading = false,
}: EditScreenProps) {
  const [toggles, setToggles] = useState<Toggle[]>([
    {
      id: "background",
      icon: <Sparkles className="h-6 w-6" />,
      label: language === "ENG" ? "Remove Background" : "പശ്ചാത്തലം നീക്കം ചെയ്യുക",
      description: language === "ENG" ? "AI-powered background removal" : "AI പവർഡ് ബാക്ക്ഗ്രൗണ്ട് നീക്കൽ",
      enabled: true,
    },
    {
      id: "suit",
      icon: <Shirt className="h-6 w-6" />,
      label: language === "ENG" ? "Change Suit" : "സൂട്ട മാറ്റുക",
      description: language === "ENG" ? "Add formal attire" : "ഔദ്യോഗിക വേഷം ചേർക്കുക",
      enabled: false,
    },
    {
      id: "lighting",
      icon: <Sun className="h-6 w-6" />,
      label: language === "ENG" ? "Fix Lighting" : "ലൈറ്റിംഗ് ശരിയാക്കുക",
      description: language === "ENG" ? "Auto-adjust brightness & contrast" : "ബ്രൈറ്റ്‌നെസ് & കോൺട്രാസ്റ്റ് ഓട്ടോ-അഡ്ജസ്റ്റ്",
      enabled: true,
    },
    {
      id: "crop",
      icon: <Crop className="h-6 w-6" />,
      label: language === "ENG" ? "Auto-Crop to Passport Size" : "പാസ്‌പോർട്ട് സൈസിലേക്ക് ഓട്ടോ-ക്രോപ്പ്",
      description: language === "ENG" ? "35mm × 45mm official format" : "35mm × 45mm ഔദ്യോഗിക ഫോർമാറ്റ്",
      enabled: true,
      locked: true,
    },
  ])

  const [selectedColor, setSelectedColor] = useState<string>("#FFFFFF")

  const BACKGROUND_COLORS = [
    { name: "White", value: "#FFFFFF" },
    { name: "Light Blue", value: "#BFDBFE" },
    { name: "Royal Blue", value: "#2563EB" },
    { name: "Grey", value: "#D1D5DB" },
    { name: "Red", value: "#EF4444" },
  ]

  // SUIT ASSETS (SVG Data URIs for demo)
  const SUITS = [
    {
      id: "navy",
      name: "Navy Suit",
      src: "https://png.pngtree.com/png-clipart/20230820/ourmid/pngtree-formal-suit-for-passport-photo-png-image_9189043.png"
    },
    {
      id: "black",
      name: "Black Suit",
      src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMTUwIj4KICA8cGF0aCBkPSJNNDAgMTUwIEw0MCA1MCBMODAgMjAgTDEyMCAyMCBMMTYwIDUwIEwxNjAgMTUwIFoiIGZpbGw9IiMxMTE4MjciIC8+CiAgPHBhdGggZD0iTTgwIDIwIEwxMDAgNTAgTDEyMCAyMCIgZmlsbD0id2hpdGUiIC8+CiAgPHBhdGggZD0iTTEwMCAyMCBMMTAwIDYwIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iNCIgLz4KPC9zdmc+"
    },
    {
      id: "grey",
      name: "Grey Suit",
      src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMTUwIj4KICA8cGF0aCBkPSJNNDAgMTUwIEw0MCA1MCBMODAgMjAgTDEyMCAyMCBMMTYwIDUwIEwxNjAgMTUwIFoiIGZpbGw9IiM0YjU1NjMiIC8+CiAgPHBhdGggZD0iTTgwIDIwIEwxMDAgNTAgTDEyMCAyMCIgZmlsbD0id2hpdGUiIC8+CiAgPHBhdGggZD0iTTEwMCAyMCBMMTAwIDYwIiBzdHJva2U9IiMxMTE4MjciIHN0cm9rZS13aWR0aD0iNCIgLz4KPC9zdmc+"
    },
  ]

  const [selectedSuit, setSelectedSuit] = useState<string | null>(null)
  const [suitTransform, setSuitTransform] = useState({ x: 0, y: 50, scale: 1.0 })


  const [bgRemovedCache, setBgRemovedCache] = useState<string | null>(null)
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  // Debounce effect helper
  const processingRef = useRef(false)

  const content = {
    ENG: {
      title: "AI Photo Lab",
      subtitle: "Smart enhancements applied",
      preview: "Preview",
      document: "Passport Photo",
      dimensions: "35mm × 45mm",
      proceedButton: "Looks Good — Pay ₹100",
      processing: "Processing...",
      toggleLabel: {
        on: "ON",
        off: "OFF",
        locked: "Required",
      },
    },
    MAL: {
      title: "AI ഫോട്ടോ ലാബ്",
      subtitle: "സ്മാർട്ട് മെച്ചപ്പെടുത്തലുകൾ പ്രയോഗിച്ചു",
      preview: "പ്രിവ്യൂ",
      document: "പാസ്‌പോർട്ട് ഫോട്ടോ",
      dimensions: "35mm × 45mm",
      proceedButton: "നല്ലതായി തോന്നുന്നു — ₹100 അടയ്ക്കുക",
      processing: "പ്രോസസ്സിംഗ്...",
      toggleLabel: {
        on: "ഓൺ",
        off: "ഓഫ്",
        locked: "ആവശ്യമാണ്",
      },
    },
  }

  const t = content[language]

  const handleToggle = (id: string) => {
    if (id === "crop" && toggles.find(t => t.id === "crop")?.locked) return;

    setToggles((prev) =>
      prev.map((toggle) =>
        toggle.id === id && !toggle.locked
          ? { ...toggle, enabled: !toggle.enabled }
          : toggle
      )
    )
  }

  // 1. Handle Background Removal (Async, Heavy)
  useEffect(() => {
    const bgToggle = toggles.find(t => t.id === "background")

    if (bgToggle?.enabled && photoData.imageUrl && !bgRemovedCache && !processingRef.current) {
      const runBgRemoval = async () => {
        try {
          processingRef.current = true
          setIsProcessing(true)
          const img = new Image()
          img.src = photoData.imageUrl!
          img.crossOrigin = "anonymous"
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
          })

          const result = await removeBackground(img)
          setBgRemovedCache(result)
        } catch (err) {
          console.error(err)
          toast({
            variant: "destructive",
            title: "Background Removal Failed",
            description: "Keeping original background."
          })
          // Turn off toggle if failed
          setToggles(prev => prev.map(t => t.id === "background" ? { ...t, enabled: false } : t))
        } finally {
          processingRef.current = false
          setIsProcessing(false) // Wait for pipeline to finish? 
          // We'll let the next effect handle the final compositing
        }
      }
      runBgRemoval()
    }
  }, [toggles, photoData.imageUrl, bgRemovedCache, toast])

  // 2. Handle Compositing (Crop + Lighting)
  useEffect(() => {
    const composeImage = async () => {
      if (!photoData.imageUrl) return

      // Wait if BG removal is still running?
      if (processingRef.current) return;

      const bgToggle = toggles.find(t => t.id === "background")?.enabled
      const lightingToggle = toggles.find(t => t.id === "lighting")?.enabled
      const cropToggle = toggles.find(t => t.id === "crop")?.enabled

      // Determine source
      const sourceUrl = (bgToggle && bgRemovedCache) ? bgRemovedCache : photoData.imageUrl

      if (!sourceUrl) return

      // We want to generate a new image URL with lighting and crop applied
      // Create canvas
      const img = new Image()
      img.src = sourceUrl
      img.crossOrigin = "anonymous"
      await new Promise(r => img.onload = r)

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Target Dimensions: 35mm x 45mm ratio.
      // Let's us standard high-res passport size: 413x531 px (at 300dpi) or higher. 
      // Or just keep aspect ratio of source but crop?
      // Since we want "Passport Size", let's fix aspect ratio to 35:45.
      // We'll use a reasonable width like 600px.
      const targetW = 600
      const targetH = (45 / 35) * targetW // ~771

      canvas.width = targetW
      canvas.height = targetH

      // Draw background white first (standard for ID) if transparency
      // Draw background
      ctx.fillStyle = selectedColor
      ctx.fillRect(0, 0, targetW, targetH)

      // Calculate Crop (Center-Crop logic)
      // Source aspect ratio
      const sourceAspect = img.width / img.height
      const targetAspect = targetW / targetH

      let drawX, drawY, drawW, drawH;

      if (cropToggle) {
        if (sourceAspect > targetAspect) {
          // Source is wider, crop sides
          drawH = img.height
          drawW = img.height * targetAspect
          drawX = (img.width - drawW) / 2
          drawY = 0
        } else {
          // Source is taller, crop top/bottom
          drawW = img.width
          drawH = img.width / targetAspect
          drawX = 0
          drawY = (img.height - drawH) / 2
        }
      } else {
        // Fit to canvas? Or just draw original?
        // If crop disabled, user might expect original ratio.
        // But our UI container is 35:45.
        // For simplicity, let's treat "locked" crop as enforcing this ratio.
        // But if we truly support disabling crop, we should change canvas size.
        // But Crop is locked. So we always crop.
        if (sourceAspect > targetAspect) {
          drawH = img.height
          drawW = img.height * targetAspect
          drawX = (img.width - drawW) / 2
          drawY = 0
        } else {
          drawW = img.width
          drawH = img.width / targetAspect
          drawX = 0
          drawY = (img.height - drawH) / 2
        }
      }

      // Apply filters
      if (lightingToggle) {
        ctx.filter = "brightness(1.1) contrast(1.1) saturate(1.1)"
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH, 0, 0, targetW, targetH)

      // Draw Suit Overlay
      const suitToggle = toggles.find(t => t.id === "suit")?.enabled
      if (suitToggle && selectedSuit) {
        const suitObj = SUITS.find(s => s.id === selectedSuit)
        if (suitObj) {
          const suitImg = new Image()
          suitImg.src = suitObj.src
          suitImg.crossOrigin = "anonymous"
          await new Promise((r) => {
            suitImg.onload = r
            suitImg.onerror = r // proceed even if fail
          })

          // Calculate suit position based on transform
          // Default width: relative to canvas width
          const baseSuitW = targetW * 0.8 // 80% of width
          const baseSuitH = baseSuitW * (suitImg.height / suitImg.width) // constant aspect

          const finalW = baseSuitW * suitTransform.scale
          const finalH = baseSuitH * suitTransform.scale

          // Center horizontally by default + offset
          const finalX = (targetW - finalW) / 2 + suitTransform.x
          // Position at bottom by default + offset
          const finalY = (targetH - finalH) + suitTransform.y

          try {
            if (suitImg.complete && suitImg.naturalWidth > 0) {
              ctx.drawImage(suitImg, finalX, finalY, finalW, finalH)
            }
          } catch (e) {
            console.error("Failed to draw suit image", e)
          }
        }
      }

      setFinalImageUrl(canvas.toDataURL("image/jpeg", 0.95))
    }

    const timer = setTimeout(composeImage, 100)
    return () => clearTimeout(timer)
  }, [toggles, bgRemovedCache, photoData.imageUrl, processingRef.current, selectedColor, selectedSuit, suitTransform])


  const handleProceed = () => {
    onProceedToPayment(finalImageUrl || photoData.imageUrl || undefined);
  }

  return (
    <div className="flex h-full w-full pb-24">
      {/* Left Side - Photo Preview */}
      <div className="flex w-1/2 flex-col items-center justify-center bg-[#F3F4F6] p-12">
        <div className="w-full max-w-lg">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6B7280]">
            {t.preview}
          </h2>

          {/* Document Simulation Frame */}
          <div className="relative rounded-3xl bg-white p-8 soft-shadow">
            {/* Document Header */}
            <div className="mb-6 flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <div>
                <p className="text-lg font-bold text-[#0F172A]">{t.document}</p>
                <p className="text-sm text-[#6B7280]">{t.dimensions}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF5]">
                <Check className="h-5 w-5 text-[#059669]" />
              </div>
            </div>

            {/* Photo Frame */}
            <div className="relative mx-auto aspect-[35/45] w-64 overflow-hidden rounded-xl border-4 border-[#E5E7EB] bg-white">
              {finalImageUrl || photoData.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <div className="relative h-full w-full">
                  <img
                    src={finalImageUrl || photoData.imageUrl || ""}
                    alt="Passport preview"
                    className={`h-full w-full object-cover transition-opacity duration-300 ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
                    </div>
                  )}
                </div>
              ) : (
                /* Placeholder face silhouette */
                <div className="absolute inset-0 flex items-center justify-center bg-[#E0E7FF]">
                  <div className="h-32 w-24 rounded-t-full bg-[#0F172A]/20" />
                </div>
              )}

              {/* Enhancement indicators */}
              {toggles[0].enabled && (
                <div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 shadow-sm">
                  <span className="text-xs font-medium text-[#059669]">BG Removed</span>
                </div>
              )}
              {toggles[1].enabled && (
                <div className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-1 shadow-sm">
                  <span className="text-xs font-medium text-[#2563EB]">Enhanced</span>
                </div>
              )}
            </div>

            {/* Crop Guidelines */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-px w-8 bg-[#E5E7EB]" />
              <span className="text-xs text-[#6B7280]">Auto-cropped to specifications</span>
              <div className="h-px w-8 bg-[#E5E7EB]" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - AI Tools */}
      <div className="w-1/2 overflow-y-auto bg-white">
        <div className="flex min-h-full flex-col items-center justify-center p-12">
          <div className="w-full max-w-lg">
            {/* Header */}
            <div className="mb-10">
              <h1 className="mb-2 text-4xl font-bold tracking-tight text-[#0F172A]">
                {t.title}
              </h1>
              <p className="text-xl text-[#6B7280]">{t.subtitle}</p>
            </div>

            {/* Smart Toggles */}
            <div className="mb-10 space-y-4">
              {toggles.map((toggle) => (
                <div
                  key={toggle.id}
                  className={`flex items-center justify-between rounded-2xl border-2 p-5 transition-all ${toggle.enabled
                    ? "border-[#2563EB]/20 bg-[#EFF6FF]"
                    : "border-[#E5E7EB] bg-white"
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${toggle.enabled
                        ? "bg-[#2563EB] text-white"
                        : "bg-[#F3F4F6] text-[#6B7280]"
                        }`}
                    >
                      {toggle.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-[#0F172A]">{toggle.label}</p>
                      <p className="text-sm text-[#6B7280]">{toggle.description}</p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  {toggle.locked ? (
                    <div className="flex items-center gap-2 rounded-full bg-[#F3F4F6] px-4 py-2">
                      <Lock className="h-4 w-4 text-[#6B7280]" />
                      <span className="text-sm font-medium text-[#6B7280]">
                        {t.toggleLabel.locked}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleToggle(toggle.id)}
                      className={`relative h-8 w-16 rounded-full transition-colors ${toggle.enabled ? "bg-[#2563EB]" : "bg-[#E5E7EB]"
                        }`}
                      aria-label={`Toggle ${toggle.label}`}
                    >
                      <div
                        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${toggle.enabled ? "translate-x-9" : "translate-x-1"
                          }`}
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Background Color Picker - Only show if BG Removal is ON */}
            {toggles.find(t => t.id === "background")?.enabled && (
              <div className="mb-10 rounded-2xl border-2 border-[#E5E7EB] bg-white p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <Palette size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0F172A]">
                      {language === "ENG" ? "Background Color" : "പശ്ചാത്തല നിറം"}
                    </h3>
                    <p className="text-sm text-[#6B7280]">
                      {language === "ENG" ? "Select a static background" : "ഒരു പശ്ചാത്തലം തിരഞ്ഞെടുക്കുക"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  {BACKGROUND_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.value)}
                      className={`group relative h-12 w-12 rounded-full border-2 transition-all ${selectedColor === color.value
                        ? 'border-blue-600 scale-110 shadow-md ring-2 ring-blue-100'
                        : 'border-gray-200 hover:scale-105 hover:border-blue-300'
                        }`}
                      style={{ backgroundColor: color.value }}
                      aria-label={`Select ${color.name} background`}
                    >
                      {selectedColor === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className={`w-6 h-6 ${color.value === '#FFFFFF' ? 'text-black' : 'text-white'}`} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suit Selection & Adjustment */}
            {toggles.find(t => t.id === "suit")?.enabled && (
              <div className="mb-10 rounded-2xl border-2 border-[#E5E7EB] bg-white p-5 animate-in slide-in-from-top-4 duration-300">
                {/* Suit Picker */}
                <div className="mb-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Shirt size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0F172A]">Select Attire</h3>
                      <p className="text-sm text-[#6B7280]">Choose a formal suit</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {SUITS.map((suit) => (
                      <button
                        key={suit.id}
                        onClick={() => setSelectedSuit(suit.id)}
                        className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${selectedSuit === suit.id
                          ? "bg-blue-50 border-2 border-blue-500 shadow-sm"
                          : "border-2 border-transparent hover:bg-gray-50"
                          }`}
                      >
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={suit.src} alt={suit.name} className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{suit.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adjustment Controls */}
                {selectedSuit && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Adjust Position & Size</p>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Size Controls */}
                      <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                        <button
                          onClick={() => setSuitTransform(prev => ({ ...prev, scale: Math.max(0.5, prev.scale - 0.1) }))}
                          className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 active:scale-95 text-gray-700"
                        >
                          <ZoomOut size={18} />
                        </button>
                        <span className="text-sm font-medium text-gray-600">Size</span>
                        <button
                          onClick={() => setSuitTransform(prev => ({ ...prev, scale: Math.min(2.0, prev.scale + 0.1) }))}
                          className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 active:scale-95 text-gray-700"
                        >
                          <ZoomIn size={18} />
                        </button>
                      </div>

                      {/* Position Controls */}
                      <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-center gap-2">
                        <div className="grid grid-cols-3 gap-1">
                          <div />
                          <button onClick={() => setSuitTransform(prev => ({ ...prev, y: prev.y - 10 }))} className="p-1 bg-white rounded text-gray-700 shadow-sm active:bg-gray-100 w-8 h-8 flex items-center justify-center"><ChevronUp size={16} /></button>
                          <div />

                          <button onClick={() => setSuitTransform(prev => ({ ...prev, x: prev.x - 10 }))} className="p-1 bg-white rounded text-gray-700 shadow-sm active:bg-gray-100 w-8 h-8 flex items-center justify-center"><ChevronLeft size={16} /></button>
                          <div className="flex items-center justify-center"><Move size={16} className="text-gray-400" /></div>
                          <button onClick={() => setSuitTransform(prev => ({ ...prev, x: prev.x + 10 }))} className="p-1 bg-white rounded text-gray-700 shadow-sm active:bg-gray-100 w-8 h-8 flex items-center justify-center"><ChevronRight size={16} /></button>

                          <div />
                          <button onClick={() => setSuitTransform(prev => ({ ...prev, y: prev.y + 10 }))} className="p-1 bg-white rounded text-gray-700 shadow-sm active:bg-gray-100 w-8 h-8 flex items-center justify-center"><ChevronDown size={16} /></button>
                          <div />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Proceed to Payment Button */}
            <button
              onClick={handleProceed}
              disabled={isUploading || isProcessing}
              className="group flex h-[88px] w-full items-center justify-between rounded-2xl bg-[#059669] px-8 text-white transition-all hover:bg-[#047857] active:scale-[0.98] soft-shadow disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span className="text-2xl font-semibold">
                {isUploading ? t.processing : isProcessing ? "Processing..." : t.proceedButton}
              </span>
              {isUploading || isProcessing ? (
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-white border-t-transparent" />
              ) : (
                <ArrowRight className="h-7 w-7 transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
