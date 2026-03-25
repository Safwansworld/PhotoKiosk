import { NextRequest, NextResponse } from "next/server"
import Replicate from "replicate"

export async function POST(req: NextRequest) {
    try {
        const { image, mask, prompt } = await req.json()

        if (!image) {
            return NextResponse.json(
                { error: "Image is required" },
                { status: 400 }
            )
        }

        const token = process.env.REPLICATE_API_TOKEN;

        // Check key
        if (!token) {
            console.error("❌ REPLICATE_API_TOKEN is missing in environment variables.");
            return NextResponse.json(
                { error: "Server Error: API Token Missing. Please restart the server." },
                { status: 500 }
            )
        }

        const replicate = new Replicate({
            auth: token,
        })

        // Default: Professional Business Suit
        const finalPrompt = prompt || "high quality photo of a man wearing a dark navy blue business suit, white shirt, tie, photorealistic, 8k, highly detailed, professional lighting"

        // Using Instruct-Pix2Pix (No mask required, follows instructions)
        let output;
        try {
            output = await replicate.run(
                "timbrooks/instruct-pix2pix:30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f",
                {
                    input: {
                        prompt: `make him wear ${finalPrompt}`,
                        image: image,
                        num_inference_steps: 20,
                        image_guidance_scale: 1.5,
                        guidance_scale: 7.5,
                    }
                }
            );
        } catch (runError: any) {
            console.error("Replicate API Error:", runError);

            // Check for Insufficient Credit (402)
            if (runError.toString().includes("402") || runError.message?.includes("Insufficient credit")) {
                console.warn("⚠️ Insufficient credits. Returning MOCK response for demo.");
                // Return a mock success response so the UI flow continues
                // We'll return the input image itself or a sample result if possible.
                // For a suit demo, let's return a sample "Suit Result" image if we had one, 
                // but re-returning the input image allows the flow to complete (even if the suit didn't change).
                return NextResponse.json({
                    output: [image],
                    mock: true,
                    message: "Insufficient Credits: Showing original image as placeholder."
                });
            }
            throw runError; // Re-throw other errors
        }

        return NextResponse.json({ output })
    } catch (error: any) {
        console.error("AI Error:", error)
        return NextResponse.json(
            { error: error?.message || "Failed to generate image" },
            { status: 500 }
        )
    }
}
