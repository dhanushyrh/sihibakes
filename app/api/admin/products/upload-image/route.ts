import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  compressProductImage,
  ensureProductImagesBucket,
  productImageObjectPath,
  productImagePublicUrl,
  validateProductImage,
} from "@/lib/product-images";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }

  const validationError = validateProductImage(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    await ensureProductImagesBucket(admin);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not prepare image storage";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const path = productImageObjectPath("webp");
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  let buffer: Buffer;
  try {
    buffer = await compressProductImage(rawBuffer);
  } catch {
    return NextResponse.json(
      { error: "Could not process image. Try a different photo." },
      { status: 400 }
    );
  }

  const { error: uploadError } = await admin.storage
    .from("product-images")
    .upload(path, buffer, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message || "Upload failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: productImagePublicUrl(admin, path),
    path,
  });
}
