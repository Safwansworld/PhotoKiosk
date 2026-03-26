import { NextResponse } from "next/server"
import Razorpay from "razorpay"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const { amount, sessionId } = await req.json()

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Razorpay credentials not found" },
        { status: 500 }
      )
    }

    const instance = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const options = {
      amount: amount * 100, // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    }

    const order = await instance.orders.create(options)

    if (sessionId) {
      // Record order tracking
      await supabase.from("kiosk_sessions").update({ razorpay_order_id: order.id }).eq("id", sessionId)
      
      await supabase.from("payment_logs").insert({
        session_id: sessionId,
        razorpay_order_id: order.id,
        status: "created",
        amount: amount,
        raw_response: order
      })
    }

    return NextResponse.json(order)
  } catch (error: any) {
    console.error("Error creating razorpay order:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to create order" },
      { status: 500 }
    )
  }
}
