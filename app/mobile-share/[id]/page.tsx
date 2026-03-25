"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Download, Share2, Loader2, AlertCircle, Check } from "lucide-react"

export default function MobileSharePage() {
    const params = useParams()
    const id = params?.id as string
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchSession = async () => {
            if (!id) return

            try {
                const { data, error } = await supabase
                    .from('kiosk_sessions')
                    .select('image_url')
                    .eq('id', id)
                    .single()

                if (error) throw error
                if (data) {
                    setImageUrl(data.image_url)
                }
            } catch (err: any) {
                console.error("Error fetching session:", err)
                setError("Could not load photo. Session might be expired.")
            } finally {
                setLoading(false)
            }
        }

        fetchSession()
    }, [id])

    const handleWhatsAppShare = () => {
        if (!imageUrl) return
        const text = `Check out my photo from PhotoPoint! ${imageUrl}`
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }

    const handleDownload = async () => {
        if (!imageUrl) return
        try {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `PhotoPoint_${id}.jpg` // or png
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (e) {
            console.error("Download failed", e)
            window.open(imageUrl, '_blank')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">Oops!</h1>
                <p className="text-gray-500">{error}</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
            <div className="w-full max-w-sm space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">Your Photo is Ready!</h1>
                    <p className="text-gray-500">Download or share it with friends</p>
                </div>

                {/* Photo Card */}
                <div className="bg-white p-4 rounded-2xl shadow-xl shadow-blue-900/5 rotate-1 hover:rotate-0 transition-transform duration-300">
                    <div className="aspect-[35/45] w-full bg-gray-100 rounded-lg overflow-hidden relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageUrl || ""}
                            alt="Your photo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                    <button
                        onClick={handleWhatsAppShare}
                        className="w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-lg shadow-green-500/20 transition-all active:scale-95"
                    >
                        <Share2 className="w-6 h-6" />
                        Share on WhatsApp
                    </button>

                    <button
                        onClick={handleDownload}
                        className="w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 bg-white text-gray-900 border-2 border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
                    >
                        <Download className="w-6 h-6 text-gray-600" />
                        Download Photo
                    </button>
                </div>

                {/* Footer */}
                <div className="text-center pt-8 text-xs text-gray-400 uppercase tracking-widest">
                    PhotoPoint Kiosk
                </div>
            </div>
        </div>
    )
}
