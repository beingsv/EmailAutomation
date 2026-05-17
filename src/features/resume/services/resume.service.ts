/**
 * Resume Service
 * Handles resume upload, validation, text extraction, storage, and retrieval.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/shared/lib/db';
import { extractTextFromPdf } from './pdf-parser.service';
import type { ResumeResult } from '../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MIN_TEXT_LENGTH = 50; // Minimum chars to consider valid text extraction
const PDF_MAGIC_BYTES = Buffer.from('%PDF');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * Validates that the buffer starts with PDF magic bytes (%PDF).
 */
function isPdfFile(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return buffer.subarray(0, 4).equals(PDF_MAGIC_BYTES);
}

/**
 * Ensures the upload directory exists for a given user.
 */
async function ensureUploadDir(userId: string): Promise<string> {
  const userDir = path.join(UPLOADS_DIR, userId);
  await fs.mkdir(userDir, { recursive: true });
  return userDir;
}

/**
 * Uploads a resume: validates file, extracts text, stores file and DB record.
 * On re-upload, deletes the previous resume file and DB record first.
 *
 * @param userId - The authenticated user's ID
 * @param file - The PDF file buffer
 * @param filename - The original filename
 * @returns ResumeResult with success status and extracted text or error code
 */
export async function uploadResume(
  userId: string,
  file: Buffer,
  filename: string
): Promise<ResumeResult> {
  // Validate file type (check magic bytes)
  if (!isPdfFile(file)) {
    return { success: false, error: 'INVALID_TYPE' };
  }

  // Validate file size
  if (file.length > MAX_FILE_SIZE) {
    return { success: false, error: 'SIZE_EXCEEDED' };
  }

  // Extract text from PDF
  let extractedText: string;
  try {
    const parseResult = await extractTextFromPdf(file);
    extractedText = parseResult.text;
  } catch (err) {
    console.error('[Resume Service] PDF extraction failed:', err);
    return { success: false, error: 'EXTRACTION_FAILED' };
  }

  // Check for low text content (image-based/scanned PDFs)
  if (extractedText.length < MIN_TEXT_LENGTH) {
    return {
      success: false,
      error: 'LOW_TEXT_CONTENT',
      characterCount: extractedText.length,
    };
  }

  // Delete existing resume if present (re-upload replaces previous)
  await deleteResume(userId);

  // Store file on disk
  const userDir = await ensureUploadDir(userId);
  const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(userDir, safeFilename);
  await fs.writeFile(filePath, file);

  // Store record in database
  await prisma.resume.create({
    data: {
      userId,
      filename,
      filePath,
      extractedText,
      characterCount: extractedText.length,
    },
  });

  return {
    success: true,
    extractedText,
    characterCount: extractedText.length,
  };
}

/**
 * Retrieves the extracted text for a user's resume.
 *
 * @param userId - The authenticated user's ID
 * @returns The extracted text or null if no resume exists
 */
export async function getResumeText(userId: string): Promise<string | null> {
  const resume = await prisma.resume.findUnique({
    where: { userId },
    select: { extractedText: true },
  });
  return resume?.extractedText ?? null;
}

/**
 * Deletes a user's resume (both file on disk and DB record).
 *
 * @param userId - The authenticated user's ID
 */
export async function deleteResume(userId: string): Promise<void> {
  const resume = await prisma.resume.findUnique({
    where: { userId },
  });

  if (!resume) return;

  // Delete file from disk (ignore errors if file doesn't exist)
  try {
    await fs.unlink(resume.filePath);
  } catch {
    // File may already be deleted or moved — continue with DB cleanup
  }

  // Delete DB record
  await prisma.resume.delete({
    where: { userId },
  });
}
