/**
 * Email Verifier Service
 *
 * Uses Hunter.io's Email Verifier API to check if an email address is deliverable.
 * API: GET https://api.hunter.io/v2/email-verifier?email=xxx&api_key=xxx
 *
 * Returns verification status: valid, invalid, accept_all, webmail, disposable, unknown
 * Costs 1 credit per verification from the Hunter.io free plan (25/month).
 *
 * Strategy: Only verify emails with unknown/null verification status.
 * Skip emails already verified during Domain Search (valid, accept_all).
 */

const HUNTER_VERIFY_URL = 'https://api.hunter.io/v2/email-verifier';

export type VerificationResult = 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown';

interface VerifyEmailResponse {
  data: {
    status: VerificationResult;
    score: number;
    email: string;
    regexp: boolean;
    gibberish: boolean;
    disposable: boolean;
    webmail: boolean;
    mx_records: boolean;
    smtp_server: boolean;
    smtp_check: boolean;
    accept_all: boolean;
    block: boolean;
  };
}

/**
 * Verifies a single email address using Hunter.io Email Verifier API.
 * Returns the verification status or 'unknown' on failure.
 */
export async function verifyEmail(email: string): Promise<VerificationResult> {
  const apiKey = process.env.HUNTER_API_KEY;

  if (!apiKey || apiKey === 'your-hunter-api-key-here') {
    console.warn('[Verifier] HUNTER_API_KEY not configured, skipping verification');
    return 'unknown';
  }

  try {
    const url = `${HUNTER_VERIFY_URL}?email=${encodeURIComponent(email)}&api_key=${apiKey}`;

    console.log(`[Verifier] Verifying: ${email}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'accept': 'application/json' },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    // 202 = verification still in progress (async)
    if (response.status === 202) {
      console.log(`[Verifier] ${email} — verification in progress (async), returning unknown`);
      return 'unknown';
    }

    if (response.status === 429) {
      console.warn(`[Verifier] Rate limited — skipping remaining verifications`);
      return 'unknown';
    }

    if (!response.ok) {
      console.warn(`[Verifier] Failed for ${email} — status ${response.status}`);
      return 'unknown';
    }

    const data: VerifyEmailResponse = await response.json();
    const status = data.data?.status || 'unknown';

    console.log(`[Verifier] ${email} → ${status} (score: ${data.data?.score})`);

    return status;
  } catch (error) {
    console.warn(`[Verifier] Error verifying ${email}:`, error);
    return 'unknown';
  }
}

/**
 * Verifies multiple emails, but only those that need verification.
 * Skips emails that already have a known status (valid, accept_all, invalid).
 *
 * Returns a map of email → verification status.
 */
export async function verifyEmails(
  emails: Array<{ email: string; currentStatus?: string }>
): Promise<Map<string, VerificationResult>> {
  const results = new Map<string, VerificationResult>();

  // Only verify emails with unknown/null status
  const toVerify = emails.filter(
    (e) => !e.currentStatus || e.currentStatus === 'unknown' || e.currentStatus === 'N/A'
  );

  if (toVerify.length === 0) {
    console.log(`[Verifier] All emails already have verification status, skipping`);
    return results;
  }

  console.log(`[Verifier] Need to verify ${toVerify.length} of ${emails.length} emails`);

  // Verify sequentially to respect rate limits
  for (const { email } of toVerify) {
    const status = await verifyEmail(email);
    results.set(email, status);

    // If we hit rate limit, stop verifying remaining
    if (status === 'unknown') {
      // Check if it was a rate limit issue (the function logs it)
      // Continue trying — individual failures shouldn't stop the batch
    }
  }

  return results;
}
