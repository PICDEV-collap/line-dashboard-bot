import { getSupabaseClient } from "@/lib/services/supabase.service";
import { withRetry } from "@/lib/utils/retry";
import { createLogger } from "@/lib/middleware/logger";
import { sanitizeFilename, getCurrentTimestamp } from "@/lib/utils/helpers";

const logger = createLogger("StorageService");
const BUCKET = "line-files";

export interface UploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  webContentLink: string;
  size: number;
  mimeType: string;
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  subFolder?: string
): Promise<UploadResult> {
  logger.info("Uploading file to Supabase Storage", {
    fileName,
    mimeType,
    size: buffer.length,
  });

  const sanitized = sanitizeFilename(fileName);
  const path = subFolder ? `${subFolder}/${sanitized}` : sanitized;

  return withRetry(async () => {
    const db = getSupabaseClient();

    const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) throw new Error(`Storage upload error: ${error.message}`);

    const {
      data: { publicUrl },
    } = db.storage.from(BUCKET).getPublicUrl(path);

    logger.info("File uploaded", { path, publicUrl });

    return {
      fileId: path,
      fileName: sanitized,
      webViewLink: publicUrl,
      webContentLink: publicUrl,
      size: buffer.length,
      mimeType,
    };
  });
}

export async function uploadImage(
  buffer: Buffer,
  userId: string,
  messageId: string
): Promise<UploadResult> {
  const ts = getCurrentTimestamp().replace(/[:.]/g, "-");
  return uploadFile(buffer, `image_${userId}_${messageId}_${ts}.jpg`, "image/jpeg", "images");
}

export async function uploadPdf(
  buffer: Buffer,
  userId: string,
  originalName: string,
  messageId: string
): Promise<UploadResult> {
  const ts = getCurrentTimestamp().replace(/[:.]/g, "-");
  const ext = originalName.split(".").pop() ?? "bin";
  return uploadFile(buffer, `file_${userId}_${messageId}_${ts}.${ext}`, "application/pdf", "documents");
}

export async function deleteFile(fileId: string): Promise<void> {
  logger.info("Deleting file from Storage", { fileId });
  const db = getSupabaseClient();
  const { error } = await db.storage.from(BUCKET).remove([fileId]);
  if (error) throw new Error(`Storage delete error: ${error.message}`);
}

export async function getFileMetadata(fileId: string) {
  const db = getSupabaseClient();
  const {
    data: { publicUrl },
  } = db.storage.from(BUCKET).getPublicUrl(fileId);
  return { id: fileId, webViewLink: publicUrl };
}
