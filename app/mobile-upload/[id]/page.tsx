"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, Check, Loader2, Camera, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useParams } from "next/navigation"
import type { Viewport } from 'next'



export default function MobileUploadPage() {
    const params = useParams()
    const id = params?.id as string
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
    const [errorMessage, setErrorMessage] = useState<string>("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        // Log environment status for debugging
        console.log("Supabase URL present:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            setErrorMessage("Configuration Error: Missing API URL")
            setStatus("error")
        }
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            const reader = new FileReader()
            reader.onload = (e) => {
                setPreview(e.target?.result as string)
            }
            reader.readAsDataURL(selectedFile)
            setStatus("idle")
            setErrorMessage("")
        }
    }

    const handleUpload = async () => {
        if (!file || !id) return

        setStatus("uploading")
        try {
            // 1. Upload to Supabase Storage
            const fileName = `mobile_upload_${id}_${Date.now()}.jpg`
            const { error: uploadError } = await supabase.storage
                .from('photos')
                .upload(fileName, file, {
                    contentType: file.type || 'image/jpeg',
                    upsert: true
                })

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: publicUrlData } = supabase.storage
                .from('photos')
                .getPublicUrl(fileName)

            const publicUrl = publicUrlData.publicUrl

            // 3. Update mobile_uploads table
            const { error: dbError } = await supabase
                .from('mobile_uploads')
                .update({
                    image_url: publicUrl,
                    status: 'completed'
                })
                .eq('id', id)

            if (dbError) throw dbError

            setStatus("success")
        } catch (error: any) {
            console.error("Upload error:", error)
            setStatus("error")
            setErrorMessage(error.message || "Failed to upload photo")
        }
    }

    // Safety check for critical render failure
    if (!id) {
        console.error("MobileUploadPage: Missing ID", { params })
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
                <p className="text-red-500 font-bold mb-4">Error: Invalid Upload Session ID</p>
                <div className="text-xs text-gray-400 text-left bg-gray-100 p-4 rounded max-w-full overflow-auto">
                    <p>Params: {JSON.stringify(params)}</p>
                    <p>URL: {typeof window !== 'undefined' ? window.location.href : 'server'}</p>
                </div>
            </div>
        )
    }

    return (
        <div
            className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 safe-area-inset-bottom"
            style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden' }}
        >
            {/* Visual Debug helper for mobile */}
            <div className="fixed top-0 left-0 right-0 bg-yellow-100 text-yellow-800 text-[10px] p-1 text-center opacity-50 hover:opacity-100 z-50">
                Debug: Page Loaded | Status: {status} | ID: {id.slice(0, 4)}...
            </div>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-8 text-center relative">

                {/* Header / Brand */}
                <div className="absolute top-4 left-0 right-0 text-center">
                    <span className="text-xs font-bold text-gray-300 tracking-widest uppercase">PhotoPoint Kiosk</span>
                </div>

                {status === "success" ? (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <Check className="w-10 h-10 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Successful!</h1>
                            <p className="text-gray-500">Your photo has been sent to the kiosk.</p>
                        </div>
                        <div className="p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
                            Look at the kiosk screen now.
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2 mt-4">
                            <h1 className="text-2xl font-bold text-gray-900">Upload Photo</h1>
                            <p className="text-gray-500">Select a photo to send to the kiosk</p>
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                relative w-full aspect-[4/5] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden
                ${preview ? 'border-blue-500 bg-gray-900' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
              `}
                        >
                            {preview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                            ) : (
                                <div className="space-y-4 text-gray-400">
                                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-gray-900">Tap to take photo</p>
                                        <p className="text-sm">or choose from library</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        <button
                            onClick={handleUpload}
                            disabled={!file || status === "uploading"}
                            className={`
                w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all
                ${!file ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                                    status === "uploading" ? 'bg-blue-600 text-white opacity-80 cursor-wait' :
                                        'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30'}
              `}
                        >
                            {status === "uploading" ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    Send to Kiosk
                                </>
                            )}
                        </button>

                        {status === "error" && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 justify-center">
                                <AlertCircle className="w-4 h-4" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* Debug Info Footer (Visible on Mobile) */}
                        <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-300 font-mono break-all">
                            Session: {id.slice(0, 8)}...<br />
                            Env: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'MISSING (Using Placeholder)'}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
