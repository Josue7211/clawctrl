import { afterEach, describe, expect, it, vi } from 'vitest'
const token = `ccm_v1.${'a'.repeat(64)}`
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); localStorage.clear(); delete window.__TAURI_INTERNALS__ })
async function transport() {
  vi.resetModules()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ ok: true }) }))
  return import('../api')
}
describe('Notes device transport', () => {
  it('sends bearer credentials only to the selected HTTPS Notes backend, never desktop keys', async () => {
    const client = await transport()
    client.setDesktopApiKeys({ localApiKey: 'desktop-key', remoteApiKey: 'old-pairing-key' })
    client.setMobileConnection('https://notes.example.test/', token)
    await client.api.get('/api/vault/local/documents')
    expect(fetch).toHaveBeenCalledWith('https://notes.example.test/api/vault/local/documents', expect.objectContaining({ redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }))
    expect(Object.values(localStorage)).not.toContain(token)
    await expect(client.api.post('/api/terminal', {})).rejects.toMatchObject({ status: 403 })
    await expect(client.api.get('/api/auth/session')).rejects.toMatchObject({ status: 403 })
    await expect(client.api.del('/api/vault/local/doc?id=x')).rejects.toMatchObject({ status: 403 })
    expect(fetch).toHaveBeenCalledTimes(1)
    client.clearMobileConnection()
    expect(client.getRequestBaseForPath('/api/vault/local/documents')).toBe('http://127.0.0.1:3010')
  })
  it('rejects insecure remote origins and URLs that could leak credentials', async () => {
    const client = await transport()
    for (const base of ['http://notes.example.test', 'https://user:pass@notes.example.test', 'https://notes.example.test/path', 'https://notes.example.test?token=unsafe', 'https://notes.example.test#token']) {
      expect(() => client.setMobileConnection(base, token)).toThrow('HTTPS')
    }
    expect(() => client.setMobileConnection('https://notes.example.test', 'desktop-key')).toThrow('Notes device credential')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('reports rejected and unreachable credentials without refreshing desktop secrets', async () => {
    const client = await transport()
    client.setDesktopApiKeys({ localApiKey: 'desktop-key' })
    client.setMobileConnection('https://notes.example.test', token)
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401, text: async () => '{"error":"Unauthorized"}' } as Response)
    await expect(client.api.get('/api/vault/local/documents')).rejects.toMatchObject({ status: 401 })
    expect(fetch).toHaveBeenCalledTimes(1)
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Network unavailable'))
    await expect(client.api.get('/api/mobile/capabilities')).rejects.toMatchObject({ status: 0 })
  })
  it('does not classify a phone with generic Tauri globals or stale desktop keys as desktop', async () => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true })
    vi.stubGlobal('navigator', { userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 })
    const client = await transport()
    client.setApiBase('https://notes.example.test')
    client.setDesktopApiKeys({ localApiKey: 'stale-desktop-key' })
    expect(client.getRequestBaseForPath('/api/vault/local/documents')).toBe('https://notes.example.test')
    expect(client.getApiKey()).toBeUndefined()
    expect(client.getRequestApiKeyForPath('/api/vault/local/documents')).toBeUndefined()
    await expect(client.api.get('/api/vault/local/documents')).rejects.toMatchObject({ status: 0 })
    expect(fetch).not.toHaveBeenCalled()
    const { isDesktopRuntime } = await import('../runtime')
    expect(isDesktopRuntime(true)).toBe(false)
  })
  it('uses the native OS result before permitting desktop bootstrap', async () => {
    const invoke = vi.fn().mockResolvedValue('ios')
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: { invoke }, configurable: true })
    const runtime = await import('../runtime')
    expect(runtime.isDesktopRuntime()).toBe(false)
    await runtime.initializeNativeRuntime()
    expect(runtime.isDesktopRuntime(true)).toBe(false)
  })

  it('releasing an old connection cannot clear a newer selected connection', async () => {
    const client = await transport()
    const release = client.setMobileConnection('https://old.example.test', token)
    client.setMobileConnection('https://new.example.test', token)
    release()
    await client.api.get('/api/vault/local/documents')
    expect(fetch).toHaveBeenCalledWith('https://new.example.test/api/vault/local/documents', expect.anything())
  })

})
