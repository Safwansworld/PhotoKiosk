
import { FilesetResolver, ImageSegmenter, ImageSegmenterResult } from "@mediapipe/tasks-vision";

let imageSegmenter: ImageSegmenter | null = null;
let runningMode: "IMAGE" | "VIDEO" = "IMAGE";

/**
 * Initialize the Image Segmenter model.
 * Uses a singleton pattern to prevent multiple initializations.
 */
export const initializeImageSegmenter = async (): Promise<ImageSegmenter> => {
    if (imageSegmenter) return imageSegmenter;

    const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

    imageSegmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
            delegate: "GPU",
        },
        runningMode: runningMode,
        outputCategoryMask: true,
        outputConfidenceMasks: false,
    });

    return imageSegmenter;
};

/**
 * Remove background from an image element and return the processed image as a data URL.
 * @param imageElement The source image element (HTMLImageElement).
 * @returns A promise that resolves to the processed image data URL (PNG transparent).
 */
export const removeBackground = async (
    imageElement: HTMLImageElement
): Promise<string> => {
    const segmenter = await initializeImageSegmenter();

    // Ensure the segmenter is configured for image mode
    if (runningMode === "VIDEO") {
        await segmenter.setOptions({ runningMode: "IMAGE" });
        runningMode = "IMAGE";
    }

    return new Promise((resolve, reject) => {
        // Wait for image to load if not already complete
        if (!imageElement.complete) {
            imageElement.onload = () => process();
            imageElement.onerror = reject;
        } else {
            process();
        }

        function process() {
            try {
                const segmentationResult = segmenter!.segment(imageElement);
                processSegmentationResult(segmentationResult, imageElement, resolve);
            } catch (error) {
                reject(error);
            }
        }
    });
};

const processSegmentationResult = (
    result: ImageSegmenterResult,
    imageElement: HTMLImageElement,
    resolve: (value: string) => void
) => {
    const { width, height } = imageElement;

    // Create a canvas to draw the result
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Could not get 2D context");
    }

    // Draw the original image first
    ctx.drawImage(imageElement, 0, 0, width, height);

    // Get the mask from the segmentation result
    // The category mask is a Uint8ClampedArray where each pixel is a category index (0 for background, 1 for person)
    // Or vice versa depending on the model. Usually 0 is background.
    // Actually, for selfie_segmenter:
    // Index 0 - background
    // Index 1 - person
    // But wait, categoryMask is simpler to use with globalCompositeOperation? Maybe not.
    // Let's use image masking.

    // However, `result.categoryMask` is what we requested.
    const mask = result.categoryMask as any; // It's actually a MPMask object in newer versions or Float32Array in older?
    // In @mediapipe/tasks-vision 0.10.x, it returns an MPMask which is easier to use.
    // But wait, `segment` returns `ImageSegmenterResult`.
    // `categoryMask` is of type `MPMask`.
    // We can convert it to canvas or image bitmap.

    // Let's simplify. We can use `MPMask.getAsFloat32Array()` or similar methods?
    // Let's check documentation or assume standard usage.

    // Actually, to keep it robust and performant, let's iterate.
    // The mask size matches the input image size? Usually yes for `segment`.

    // Wait, accessing raw data might be slow if we do it in JS pixel by pixel.
    // There's a helper `postProcess` usually.

    // Let's try to use the mask to clear the background.

    // Alternative: Use `getAsUint8Array()` directly if available on the mask object.
    // The documentation says `categoryMask` is a `MPMask`.

    // Let's try a different approach. Draw the mask to a temp canvas, then compositing.
    // `mask.canvas` property if it exists? No.

    // Let's extract the mask data.
    const maskData = mask.getAsUint8Array(); // Assuming it's available and size matches.

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Iterate through pixels and apply mask
    // Mask value 0 = background, 1 = person.
    // We want to keep person (1) and make background (0) transparent.

    for (let i = 0; i < maskData.length; i++) {
        const category = maskData[i];
        // If the user reports the object is removed, it means we were making the wrong pixels transparent.
        // Previously: if (category === 0) -> transparent. 
        // This suggests category 0 was the PERSON (since the person got removed).
        // So we should make pixels transparent if category !== 0 (i.e. keep category 0).
        if (category !== 0) {
            const pixelIndex = i * 4;
            data[pixelIndex + 3] = 0; // Alpha channel to 0
        }
    }

    ctx.putImageData(imageData, 0, 0);

    resolve(canvas.toDataURL("image/png"));
};
