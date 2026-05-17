/**
 * Centralized AI Service for Ollama Cloud API communication.
 * Handles authentication, retry logic, timeout, and input sanitization.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import type {
  AIServiceConfig,
  AIRequestOptions,
  AIResponse,
  AIHealthStatus,
} from '../types';

/**
 * Prompt injection patterns to strip from user input (case-insensitive).
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+previous\s+instructions/gi,
  /ignore\s+all\s+previous\s+instructions/gi,
  /ignore\s+prior\s+instructions/gi,
  /disregard\s+previous\s+instructions/gi,
  /system\s*:/gi,
  /you\s+are\s+now/gi,
  /act\s+as\s+if/gi,
  /pretend\s+you\s+are/gi,
  /new\s+instructions\s*:/gi,
  /override\s+instructions/gi,
  /bypass\s+instructions/gi,
  /\[system\]/gi,
  /\[inst\]/gi,
  /<<\s*sys\s*>>/gi,
];

const MAX_INPUT_LENGTH = 10_000;

/**
 * Sanitizes user input by stripping prompt injection patterns
 * and truncating to the maximum allowed length.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  let sanitized = input;

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_INPUT_LENGTH);
  }

  return sanitized;
}

/**
 * Delays execution for the specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Loads AI service configuration from environment variables.
 */
function loadConfig(): AIServiceConfig {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'https://ollama.com',
    apiKey: process.env.OLLAMA_API_KEY || '',
    model: process.env.OLLAMA_MODEL || 'gemma4:31b-cloud',
    timeoutMs: 60_000,
    maxRetries: 3,
    maxInputLength: MAX_INPUT_LENGTH,
  };
}

/**
 * Checks whether the AI service is available based on API key presence.
 * Logs an error and returns false if the key is missing or empty.
 */
export function isServiceAvailable(): boolean {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.error(
      '[AI Service] OLLAMA_API_KEY is missing or empty. AI service is unavailable.'
    );
    return false;
  }
  return true;
}

/**
 * Sends a completion request to the Ollama Cloud API.
 *
 * - Authenticates with Bearer token (Req 7.1)
 * - Uses configured base URL and model (Req 7.2)
 * - Retries on HTTP 429 with exponential backoff: 1s, 2s, 4s (Req 7.3)
 * - Returns descriptive error after all retries exhausted (Req 7.4)
 * - Enforces 60-second timeout per request (Req 7.5)
 * - Sanitizes input before sending (Req 7.6)
 */
export async function generateCompletion(
  prompt: string,
  options?: AIRequestOptions
): Promise<AIResponse> {
  const config = loadConfig();

  // Req 7.7: Check API key availability
  if (!isServiceAvailable()) {
    throw new Error(
      'AI service is unavailable: OLLAMA_API_KEY is not configured.'
    );
  }

  // Req 7.6: Sanitize input
  const sanitizedPrompt = sanitizeInput(prompt);

  // Build messages array for the chat API
  const messages: Array<{ role: string; content: string }> = [];

  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: sanitizeInput(options.systemPrompt) });
  }

  messages.push({ role: 'user', content: sanitizedPrompt });

  // Build request body
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    stream: false,
  };

  if (options?.temperature !== undefined) {
    body.options = {
      ...(body.options as Record<string, unknown> || {}),
      temperature: options.temperature,
    };
  }

  if (options?.maxTokens !== undefined) {
    body.options = {
      ...(body.options as Record<string, unknown> || {}),
      num_predict: options.maxTokens,
    };
  }

  const url = `${config.baseUrl}/api/chat`;

  let lastError: Error | null = null;

  // Retry loop with exponential backoff (Req 7.3, 7.5)
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    // Wait before retry (not on first attempt)
    if (attempt > 0) {
      const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await delay(backoffMs);
    }

    // Req 7.5: 60-second timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`, // Req 7.1
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Req 7.3: Retry on HTTP 429
      if (response.status === 429) {
        lastError = new Error(
          `Rate limited (HTTP 429) on attempt ${attempt + 1} of ${config.maxRetries + 1}`
        );
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Ollama Cloud API returned HTTP ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      // Extract content from Ollama chat response
      const content = data?.message?.content || '';
      const tokensUsed =
        (data?.eval_count || 0) + (data?.prompt_eval_count || 0);

      return {
        content,
        tokensUsed,
        latencyMs,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // Req 7.5: Timed-out requests count as failed attempt
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error(
          `Request timed out after ${config.timeoutMs}ms on attempt ${attempt + 1} of ${config.maxRetries + 1}`
        );
        continue;
      }

      // Non-retryable errors (network errors, parse errors, non-429 HTTP errors)
      throw error;
    }
  }

  // Req 7.4: All retries exhausted
  throw new Error(
    `AI service request failed after ${config.maxRetries + 1} attempts. Last error: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Checks the health of the Ollama Cloud API connection.
 * Sends a lightweight request and measures latency.
 */
export async function checkHealth(): Promise<AIHealthStatus> {
  const config = loadConfig();

  if (!config.apiKey || config.apiKey.trim() === '') {
    return { connected: false, latencyMs: 0 };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  const startTime = Date.now();

  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    return {
      connected: response.ok,
      latencyMs,
    };
  } catch {
    clearTimeout(timeoutId);
    return {
      connected: false,
      latencyMs: Date.now() - startTime,
    };
  }
}
