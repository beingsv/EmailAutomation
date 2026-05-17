/**
 * PDF Parser Service
 * Extracts text content from PDF buffers using pdf-parse v2.
 */

import { PDFParse } from 'pdf-parse';
import { join } from 'path';

export interface PdfParseResult {
  text: string;
  numPages: number;
}

let workerInitialized = false;

function ensureWorker() {
  if (workerInitialized) return;
  workerInitialized = true;
  try {
    const workerPath = join(
      process.cwd(),
      'node_modules',
      'pdf-parse',
      'dist',
      'pdf-parse',
      'cjs',
      'pdf.worker.mjs'
    );
    PDFParse.setWorker(workerPath);
  } catch (err) {
    console.error('[PDF Parser] Failed to set worker:', err);
  }
}

/**
 * Extracts text content from a PDF buffer.
 * @param buffer - The PDF file as a Buffer
 * @returns Parsed result with extracted text and page count
 * @throws Error if PDF parsing fails entirely
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<PdfParseResult> {
  ensureWorker();

  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText({ pageJoiner: '' });
  await parser.destroy();

  return {
    text: result.text.trim(),
    numPages: result.total,
  };
}
