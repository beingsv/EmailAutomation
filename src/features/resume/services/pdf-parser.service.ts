/**
 * PDF Parser Service
 * Extracts text content from PDF buffers using unpdf (serverless-compatible).
 */

export interface PdfParseResult {
  text: string;
  numPages: number;
}

/**
 * Extracts text content from a PDF buffer.
 * Uses unpdf which works in serverless environments (no DOMMatrix needed).
 * @param buffer - The PDF file as a Buffer
 * @returns Parsed result with extracted text and page count
 * @throws Error if PDF parsing fails entirely
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<PdfParseResult> {
  const { extractText, getDocumentProxy } = await import('unpdf');

  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });

  return {
    text: (text as string).trim(),
    numPages: totalPages,
  };
}
