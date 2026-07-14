/**
 * retry.ts
 * Retry com exponential backoff e jitter.
 * Usado tanto no SearXNG quanto no web_fetch para resiliência.
 */

interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10000,
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...options }

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === maxRetries) break

      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 200,
        maxDelayMs
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  throw lastError
}
