/**
 * AI Service types for Ollama Cloud API integration.
 */

export interface AIServiceConfig {
  baseUrl: string;          // https://ollama.com
  apiKey: string;           // Bearer token
  model: string;            // gemma4:31b-cloud
  timeoutMs: number;        // 60000
  maxRetries: number;       // 3
  maxInputLength: number;   // 10000
}

export interface AIRequestOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  latencyMs: number;
}

export interface AIHealthStatus {
  connected: boolean;
  latencyMs: number;
}
