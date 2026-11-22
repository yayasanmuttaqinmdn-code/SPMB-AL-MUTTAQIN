import type { FormSchemaConfig, ProfileGalleryConfig } from '../types/spmb.ts';
import {
  CLOUD_CONFIG_CELL_MAX_CHARS,
  estimateCloudConfigEnvelopeChars,
  normalizeProfileGalleryConfig,
} from './spmbLogic.ts';

/**
 * Client-side utility to process an uploaded image file into a standardized
 * 3x4 portrait JPEG Data URL (240x320 px) for lightweight storage and crisp PDF/UI rendering.
 */
export async function processPasFoto3x4File(file: File): Promise<string> {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error('Format foto harus berupa JPG, PNG, atau WebP.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Ukuran file foto maksimal 10 MB.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file gambar.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('File yang dipilih bukan gambar yang valid.'));
    image.src = rawDataUrl;
  });

  const targetWidth = 240;
  const targetHeight = 320; // exact 3:4 portrait ratio
  const targetRatio = targetWidth / targetHeight;

  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;
  if (!srcWidth || !srcHeight) {
    throw new Error('Dimensi gambar tidak terbaca.');
  }

  const srcRatio = srcWidth / srcHeight;
  let cropX = 0;
  let cropY = 0;
  let cropW = srcWidth;
  let cropH = srcHeight;

  if (srcRatio > targetRatio) {
    // Source is wider than 3:4 -> crop sides symmetrically
    cropW = Math.round(srcHeight * targetRatio);
    cropX = Math.round((srcWidth - cropW) / 2);
  } else if (srcRatio < targetRatio) {
    // Source is taller than 3:4 -> bias slightly upward so head/face stays centered
    cropH = Math.round(srcWidth / targetRatio);
    cropY = Math.round((srcHeight - cropH) * 0.25);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser tidak mendukung pemrosesan gambar kanvas.');
  }

  // White background for transparent PNGs
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL('image/jpeg', 0.84);
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('File yang dipilih bukan gambar yang valid.'));
    image.src = src;
  });
}

function encodeCanvasCompact(
  canvas: HTMLCanvasElement,
  webpQuality: number,
  jpegQuality: number
): string {
  const jpegUrl = canvas.toDataURL('image/jpeg', jpegQuality);
  try {
    const webpUrl = canvas.toDataURL('image/webp', webpQuality);
    if (webpUrl.startsWith('data:image/webp;') && webpUrl.length < jpegUrl.length) {
      return webpUrl;
    }
  } catch {
    // Fallback to JPEG when WebP is unavailable
  }
  return jpegUrl;
}

function drawLandscapeCrop(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const targetRatio = targetWidth / targetHeight;
  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;
  if (!srcWidth || !srcHeight) {
    throw new Error('Dimensi gambar tidak terbaca.');
  }

  const srcRatio = srcWidth / srcHeight;
  let cropX = 0;
  let cropY = 0;
  let cropW = srcWidth;
  let cropH = srcHeight;

  if (srcRatio > targetRatio) {
    cropW = Math.round(srcHeight * targetRatio);
    cropX = Math.round((srcWidth - cropW) / 2);
  } else if (srcRatio < targetRatio) {
    cropH = Math.round(srcWidth / targetRatio);
    cropY = Math.round((srcHeight - cropH) * 0.35);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser tidak mendukung pemrosesan gambar kanvas.');
  }

  ctx.fillStyle = '#F2F4F2';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetWidth, targetHeight);
  return canvas;
}

/**
 * Client-side utility to optimize an uploaded institution profile photo into a crisp,
 * compact 16:10 landscape WebP/JPEG Data URL for smooth slideshow playback and cross-device cloud sync.
 */
export async function processProfileBannerPhotoFile(file: File): Promise<string> {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error('Format foto harus berupa JPG, PNG, atau WebP.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Ukuran file foto maksimal 15 MB.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file gambar.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

  const img = await loadHtmlImage(rawDataUrl);
  const canvas = drawLandscapeCrop(img, 640, 400);
  return encodeCanvasCompact(canvas, 0.74, 0.72);
}

/**
 * Ensures the combined FormSchemaConfig + ProfileGalleryConfig JSON payload fits safely
 * inside Google Sheets' 50,000-character cell limit (Konfigurasi_Form!B1) so uploaded photos
 * synchronize identically across every device without requiring manual Apps Script changes.
 */
export async function fitProfileGalleryToCloudBudget(
  gallery: ProfileGalleryConfig,
  formConfig: FormSchemaConfig,
  maxTotalChars = CLOUD_CONFIG_CELL_MAX_CHARS
): Promise<ProfileGalleryConfig> {
  const normalized = normalizeProfileGalleryConfig(gallery);
  if (estimateCloudConfigEnvelopeChars(formConfig, normalized) <= maxTotalChars) {
    return normalized;
  }

  const inlineIndices = normalized.slides
    .map((s, idx) => (s.imageUrl.startsWith('data:image/') ? idx : -1))
    .filter((idx) => idx >= 0);

  if (inlineIndices.length === 0) {
    throw new Error(
      'Ukuran data galeri foto melebihi batas penyimpanan cloud Google Spreadsheet. Kurangi jumlah foto atau perpendek keterangannya.'
    );
  }

  const loadedImages = new Map<number, HTMLImageElement>();
  for (const idx of inlineIndices) {
    loadedImages.set(idx, await loadHtmlImage(normalized.slides[idx].imageUrl));
  }

  const compressionTiers: Array<{ w: number; h: number; webpQ: number; jpegQ: number }> = [
    { w: 560, h: 350, webpQ: 0.68, jpegQ: 0.64 },
    { w: 480, h: 300, webpQ: 0.62, jpegQ: 0.58 },
    { w: 420, h: 263, webpQ: 0.56, jpegQ: 0.52 },
    { w: 360, h: 225, webpQ: 0.50, jpegQ: 0.46 },
    { w: 320, h: 200, webpQ: 0.44, jpegQ: 0.40 },
    { w: 280, h: 175, webpQ: 0.38, jpegQ: 0.34 },
  ];

  for (const tier of compressionTiers) {
    const nextSlides = normalized.slides.map((slide, idx) => {
      const img = loadedImages.get(idx);
      if (!img) return slide;
      const canvas = drawLandscapeCrop(img, tier.w, tier.h);
      const compactUrl = encodeCanvasCompact(canvas, tier.webpQ, tier.jpegQ);
      return { ...slide, imageUrl: compactUrl };
    });

    const candidate: ProfileGalleryConfig = {
      ...normalized,
      slides: nextSlides,
    };

    if (estimateCloudConfigEnvelopeChars(formConfig, candidate) <= maxTotalChars) {
      return candidate;
    }
  }

  throw new Error(
    `Total ukuran ${inlineIndices.length} foto unggahan langsung melebihi kapasitas sinkronisasi cloud Google Spreadsheet. Gunakan 2–5 foto unggahan langsung, atau simpan foto di Google Drive lalu masukkan lewat menu "Tambah via Link URL Foto" agar muat hingga 10 foto kualitas HD lintas semua perangkat.`
  );
}

