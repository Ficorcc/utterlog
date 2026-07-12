import { describe, expect, test } from 'bun:test';
import sharp from 'sharp';
import { optimizeBrandingLogo } from '../src/media/branding';

describe('branding logo optimization', () => {
  test('converts and proportionally constrains wide images to 512px', async () => {
    const input = await sharp({
      create: { width: 1024, height: 256, channels: 4, background: '#336699' },
    }).png().toBuffer();

    const result = await optimizeBrandingLogo(input, 'png');
    const metadata = await sharp(result.bytes).metadata();

    expect(result.ext).toBe('webp');
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(128);
    expect(result.bytes.length).toBeLessThan(input.length);
  });

  test('does not enlarge an already small logo', async () => {
    const input = await sharp({
      create: { width: 128, height: 64, channels: 4, background: '#ffffff00' },
    }).png().toBuffer();

    const result = await optimizeBrandingLogo(input, 'png');
    expect(result.width).toBe(128);
    expect(result.height).toBe(64);
  });

  test('rejects files that are not valid images', async () => {
    await expect(optimizeBrandingLogo(Buffer.from('not-an-image'), 'png')).rejects.toThrow();
  });
});
