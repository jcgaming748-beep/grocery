const MAX_DIMENSION = 400;
const JPEG_QUALITY = 0.75;

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Could not compress image.');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Could not compress image.'));
        }
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

export function blobToObjectUrl(blob: Blob | null): string | null {
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
