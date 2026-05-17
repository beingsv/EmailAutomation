export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginAttempt {
  email: string;
  failedCount: number;
  lastFailedAt: Date | null;
  lockedUntil: Date | null;
}
