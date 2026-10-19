import { supabase } from '../src/supabase';
import { STORAGE_BUCKET } from '../src/storageConfig';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function getFriendlyUploadError(error) {
  const message = (error?.message || '').toLowerCase();

  if (message.includes('bucket') && message.includes('not found')) {
    return "Photo upload isn't set up yet. Please contact the admin.";
  }

  if (message.includes('row level security') || message.includes('permission') || message.includes('policy')) {
    return "You don't have permission to upload photos.";
  }

  if (message.includes('too large') || message.includes('exceeds') || message.includes('size')) {
    return 'Image must be under 5MB.';
  }

  if (message.includes('image') && (message.includes('type') || message.includes('format'))) {
    return 'Please choose a valid image file.';
  }

  return 'Photo upload failed. Your report can still be saved without a photo.';
}

export function getStoragePathFromPublicUrl(publicUrl) {
  if (!publicUrl) return null;

  const marker = `/${STORAGE_BUCKET}/`;
  const urlIndex = publicUrl.indexOf(marker);

  if (urlIndex === -1) {
    return null;
  }

  const path = publicUrl.slice(urlIndex + marker.length);
  return decodeURIComponent(path);
}

export async function resizeImageFile(file, { maxWidth = 800, quality = 0.8 } = {}) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  if (file.size <= MAX_IMAGE_SIZE_BYTES && file.type !== 'image/svg+xml') {
    const image = await new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to process the selected image.'));
      };

      img.src = objectUrl;
    });

    const maxDimension = Math.max(image.width, image.height);

    if (maxDimension <= maxWidth) {
      return file;
    }

    const canvas = document.createElement('canvas');
    const scale = maxWidth / maxDimension;
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));

    if (!blob) {
      return file;
    }

    const extension = outputType === 'image/png' ? '.png' : '.jpg';

    return new File([blob], file.name.replace(/\.[^.]+$/, '') + extension, {
      type: outputType,
      lastModified: Date.now(),
    });
  }

  return file;
}

export async function uploadImage(file) {
  if (!file) {
    return null;
  }

  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file.');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image must be 5MB or smaller.');
  }

  const resizedFile = await resizeImageFile(file);
  const extension = (resizedFile.name.split('.').pop() || 'jpg').toLowerCase();
  const fileName = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, resizedFile, {
      contentType: resizedFile.type || 'image/jpeg',
      upsert: false,
    });

  if (error) {
    console.error('Supabase Storage upload error:', error);
    throw new Error(getFriendlyUploadError(error));
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

  if (!data?.publicUrl) {
    throw new Error('Image URL could not be generated.');
  }

  return data.publicUrl;
}
