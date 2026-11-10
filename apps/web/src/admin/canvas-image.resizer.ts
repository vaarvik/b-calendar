import type { ImageResizer } from './admin.ports';

/** Draws the image on a canvas no bigger than `maxSide` and exports a JPEG. */
export class CanvasImageResizer implements ImageResizer {
  public async resize(file: Blob, maxSide: number): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (context === null) {
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob ?? file);
        },
        'image/jpeg',
        0.86,
      );
    });
  }
}
