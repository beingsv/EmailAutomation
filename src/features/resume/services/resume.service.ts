/**
 * Resume Service
 * Handles resume upload, validation, text extraction, and storage in database.
 * PDF files are stored as binary data in PostgreSQL (no filesystem dependency).
 */

import { prisma } from '@/shared/lib/db';
import { extractTextFromPdf } from './pdf-parser.service';
import type { ResumeResult } from '../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MIN_TEXT_LENGTH = 50; // Minimum chars to consider valid text extraction
const PDF_MAGIC_BYTES = Buffer.from('%PDF');

/**
 * Validates that the buffer starts with PDF magic bytes (%PDF).
 */
function isPdfFile(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return buffer.subarray(0, 4).equals(PDF_MAGIC_BYTES);
}

/**
 * Uploads a resume: validates file, extracts text, stores file data + text in DB.
 * On re-upload, deletes the previous DB record first.
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

  // Store record in database (PDF binary stored as fileData)
  await prisma.resume.create({
    data: {
      userId,
      filename,
      fileData: file,
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
 * Deletes a user's resume (DB record only, no filesystem).
 *
 * @param userId - The authenticated user's ID
 */
export async function deleteResume(userId: string): Promise<void> {
  const resume = await prisma.resume.findUnique({
    where: { userId },
  });

  if (!resume) return;

  await prisma.resume.delete({
    where: { userId },
  });
}
