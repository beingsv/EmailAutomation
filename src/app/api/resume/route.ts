/**
 * Resume API Route
 * GET - Retrieve resume text for authenticated user
 * POST - Upload a PDF resume (multipart form data)
 * DELETE - Remove the user's resume
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { uploadResume, getResumeText, deleteResume } from '@/features/resume/services/resume.service';
import { AppError, handleApiError } from '@/shared/lib/errors';

/**
 * GET /api/resume
 * Returns the extracted text for the authenticated user's resume.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    const text = await getResumeText(session.user.id);

    if (!text) {
      return NextResponse.json(
        { resumeText: null, message: 'No resume uploaded' },
        { status: 200 }
      );
    }

    return NextResponse.json({ resumeText: text }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/resume
 * Uploads a PDF resume via multipart form data.
 * Expects a form field named "file" containing the PDF.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'No file provided',
        statusCode: 400,
      });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadResume(session.user.id, buffer, file.name);

    if (!result.success) {
      const errorMessages: Record<string, string> = {
        INVALID_TYPE: 'File must be a PDF',
        SIZE_EXCEEDED: 'File exceeds 5MB limit',
        EXTRACTION_FAILED: 'Could not extract text from PDF. Please try re-uploading.',
        LOW_TEXT_CONTENT:
          'This appears to be a scanned or image-based PDF. Please upload a text-based PDF.',
      };

      return NextResponse.json(
        {
          error: errorMessages[result.error!] || 'Upload failed',
          code: result.error,
          characterCount: result.characterCount,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: 'Resume uploaded successfully',
        characterCount: result.characterCount,
        extractedText: result.extractedText,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/resume
 * Removes the authenticated user's resume (file + DB record).
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    await deleteResume(session.user.id);

    return NextResponse.json(
      { message: 'Resume deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
