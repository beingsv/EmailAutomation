import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/shared/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    loginAttempt: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import { prisma } from '@/shared/lib/db';
import bcrypt from 'bcryptjs';
import {
  register,
  validateCredentials,
  checkLoginAttempts,
  recordFailedAttempt,
  resetFailedAttempts,
} from './auth.service';

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  loginAttempt: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should reject invalid email format', async () => {
      await expect(register('invalid-email', 'password123')).rejects.toMatchObject({
        code: 'INVALID_EMAIL',
        statusCode: 400,
      });
    });

    it('should reject password shorter than 8 characters', async () => {
      await expect(register('test@example.com', 'short')).rejects.toMatchObject({
        code: 'INVALID_PASSWORD',
        statusCode: 400,
      });
    });

    it('should reject password longer than 128 characters', async () => {
      const longPassword = 'a'.repeat(129);
      await expect(register('test@example.com', longPassword)).rejects.toMatchObject({
        code: 'INVALID_PASSWORD',
        statusCode: 400,
      });
    });

    it('should reject duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'test@example.com' });

      await expect(register('test@example.com', 'password123')).rejects.toMatchObject({
        code: 'EMAIL_IN_USE',
        statusCode: 409,
      });
    });

    it('should create user with hashed password on valid input', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed_password');
      mockPrisma.user.create.mockResolvedValue({ id: 'new-user-id', email: 'test@example.com' });

      const result = await register('test@example.com', 'password123');

      expect(result).toEqual({ userId: 'new-user-id' });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed_password',
        },
      });
    });

    it('should normalize email to lowercase', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed_password');
      mockPrisma.user.create.mockResolvedValue({ id: 'new-user-id', email: 'test@example.com' });

      await register('Test@Example.COM', 'password123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed_password',
        },
      });
    });
  });

  describe('validateCredentials', () => {
    it('should return null if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await validateCredentials('unknown@example.com', 'password123');
      expect(result).toBeNull();
    });

    it('should return null if password is incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed',
      });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await validateCredentials('test@example.com', 'wrongpassword');
      expect(result).toBeNull();
    });

    it('should return user object on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed',
      });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await validateCredentials('test@example.com', 'correctpassword');
      expect(result).toEqual({ id: 'user-1', email: 'test@example.com' });
    });
  });

  describe('checkLoginAttempts', () => {
    it('should return not locked if no attempt record exists', async () => {
      mockPrisma.loginAttempt.findUnique.mockResolvedValue(null);

      const result = await checkLoginAttempts('test@example.com');
      expect(result).toEqual({ locked: false });
    });

    it('should return locked with remaining minutes if lockedUntil is in the future', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      mockPrisma.loginAttempt.findUnique.mockResolvedValue({
        email: 'test@example.com',
        failedCount: 5,
        lockedUntil: futureDate,
      });

      const result = await checkLoginAttempts('test@example.com');
      expect(result.locked).toBe(true);
      expect(result.remainingMinutes).toBeGreaterThan(0);
      expect(result.remainingMinutes).toBeLessThanOrEqual(10);
    });

    it('should return not locked if lockedUntil is in the past', async () => {
      const pastDate = new Date(Date.now() - 1000);
      mockPrisma.loginAttempt.findUnique.mockResolvedValue({
        email: 'test@example.com',
        failedCount: 5,
        lockedUntil: pastDate,
      });

      const result = await checkLoginAttempts('test@example.com');
      expect(result).toEqual({ locked: false });
    });
  });

  describe('recordFailedAttempt', () => {
    it('should silently return if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await recordFailedAttempt('nonexistent@example.com');

      expect(mockPrisma.loginAttempt.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.loginAttempt.create).not.toHaveBeenCalled();
    });

    it('should create a new login attempt record on first failure', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      mockPrisma.loginAttempt.findUnique.mockResolvedValue(null);
      mockPrisma.loginAttempt.create.mockResolvedValue({});

      await recordFailedAttempt('test@example.com');

      expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          email: 'test@example.com',
          failedCount: 1,
        }),
      });
    });

    it('should increment failedCount on subsequent failures', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      mockPrisma.loginAttempt.findUnique.mockResolvedValue({
        email: 'test@example.com',
        failedCount: 3,
        lockedUntil: null,
      });
      mockPrisma.loginAttempt.update.mockResolvedValue({});

      await recordFailedAttempt('test@example.com');

      expect(mockPrisma.loginAttempt.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: expect.objectContaining({
          failedCount: 4,
        }),
      });
    });

    it('should set lockedUntil after 5 consecutive failures', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      mockPrisma.loginAttempt.findUnique.mockResolvedValue({
        email: 'test@example.com',
        failedCount: 4,
        lockedUntil: null,
      });
      mockPrisma.loginAttempt.update.mockResolvedValue({});

      await recordFailedAttempt('test@example.com');

      expect(mockPrisma.loginAttempt.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: expect.objectContaining({
          failedCount: 5,
          lockedUntil: expect.any(Date),
        }),
      });

      // Verify the lockedUntil is approximately 15 minutes from now
      const callArgs = mockPrisma.loginAttempt.update.mock.calls[0][0];
      const lockedUntil = callArgs.data.lockedUntil as Date;
      const expectedTime = Date.now() + 15 * 60 * 1000;
      expect(lockedUntil.getTime()).toBeCloseTo(expectedTime, -3); // within 1 second
    });
  });

  describe('resetFailedAttempts', () => {
    it('should do nothing if no attempt record exists', async () => {
      mockPrisma.loginAttempt.findUnique.mockResolvedValue(null);

      await resetFailedAttempts('test@example.com');

      expect(mockPrisma.loginAttempt.update).not.toHaveBeenCalled();
    });

    it('should reset failedCount and lockedUntil', async () => {
      mockPrisma.loginAttempt.findUnique.mockResolvedValue({
        email: 'test@example.com',
        failedCount: 3,
        lockedUntil: new Date(),
      });
      mockPrisma.loginAttempt.update.mockResolvedValue({});

      await resetFailedAttempts('test@example.com');

      expect(mockPrisma.loginAttempt.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: {
          failedCount: 0,
          lastFailedAt: null,
          lockedUntil: null,
        },
      });
    });
  });
});
