import jsQR from "jsqr";

/**
 * Try to decode a QR code from a still image (an uploaded file, a screenshot,
 * a photo of a screen). Returns the decoded string, or null if no QR is found.
 *
 * This is the still-image counterpart to QrScanner's live-camera loop: same
 * jsQR decode, but over an <img> drawn to a canvas instead of a video frame.
 * It lets the "Upload" path handle a QR screenshot (the no-camera phone-test
 * flow) without forcing the user onto live camera + HTTPS.
 *
 * Large photos are downscaled before decoding — jsQR slows quadratically with
 * pixel count, and a QR is detectable well below full-res. We also retry with
 * inversion on, since a screenshot of a light-on-dark QR can read inverted.
 */
const MAX_DECODE_WIDTH = 1000;

export async function decodeQrFromImage(
  file: File | Blob,
): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_DECODE_WIDTH / img.naturalWidth || 1);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);

    const code = jsQR(imageData.data, w, h, {
      inversionAttempts: "attemptBoth",
    });
    return code?.data ?? null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}
