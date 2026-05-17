/**
 * Authentication service handling registration, credential validation,
 * and login attempt tracking with account lockout.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '@/shared/lib/db';
import { isValidEmail, isValidPassword } from '@/shared/lib/validation';
import { AppError } from '@/shared/lib/errors';

const BCRYPT_COST_FACTOR = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Registers a new user with email and password.
 * Validates input, hashes password with bcrypt cost 12, and creates user in DB.
 */
export async function register(
  email: string,
  password: string
): Promise<{ userId: string }> {
  // Validate email format
  if (!isValidEmail(email)) {
    throw new AppError({
      code: 'INVALID_EMAIL',
      message: 'Email format is invalid',
      statusCode: 400,
    });
  }

  // Validate password length (8-128 chars)
  if (!isValidPassword(password)) {
    throw new AppError({
      code: 'INVALID_PASSWORD',
      message: 'Password must be between 8 and 128 characters',
      statusCode: 400,
    });
  }

  // Check for duplicate email
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new AppError({
      code: 'EMAIL_IN_USE',
      message: 'Email is already in use',
      statusCode: 409,
    });
  }

  // Hash password with bcrypt cost factor 12
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
    },
  });

  return { userId: user.id };
}

/**
 * Validates user credentials (email + password).
 * Returns the user object if valid, null otherwise.
 * Does NOT reveal which field is incorrect.
 */
export async function validateCredentials(
  email: string,
  password: string
): Promise<{ id: string; email: string } | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return null;
  }

  return { id: user.id, email: user.email };
}

/**
 * Checks if login attempts are locked for a given email.
 * Returns locked status and remaining lockout minutes if applicable.
 */
export async function checkLoginAttempts(
  email: string
): Promise<{ locked: boolean; remainingMinutes?: number }> {
  const attempt = await prisma.loginAttempt.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!attempt) {
    return { locked: false };
  }

  if (attempt.lockedUntil && attempt.lockedUntil > new Date()) {
    const remainingMs = attempt.lockedUntil.getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    return { locked: true, remainingMinutes };
  }

  return { locked: false };
}

/**
 * Records a failed login attempt for the given email.
 * Increments failedCount and sets lockedUntil after 5 consecutive failures.
 */
export async function recordFailedAttempt(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();

  // Find the user to get userId
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Don't reveal whether the email exists - silently return
    return;
  }

  const existing = await prisma.loginAttempt.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    const newFailedCount = existing.failedCount + 1;
    const lockedUntil =
      newFailedCount >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
        : existing.lockedUntil;

    await prisma.loginAttempt.update({
      where: { email: normalizedEmail },
      data: {
        failedCount: newFailedCount,
        lastFailedAt: new Date(),
        lockedUntil,
      },
    });
  } else {
    await prisma.loginAttempt.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        failedCount: 1,
        lastFailedAt: new Date(),
      },
    });
  }
}

/**
 * Resets failed login attempts for the given email (called on successful login).
 */
export async function resetFailedAttempts(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.loginAttempt.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    await prisma.loginAttempt.update({
      where: { email: normalizedEmail },
      data: {
        failedCount: 0,
        lastFailedAt: null,
        lockedUntil: null,
      },
    });
  }
}
