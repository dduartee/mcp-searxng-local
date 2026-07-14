import { describe, it, expect, vi } from 'vitest'
import { setDebug, log, warn, error } from '../utils/logger.js'

describe('logger', () => {
  it('log não imprime quando debug desligado', () => {
    setDebug(false)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    log('should not print')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('log imprime quando debug ligado', () => {
    setDebug(true)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    log('should print')
    expect(spy).toHaveBeenCalledWith('[mcp-searxng-local]', 'should print')
    spy.mockRestore()
    setDebug(false)
  })

  it('warn sempre imprime', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    warn('warning message')
    expect(spy).toHaveBeenCalledWith('[mcp-searxng-local]', 'warning message')
    spy.mockRestore()
  })

  it('error sempre imprime', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    error('error message')
    expect(spy).toHaveBeenCalledWith('[mcp-searxng-local]', 'error message')
    spy.mockRestore()
  })
})
