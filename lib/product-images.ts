import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const PRODUCT_IMAGES_BUCKET = "product-images";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1200;
const WEBP_QUALITY = 82;

export function validateProductImage(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please upload an image file";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be under 5MB";
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return "Supported formats: JPG, PNG, WebP, GIF";
  }
  return null;
}

export function productImageObjectPath(extension = "webp"): string {
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
}

export async function compressProductImage(input: Buffer): Promise<Buffer> {
  return sharp(input, { animated: true })
    .rotate()
    .resize({
      width: MAX_IMAGE_DIMENSION,
      height: MAX_IMAGE_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

export async function ensureProductImagesBucket(
  admin: SupabaseClient
): Promise<void> {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) {
    throw new Error(error.message);
  }

  if (buckets?.some((bucket) => bucket.id === PRODUCT_IMAGES_BUCKET)) {
    return;
  }

  const { error: createError } = await admin.storage.createBucket(
    PRODUCT_IMAGES_BUCKET,
    {
      public: true,
      fileSizeLimit: MAX_IMAGE_BYTES,
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ],
    }
  );

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(createError.message);
  }
}

export function productImagePublicUrl(
  admin: SupabaseClient,
  path: string
): string {
  const { data } = admin.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
