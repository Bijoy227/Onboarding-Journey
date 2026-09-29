/**
 * Turns an uploaded image into a small thumbnail data URL.
 *
 * The demo keeps its whole database in localStorage, which holds a few
 * megabytes at most, so an upload is redrawn at `maxSize` pixels on its longer
 * side before it is stored. Redrawing through a canvas also means an SVG is
 * stored as plain pixels, never as markup.
 */

export class ImageFileError extends Error {}

/** Uploads bigger than this are refused before they are even decoded. */
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new ImageFileError("That file couldn't be read as an image."));
    image.src = url;
  });
}

export async function imageFileToThumbnail(
  file: File,
  maxSize = 256,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new ImageFileError(
      "Choose an image file: PNG, JPG, WebP, GIF or SVG.",
    );
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new ImageFileError("Choose an image smaller than 5 MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    // An SVG without width and height reports 0: draw it at full size.
    const width = image.naturalWidth || maxSize;
    const height = image.naturalHeight || maxSize;
    const scale = Math.min(1, maxSize / Math.max(width, height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new ImageFileError("This browser can't process images.");

    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // WebP keeps transparency and stays small. Browsers that can't encode it
    // return PNG instead, which is fine too.
    return canvas.toDataURL("image/webp", 0.9);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
