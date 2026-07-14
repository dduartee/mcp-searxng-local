import { describe, it, expect, vi } from 'vitest'
import { setDebug, log, warn, error } from '../utils/logger.js'

describe('logger', () => {
  it('log does not print when debug is off', () => {
    setDebug(false)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    log('should not print')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('log prints when debug is on', () => {
    setDebug(true)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    log('should print')
    expect(spy).toHaveBeenCalledWith('[mcp-searxng-local]', 'should print')
    spy.mockRestore()
    setDebug(false)
  })

  it('warn always prints', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    warn('warning message')
    expect(spy).toHaveBeenCalledWith('[mcp-searxng-local]', 'warning message')
    spy.mockRestore()
  })

  it('error always prints', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    error('error message')
    expect(spy).toHaveBeenCalledWith('[mcp-searxng-local]', 'error message')
    spy.mockRestore()
  })
})
