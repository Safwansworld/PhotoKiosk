import { NextResponse } from "next/server"
import Razorpay from "razorpay"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const { orderId, sessionId } = await req.json()

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Missing Razorpay Credentials" }, { status: 500 })
    }

    const instance = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const payments = await instance.orders.fetchPayments(orderId)
    const validPayment = payments.items.find((p: any) => p.status === "captured" || p.status === "authorized")

    if (validPayment) {
      if (sessionId) {
        await supabase.from("kiosk_sessions").update({ payment_status: "completed" }).eq("id", sessionId)
        
        await supabase.from("payment_logs").insert({
          session_id: sessionId,
          razorpay_order_id: orderId,
          razorpay_payment_id: validPayment.id,
          status: validPayment.status,
          amount: Number(validPayment.amount) / 100,
          raw_response: validPayment
        })
      }
      return NextResponse.json({ status: "captured" })
    }

    return NextResponse.json({ status: "pending" })
  } catch (error: any) {
    console.error("Error checking razorpay payment:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to check payment status" },
      { status: 500 }
    )
  }
}
