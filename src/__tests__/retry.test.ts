import { describe, it, expect, vi } from 'vitest'
import { withRetry } from '../utils/retry.js'

describe('withRetry', () => {
  it('returns value on first attempt if successful', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries and succeeds on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('temp fail'))
      .mockResolvedValueOnce('ok')
    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws error after maxRetries attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent fail'))
    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
    ).rejects.toThrow('persistent fail')
    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('uses defaults when options not provided', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
  })
})
