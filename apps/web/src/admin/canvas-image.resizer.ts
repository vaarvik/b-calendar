import type { ImageResizer } from './admin.ports';

/**
 * Draws the image on a canvas no bigger than `maxSide` and exports a JPEG. iPhone photos (HEIC)
 * that the browser cannot decode itself (Chrome, Firefox) go through libheif in WebAssembly,
 * loaded only when such a photo is picked.
 */
export class CanvasImageResizer implements ImageResizer {
  public async resize(file: Blob, maxSide: number): Promise<Blob> {
    const bitmap = await this.decode(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (context === null) {
      bitmap.close();
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

  private async decode(file: Blob): Promise<ImageBitmap> {
    try {
      return await createImageBitmap(file);
    } catch (error) {
      if (!this.isHeic(file)) {
        throw error;
      }
      const { heicTo } = await import('heic-to');
      return heicTo({ blob: file, type: 'bitmap' });
    }
  }

  private isHeic(file: Blob): boolean {
    const name = file instanceof File ? file.name : '';
    return /^image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(name);
  }
}
