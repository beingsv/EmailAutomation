import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from './encryption';

describe('encryption', () => {
  beforeAll(() => {
    // Set the encryption key for testing (32 bytes = 64 hex chars)
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  it('encrypts and decrypts a simple string', () => {
    const plaintext = 'my-smtp-password';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypts and decrypts an empty string', () => {
    const plaintext = '';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypts and decrypts a long string', () => {
    const plaintext = 'a'.repeat(1000);
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypts and decrypts special characters', () => {
    const plaintext = 'p@$$w0rd!#%^&*()_+-=[]{}|;:,.<>?/~`';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertext for same plaintext (random IV)', () => {
    const plaintext = 'test-password';
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('throws error when ENCRYPTION_KEY is not set', () => {
    const originalKey = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('throws error when ENCRYPTION_KEY is wrong length', () => {
    const originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = 'tooshort';
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
    process.env.ENCRYPTION_KEY = originalKey;
  });
});
