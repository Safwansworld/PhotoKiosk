"use client"

import { ArrowRight, Smartphone, Cloud, Usb } from "lucide-react"

interface AttractScreenProps {
  onStartCamera: () => void
  onUploadFile: () => void
  language: "ENG" | "MAL"
}

export function AttractScreen({
  onStartCamera,
  onUploadFile,
  language,
}: AttractScreenProps) {
  const content = {
    ENG: {
      capture: {
        headline: "Take New Photo",
        subtext: "Studio lighting & Auto-retouching",
        button: "Start Camera",
      },
      upload: {
        headline: "Print from File",
        subtext: "Upload via Mobile, USB, or WhatsApp",
        button: "Upload File",
      },
    },
    MAL: {
      capture: {
        headline: "പുതിയ ഫോട്ടോ എടുക്കുക",
        subtext: "സ്റ്റുഡിയോ ലൈറ്റിംഗ് & ഓട്ടോ-റീടച്ചിംഗ്",
        button: "ക്യാമറ തുടങ്ങുക",
      },
      upload: {
        headline: "ഫയലിൽ നിന്ന് പ്രിന്റ് ചെയ്യുക",
        subtext: "മൊബൈൽ, USB, അല്ലെങ്കിൽ WhatsApp വഴി അപ്‌ലോഡ് ചെയ്യുക",
        button: "ഫയൽ അപ്‌ലോഡ് ചെയ്യുക",
      },
    },
  }

  const t = content[language]

  return (
    <div className="flex h-full w-full pb-24">
      {/* Left Container - Capture Path */}
      <div className="flex w-1/2 flex-col items-center justify-center bg-white p-12">
        <div className="w-full max-w-lg">
          {/* Hero Image Area */}
          <div className="relative mb-10 flex h-72 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#E0E7FF] to-[#C7D2FE]">
            {/* Diverse group illustration - stylized avatars */}
            <div className="flex items-end gap-2">
              <div className="h-24 w-20 rounded-t-full bg-[#0F172A]" />
              <div className="h-32 w-20 rounded-t-full bg-[#2563EB]" />
              <div className="h-28 w-20 rounded-t-full bg-[#059669]" />
              <div className="h-20 w-20 rounded-t-full bg-[#6B7280]" />
            </div>
            {/* Camera flash effect */}
            <div className="absolute right-6 top-6 h-12 w-12 rounded-full bg-white/80 blur-lg" />
            <div className="absolute right-8 top-8 h-6 w-6 rounded-full bg-white" />
          </div>

          {/* Text Content */}
          <h2 className="mb-3 text-4xl font-bold tracking-tight text-[#0F172A]">
            {t.capture.headline}
          </h2>
          <p className="mb-8 text-xl text-[#6B7280]">{t.capture.subtext}</p>

          {/* Primary CTA Button */}
          <button
            onClick={onStartCamera}
            className="group flex h-[88px] w-full items-center justify-between rounded-2xl bg-[#2563EB] px-8 text-white transition-all hover:bg-[#1D4ED8] active:scale-[0.98] soft-shadow"
          >
            <span className="text-2xl font-semibold">{t.capture.button}</span>
            <ArrowRight className="h-7 w-7 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Right Container - Upload Path */}
      <div className="flex w-1/2 flex-col items-center justify-center bg-[#F3F4F6] p-12">
        <div className="w-full max-w-lg">
          {/* Upload Illustration */}
          <div className="relative mb-10 flex h-72 items-center justify-center rounded-3xl bg-white soft-shadow">
            {/* Phone to Cloud Animation */}
            <div className="flex items-center gap-6">
              {/* Phone */}
              <div className="relative">
                <Smartphone className="h-28 w-28 text-[#0F172A]" strokeWidth={1.5} />
                {/* Data particles */}
                <div className="absolute -right-2 top-1/2 flex flex-col gap-1">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-[#2563EB]" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 animate-pulse rounded-full bg-[#2563EB]" style={{ animationDelay: "200ms" }} />
                  <div className="h-2 w-2 animate-pulse rounded-full bg-[#2563EB]" style={{ animationDelay: "400ms" }} />
                </div>
              </div>

              {/* Connection Line */}
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-1 w-4 animate-pulse rounded-full bg-[#2563EB]"
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>

              {/* Cloud */}
              <Cloud className="h-24 w-24 text-[#2563EB] animate-float" strokeWidth={1.5} />
            </div>

            {/* USB indicator */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-[#F3F4F6] px-3 py-1.5">
              <Usb className="h-4 w-4 text-[#6B7280]" />
              <span className="text-xs font-medium text-[#6B7280]">USB Ready</span>
            </div>
          </div>

          {/* Text Content */}
          <h2 className="mb-3 text-4xl font-bold tracking-tight text-[#0F172A]">
            {t.upload.headline}
          </h2>
          <p className="mb-8 text-xl text-[#6B7280]">{t.upload.subtext}</p>

          {/* Secondary CTA Button - Outline Style */}
          <button
            onClick={onUploadFile}
            className="group flex h-[88px] w-full items-center justify-between rounded-2xl border-2 border-[#0F172A] bg-transparent px-8 text-[#0F172A] transition-all hover:bg-[#0F172A] hover:text-white active:scale-[0.98]"
          >
            <span className="text-2xl font-semibold">{t.upload.button}</span>
            <ArrowRight className="h-7 w-7 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  )
}
