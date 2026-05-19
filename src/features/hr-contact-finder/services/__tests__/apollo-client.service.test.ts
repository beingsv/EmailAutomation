import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchPeople, extractContacts, ApolloClientError } from '../hunter-client.service';

describe('ApolloClientService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, APOLLO_API_KEY: 'test-api-key' };
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('searchPeople', () => {
    it('should throw MISSING_API_KEY error when APOLLO_API_KEY is not set', async () => {
      delete process.env.APOLLO_API_KEY;

      await expect(
        searchPeople({ companyName: 'Google', titles: ['HR'], limit: 5 })
      ).rejects.toThrow(ApolloClientError);

      await expect(
        searchPeople({ companyName: 'Google', titles: ['HR'], limit: 5 })
      ).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    });

    it('should call Apollo API with correct parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ people: [] }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await searchPeople({
        companyName: 'Google',
        titles: ['HR', 'Recruiter'],
        limit: 5,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.apollo.io/v1/mixed_people/search',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Api-Key': 'test-api-key',
          }),
          body: JSON.stringify({
            q_organization_name: 'Google',
            person_titles: ['HR', 'Recruiter'],
            per_page: 5,
          }),
        })
      );
    });

    it('should cap limit at 10 even if higher value is passed', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ people: [] }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await searchPeople({
        companyName: 'Google',
        titles: ['HR'],
        limit: 25,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.per_page).toBe(10);
    });

    it('should throw RATE_LIMITED error on HTTP 429', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({}),
      }));

      await expect(
        searchPeople({ companyName: 'Google', titles: ['HR'], limit: 5 })
      ).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        statusCode: 429,
        message: 'API limit reached for today',
      });
    });

    it('should throw CREDITS_EXHAUSTED error on HTTP 402', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        json: () => Promise.resolve({}),
      }));

      await expect(
        searchPeople({ companyName: 'Google', titles: ['HR'], limit: 5 })
      ).rejects.toMatchObject({
        code: 'CREDITS_EXHAUSTED',
        statusCode: 402,
        message: 'API credits exhausted',
      });
    });

    it('should throw API_ERROR on other non-ok responses', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }));

      await expect(
        searchPeople({ companyName: 'Google', titles: ['HR'], limit: 5 })
      ).rejects.toMatchObject({
        code: 'API_ERROR',
        statusCode: 500,
      });
    });

    it('should throw NETWORK_ERROR on fetch failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

      await expect(
        searchPeople({ companyName: 'Google', titles: ['HR'], limit: 5 })
      ).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Contact search failed. Pattern-based fallback is available.',
      });
    });

    it('should throw NETWORK_ERROR on timeout (AbortError)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      await expect(
        searchPeople({ companyName: 'Google', titles: ['HR'], limit: 5 })
      ).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        statusCode: 504,
        message: 'Contact search timed out',
      });
    });

    it('should return contacts from a successful response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          people: [
            { name: 'Jane Doe', title: 'HR Manager', email: 'jane@google.com' },
            { name: 'John Smith', title: 'Recruiter', email: 'john@google.com' },
          ],
          pagination: { total_entries: 15 },
        }),
      }));

      const result = await searchPeople({
        companyName: 'Google',
        titles: ['HR', 'Recruiter'],
        limit: 10,
      });

      expect(result.contacts).toHaveLength(2);
      expect(result.contacts[0]).toEqual({
        name: 'Jane Doe',
        title: 'HR Manager',
        email: 'jane@google.com',
      });
      expect(result.hasMore).toBe(true);
    });
  });

  describe('extractContacts', () => {
    it('should extract valid contacts from response data', () => {
      const data = {
        people: [
          { name: 'Alice', title: 'HR Lead', email: 'alice@co.com' },
          { name: 'Bob', title: 'Recruiter', email: 'bob@co.com' },
        ],
      };

      const result = extractContacts(data, 10);
      expect(result.contacts).toHaveLength(2);
      expect(result.contacts[0]).toEqual({ name: 'Alice', title: 'HR Lead', email: 'alice@co.com' });
    });

    it('should skip contacts with missing name', () => {
      const data = {
        people: [
          { name: '', title: 'HR Lead', email: 'alice@co.com' },
          { name: 'Bob', title: 'Recruiter', email: 'bob@co.com' },
        ],
      };

      const result = extractContacts(data, 10);
      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].name).toBe('Bob');
    });

    it('should skip contacts with missing email', () => {
      const data = {
        people: [
          { name: 'Alice', title: 'HR Lead', email: '' },
          { name: 'Bob', title: 'Recruiter', email: 'bob@co.com' },
        ],
      };

      const result = extractContacts(data, 10);
      expect(result.contacts).toHaveLength(1);
    });

    it('should skip contacts with missing title', () => {
      const data = {
        people: [
          { name: 'Alice', title: '', email: 'alice@co.com' },
        ],
      };

      const result = extractContacts(data, 10);
      expect(result.contacts).toHaveLength(0);
    });

    it('should respect the limit parameter', () => {
      const data = {
        people: [
          { name: 'A', title: 'T1', email: 'a@co.com' },
          { name: 'B', title: 'T2', email: 'b@co.com' },
          { name: 'C', title: 'T3', email: 'c@co.com' },
        ],
      };

      const result = extractContacts(data, 2);
      expect(result.contacts).toHaveLength(2);
    });

    it('should set hasMore to true when total_entries exceeds returned contacts', () => {
      const data = {
        people: [{ name: 'A', title: 'T', email: 'a@co.com' }],
        pagination: { total_entries: 50 },
      };

      const result = extractContacts(data, 10);
      expect(result.hasMore).toBe(true);
    });

    it('should set hasMore to false when all results are returned', () => {
      const data = {
        people: [{ name: 'A', title: 'T', email: 'a@co.com' }],
        pagination: { total_entries: 1 },
      };

      const result = extractContacts(data, 10);
      expect(result.hasMore).toBe(false);
    });

    it('should handle missing people array gracefully', () => {
      const result = extractContacts({}, 10);
      expect(result.contacts).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle non-object entries in people array', () => {
      const data = {
        people: [null, undefined, 'string', 42, { name: 'A', title: 'T', email: 'a@co.com' }],
      };

      const result = extractContacts(data, 10);
      expect(result.contacts).toHaveLength(1);
    });

    it('should trim whitespace from extracted fields', () => {
      const data = {
        people: [{ name: '  Alice  ', title: '  HR  ', email: '  alice@co.com  ' }],
      };

      const result = extractContacts(data, 10);
      expect(result.contacts[0]).toEqual({
        name: 'Alice',
        title: 'HR',
        email: 'alice@co.com',
      });
    });
  });
});
