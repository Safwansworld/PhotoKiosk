"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { ChevronUp, ChevronDown, Camera, RotateCw, CheckCircle2 } from "lucide-react"
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

// Singleton pattern to prevent multiple TF Lite delegate creations
let faceLandmarkerSingleton: FaceLandmarker | null = null;
let initModelPromise: Promise<FaceLandmarker> | null = null;

const getFaceLandmarker = async (): Promise<FaceLandmarker> => {
  if (faceLandmarkerSingleton) return faceLandmarkerSingleton;

  if (!initModelPromise) {
    initModelPromise = (async () => {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      )
      const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1
      })
      faceLandmarkerSingleton = landmarker;
      return landmarker;
    })();
  }

  return initModelPromise;
};

interface CaptureScreenProps {
  onCapture: (imageUrl: string) => void
  onBack: () => void
  language: "ENG" | "MAL"
}

export function CaptureScreen({
  onCapture,
  onBack,
  language,
}: CaptureScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [tiltAngle, setTiltAngle] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [faceLevelStatus, setFaceLevelStatus] = useState<"unknown" | "level" | "tilt-left" | "tilt-right">("unknown")
  const [modelLoaded, setModelLoaded] = useState(false)

  const content = {
    ENG: {
      alignGuide: "Align Eyes Here",
      tiltUp: "Tilt Up",
      tiltDown: "Tilt Down",
      capture: "CAPTURE",
      preparing: "Preparing...",
      tiltHeadLeft: "Tilt Right",
      tiltHeadRight: "Tilt Left",
      perfect: "Perfect!",
      loadingAI: "Initializing AI...",
    },
    MAL: {
      alignGuide: "കണ്ണുകൾ ഇവിടെ ക്രമീകരിക്കുക",
      tiltUp: "മുകളിലേക്ക്",
      tiltDown: "താഴേക്ക്",
      capture: "ക്യാപ്ചർ",
      preparing: "തയ്യാറാക്കുന്നു...",
      tiltHeadLeft: "ഇടത്തോട്ട് ചരിക്കുക",
      tiltHeadRight: "വലത്തോട്ട് ചരിക്കുക",
      perfect: "ശരിയാണ്!",
      loadingAI: "AI ലോഡ് ചെയ്യുന്നു...",
    },
  }

  const t = content[language]

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user",
          },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCameraReady(true)
        }
      } catch (error) {
        console.log("[v0] Camera access error:", error)
        // Use placeholder for demo
        setCameraReady(true)
      }
    }

    initCamera()

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [])


  // Initialize and run Face Detection
  useEffect(() => {
    if (!cameraReady || !videoRef.current) return

    let isCanceled = false
    let animationId: number
    let localLandmarker: FaceLandmarker | null = null

    const setupFaceLandmarker = async () => {
      try {
        if (isCanceled) return

        localLandmarker = await getFaceLandmarker();

        if (isCanceled) return

        setModelLoaded(true)
        detectLoop()
      } catch (err) {
        if (!isCanceled) {
          console.error("Failed to load face landmarker:", err)
        }
      }
    }

    let lastVideoTime = -1

    const detectLoop = () => {
      if (isCanceled) return

      if (videoRef.current && localLandmarker) {
        try {
          // Check if video is ready (HAVE_CURRENT_DATA = 2)
          if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
            const videoTime = videoRef.current.currentTime

            if (videoTime !== lastVideoTime) {
              lastVideoTime = videoTime
              const startTimeMs = performance.now()
              const results = localLandmarker.detectForVideo(videoRef.current, startTimeMs)

              if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0]
                // Left Eye Iris: 468, Right Eye Iris: 473
                const leftEye = landmarks[468]
                const rightEye = landmarks[473]

                // Calculate vertical difference
                const dy = rightEye.y - leftEye.y

                // If dy is positive, Right Eye is Lower (User tilted Right).
                // If dy is negative, Right Eye is Higher (User tilted Left).

                const threshold = 0.02

                if (dy > threshold) {
                  setFaceLevelStatus("tilt-left")
                } else if (dy < -threshold) {
                  setFaceLevelStatus("tilt-right")
                } else {
                  setFaceLevelStatus("level")
                }
              } else {
                setFaceLevelStatus("unknown")
              }
            }
          }
        } catch (error) {
          console.warn("Detection error:", error)
        }
      }
      animationId = requestAnimationFrame(detectLoop)
    }

    setupFaceLandmarker()

    return () => {
      isCanceled = true
      cancelAnimationFrame(animationId)
      // Do NOT close the landmarker as it is a singleton
    }
  }, [cameraReady])

  const handleCapture = useCallback(() => {
    setIsCapturing(true)
    setCountdown(3)

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countdownInterval)
          // Capture the frame
          if (canvasRef.current && videoRef.current) {
            const canvas = canvasRef.current
            const video = videoRef.current
            canvas.width = video.videoWidth || 1920
            canvas.height = video.videoHeight || 1080
            const ctx = canvas.getContext("2d")
            if (ctx) {
              ctx.drawImage(video, 0, 0)
              const imageUrl = canvas.toDataURL("image/jpeg", 0.95)
              setTimeout(() => {
                onCapture(imageUrl)
              }, 500)
            }
          } else {
            // Demo: use a placeholder image
            setTimeout(() => {
              onCapture("/api/placeholder/600/800")
            }, 500)
          }
          return null
        }
        return prev ? prev - 1 : null
      })
    }, 1000)
  }, [onCapture])

  const handleTilt = (direction: "up" | "down") => {
    setTiltAngle((prev) => {
      const newAngle = direction === "up" ? prev + 5 : prev - 5
      return Math.max(-15, Math.min(15, newAngle))
    })
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black pb-24">
      {/* Camera Feed / Simulated View */}
      <div
        className="relative h-full w-full transition-transform duration-300"
        style={{ transform: `perspective(1000px) rotateX(${tiltAngle}deg)` }}
      >
        {/* Simulated camera feed background for demo */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e293b] via-[#334155] to-[#1e293b]" />

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Face Alignment Oval Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`relative flex h-[420px] w-[320px] items-center justify-center rounded-[50%] border-[4px] transition-colors duration-300 ${faceLevelStatus === 'level' ? 'border-green-500 border-solid shadow-[0_0_20px_rgba(34,197,94,0.5)]' :
              faceLevelStatus === 'unknown' ? 'border-white/80 border-dashed' :
                'border-yellow-400 border-solid shadow-[0_0_20px_rgba(250,204,21,0.5)]'
              }`}
            style={{
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
            }}
          >
            {/* Countdown Display */}
            {countdown !== null && (
              <div className="absolute flex h-32 w-32 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <span className="text-7xl font-bold text-white">{countdown}</span>
              </div>
            )}
          </div>
        </div>

        {/* Eye Level Guide Line */}
        <div className="absolute left-1/2 top-[38%] -translate-x-1/2">
          <div className="h-0.5 w-48 bg-[#2563EB]/60" />
        </div>
      </div>

      {/* Top HUD - Level Guide */}
      <div className="absolute left-1/2 top-8 -translate-x-1/2 z-20">
        <div className={`glass flex items-center gap-3 rounded-full px-6 py-3 soft-shadow transition-colors duration-300 ${faceLevelStatus === 'level' ? 'bg-green-100/90 border-2 border-green-500' :
          faceLevelStatus === 'unknown' ? 'bg-white/40 backdrop-blur-md' :
            'bg-yellow-100/90 border-2 border-yellow-500'
          }`}>
          {faceLevelStatus === 'level' ? <CheckCircle2 className="h-6 w-6 text-green-600" /> :
            faceLevelStatus === 'unknown' ? <div className="h-3 w-3 animate-pulse rounded-full bg-[#2563EB]" /> :
              <RotateCw className={`h-6 w-6 text-yellow-600 transition-transform duration-300 ${faceLevelStatus === 'tilt-right' ? '-scale-x-100' : ''}`} />}

          <span className={`text-lg font-bold ${faceLevelStatus === 'level' ? 'text-green-800' :
            faceLevelStatus === 'unknown' ? 'text-[#0F172A]' :
              'text-yellow-800'
            }`}>
            {faceLevelStatus === 'level' ? t.perfect :
              faceLevelStatus === 'tilt-left' ? t.tiltHeadLeft :
                faceLevelStatus === 'tilt-right' ? t.tiltHeadRight :
                  modelLoaded ? t.alignGuide : t.loadingAI}
          </span>
        </div>
      </div>

      {/* Bottom Control Bar - Frosted Glass */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
        <div className="glass flex items-center gap-8 rounded-3xl px-8 py-4 soft-shadow">
          {/* Tilt Up Button */}
          <button
            onClick={() => handleTilt("up")}
            disabled={isCapturing}
            className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl px-4 text-[#0F172A] transition-all hover:bg-[#F3F4F6] active:scale-95 disabled:opacity-50"
            aria-label={t.tiltUp}
          >
            <ChevronUp className="h-6 w-6" />
            <span className="text-xs font-medium">{t.tiltUp}</span>
          </button>

          {/* Capture Shutter Button */}
          <button
            onClick={handleCapture}
            disabled={isCapturing || !cameraReady}
            className="group relative flex h-[120px] w-[120px] items-center justify-center rounded-full bg-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            aria-label={t.capture}
          >
            {/* Outer Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-[#0F172A]" />

            {/* Pulse Animation Ring */}
            {!isCapturing && cameraReady && (
              <div className="absolute inset-0 rounded-full border-4 border-[#2563EB] animate-pulse-ring" />
            )}

            {/* Inner Button */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#0F172A] transition-colors group-hover:bg-[#2563EB]">
              <Camera className="h-10 w-10 text-white" />
            </div>

            {/* Capture Label */}
            <span className="absolute -bottom-8 text-sm font-bold text-[#0F172A]">
              {cameraReady ? t.capture : t.preparing}
            </span>
          </button>

          {/* Tilt Down Button */}
          <button
            onClick={() => handleTilt("down")}
            disabled={isCapturing}
            className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl px-4 text-[#0F172A] transition-all hover:bg-[#F3F4F6] active:scale-95 disabled:opacity-50"
            aria-label={t.tiltDown}
          >
            <ChevronDown className="h-6 w-6" />
            <span className="text-xs font-medium">{t.tiltDown}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
