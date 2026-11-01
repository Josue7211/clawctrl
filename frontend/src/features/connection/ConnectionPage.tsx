import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { api, ApiError, setMobileConnection } from '@/lib/api'
import type { components } from '@/features/notes/notes-api.generated'

type Capabilities = components['schemas']['MobileCapabilitiesResponse']['data']
export default function ConnectionPage() {
  const [base, setBase] = useState('')
  const [credential, setCredential] = useState('')
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [status, setStatus] = useState('Enter your backend address and a Notes credential created on your desktop.')
  const [busy, setBusy] = useState(false)
  const releaseConnection = useRef<(() => void) | undefined>(undefined)
  useEffect(() => () => releaseConnection.current?.(), [])
  async function connect() {
    setBusy(true)
    setCapabilities(null)
    releaseConnection.current?.()
    let release: (() => void) | undefined
    try {
      release = setMobileConnection(base, credential)
      releaseConnection.current = release
      const response = await api.get<components['schemas']['MobileCapabilitiesResponse']>('/api/mobile/capabilities')
      const data = response?.data
      if (!response?.ok || data?.protocol_version !== 1 || !data.credential
        || typeof data.credential.device_id !== 'string' || !Number.isFinite(data.credential.expires_at)
        || !['desktop', 'headless'].includes(data.backend?.mode) || typeof data.backend?.os !== 'string'
        || !['list', 'read', 'write', 'revision_conflicts', 'idempotency'].every(key => data.notes?.[key as keyof typeof data.notes] === true)) {
        throw new Error('This backend does not support this device connection.')
      }
      setCapabilities(response.data)
      setStatus('Connected to Notes. Desktop operations stay on your computer.')
    } catch (error) {
      // Keep retry input in memory, but never leave failed credentials active.
      release?.()
      setStatus(error instanceof ApiError && error.status === 0
        ? 'Backend unreachable. Keep its computer awake and the backend running, then retry. Your connection is offline.'
        : error instanceof ApiError && error.status === 401
          ? 'Credential expired, invalid, or revoked. Create a new Notes credential on your desktop.'
          : error instanceof Error ? error.message : 'Could not connect.')
    } finally { setBusy(false) }
  }
  function disconnect() {
    releaseConnection.current?.()
    releaseConnection.current = undefined
    setCredential('')
    setCapabilities(null)
    setStatus('Disconnected. The credential has been removed from this view.')
  }
  return <main style={{ maxWidth: 560, height: '100dvh', overflowY: 'auto', boxSizing: 'border-box', margin: '0 auto', padding: 24, paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', color: 'var(--text-primary)' }}>
    <h1>Connect to Notes</h1>
    <p>Your notes stay on the computer that owns your vault. That computer must remain reachable.</p>
    <form onSubmit={event => { event.preventDefault(); void connect() }} style={{ display: 'grid', gap: 16 }}>
      <label>Backend HTTPS address<input aria-label="Backend HTTPS address" type="url" required placeholder="https://your-backend.example" value={base} onChange={event => setBase(event.target.value)} style={{ display: 'block', width: '100%' }} /></label>
      <label>Notes device credential<input aria-label="Notes device credential" type="password" autoComplete="off" required value={credential} onChange={event => setCredential(event.target.value)} style={{ display: 'block', width: '100%' }} /></label>
      <div style={{ display: 'flex', gap: 12 }}><Button variant="primary" disabled={busy} type="submit">{busy ? 'Connecting…' : 'Connect / retry'}</Button><Button variant="secondary" type="button" onClick={disconnect} disabled={busy}>Disconnect</Button></div>
    </form>
    <p role="status" aria-live="polite">{status}</p>
    {capabilities && <section aria-label="Connection capabilities">
      <h2>Notes available</h2>
      <p>List, read, and save notes with revision checks and safe retries.</p>
      <p>Backend: {capabilities.backend.mode} on {capabilities.backend.os}. If it stops or sleeps, this connection goes offline.</p>
      <p>Shell, arbitrary files, service management, and device management require desktop access.</p>
      <p>Credential expires {new Date(capabilities.credential!.expires_at).toLocaleDateString()}.</p>
    </section>}
    <p>This connection check clears your credential when you reload. Re-enter it to reconnect; your notes stay on the backend.</p>
    <p>Manage credentials in desktop Settings → Connections.</p>
  </main>
}
