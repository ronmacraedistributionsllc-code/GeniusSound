import { describe, expect, it } from 'vitest';
import { ImageValidationError, validateImage } from './image-file';

describe('validateImage', () => {
  it('accepts PNG and JPEG signatures', () => {
    expect(validateImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0])).ext).toBe('png');
    expect(validateImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])).ext).toBe('jpg');
  });
  it('rejects other content, even with an image extension elsewhere', () => {
    expect(() => validateImage(new Uint8Array([0x3c, 0x73, 0x76, 0x67, 0x3e]))).toThrow(ImageValidationError);
    expect(() => validateImage(new Uint8Array())).toThrow(/empty/);
  });
});
