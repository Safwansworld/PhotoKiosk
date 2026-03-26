import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json()

    const body = razorpay_order_id + "|" + razorpay_payment_id

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(body.toString())
      .digest("hex")

    const isAuthentic = expectedSignature === razorpay_signature

    if (isAuthentic) {
      // Update logs as captured
      await supabase.from("payment_logs").update({ 
        status: "captured", 
        razorpay_payment_id: razorpay_payment_id 
      }).eq("razorpay_order_id", razorpay_order_id)

      return NextResponse.json(
        { message: "Payment verified successfully" },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error verifying payment:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to verify payment" },
      { status: 500 }
    )
  }
}
