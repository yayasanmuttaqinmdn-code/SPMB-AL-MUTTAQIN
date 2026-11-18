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
