export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export class ImageValidationError extends Error {}

/** PNG or JPEG by file signature (not by filename). */
export function validateImage(data: Uint8Array): { mimeType: 'image/png' | 'image/jpeg'; ext: 'png' | 'jpg' } {
  if (data.length === 0) throw new ImageValidationError('File is empty');
  if (data.length > MAX_IMAGE_BYTES) throw new ImageValidationError('Image is too large (10 MB max)');
  if (data.length > 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return { mimeType: 'image/png', ext: 'png' };
  if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { mimeType: 'image/jpeg', ext: 'jpg' };
  throw new ImageValidationError('Only PNG and JPEG images are supported');
}
