import { describe, it, expect, vi } from 'vitest'
import { withRetry } from '../utils/retry.js'

describe('withRetry', () => {
  it('retorna valor na primeira tentativa se sucesso', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retry e sucesso na segunda tentativa', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('temp fail'))
      .mockResolvedValueOnce('ok')
    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('lança erro após maxRetries tentativas', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent fail'))
    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
    ).rejects.toThrow('persistent fail')
    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('usa defaults quando options não fornecidas', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
  })
})
