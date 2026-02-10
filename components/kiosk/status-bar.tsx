"use client"

import { ChevronLeft, Wifi } from "lucide-react"

interface StatusBarProps {
  language: "ENG" | "MAL"
  onLanguageChange: (lang: "ENG" | "MAL") => void
  showBack?: boolean
  onBack?: () => void
}

export function StatusBar({
  language,
  onLanguageChange,
  showBack,
  onBack,
}: StatusBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="glass mx-6 mb-6 flex h-16 items-center justify-between rounded-2xl px-6 soft-shadow">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={onBack}
              className="flex h-11 items-center gap-2 rounded-xl bg-[#F3F4F6] px-4 text-[#0F172A] transition-all hover:bg-[#E5E7EB] active:scale-95"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-base font-medium">Back</span>
            </button>
          )}
        </div>

        {/* System Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-[#059669]" />
            <span className="text-sm font-medium text-[#6B7280]">
              System Online
            </span>
          </div>
          <span className="text-[#E5E7EB]">|</span>
          <span className="text-base font-semibold text-[#0F172A]">
            {language === "ENG" ? "₹100 per Sheet" : "₹100 ഓരോ ഷീറ്റിനും"}
          </span>
        </div>

        {/* Language Toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-[#F3F4F6] p-1">
          <button
            onClick={() => onLanguageChange("ENG")}
            className={`h-9 rounded-lg px-4 text-sm font-semibold transition-all ${
              language === "ENG"
                ? "bg-[#0F172A] text-white"
                : "text-[#6B7280] hover:text-[#0F172A]"
            }`}
            aria-label="Switch to English"
          >
            ENG
          </button>
          <button
            onClick={() => onLanguageChange("MAL")}
            className={`h-9 rounded-lg px-4 text-sm font-semibold transition-all ${
              language === "MAL"
                ? "bg-[#0F172A] text-white"
                : "text-[#6B7280] hover:text-[#0F172A]"
            }`}
            aria-label="Switch to Malayalam"
          >
            MAL
          </button>
        </div>
      </div>
    </div>
  )
}
