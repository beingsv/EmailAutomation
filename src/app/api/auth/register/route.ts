import { NextResponse } from 'next/server';
import { register } from '@/features/auth/services/auth.service';
import { handleApiError } from '@/shared/lib/errors';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    const result = await register(email, password);

    return NextResponse.json(
      { userId: result.userId, message: 'Registration successful' },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
