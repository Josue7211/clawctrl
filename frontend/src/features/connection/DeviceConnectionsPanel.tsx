import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import type { components } from '@/features/notes/notes-api.generated'

type Device = components['schemas']['NotesDevice']
type Issued = components['schemas']['NotesDeviceIssueResponse']['data']
export default function DeviceConnectionsPanel() {
  const [devices, setDevices] = useState<Device[]>([])
  const [name, setName] = useState('')
  const [issued, setIssued] = useState<Issued | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function refresh() {
    const response = await api.get<components['schemas']['NotesDeviceListResponse']>('/api/mobile/devices')
    setDevices(response.data.devices)
  }
  useEffect(() => { void refresh().catch(() => setMessage('Sign in with verified MFA to manage phone connections.')) }, [])
  async function create() {
    setBusy(true)
    setMessage('')
    try {
      setIssued(null)
      const response = await api.post<components['schemas']['NotesDeviceIssueResponse']>('/api/mobile/devices', { name })
      setIssued(response.data)
      setName('')
      await refresh()
    } catch { setMessage('Could not create the credential. Check your desktop connection and sign-in.') }
    finally { setBusy(false) }
  }
  async function revoke(id: string) {
    setBusy(true)
    try {
      await api.del(`/api/mobile/devices/${encodeURIComponent(id)}`)
      if (issued?.device.id === id) setIssued(null)
      await refresh()
      setMessage('Device revoked. Its credential can no longer access Notes.')
    } catch { setMessage('Revocation failed. The device may still have access; retry.') }
    finally { setBusy(false) }
  }
  async function copyCredential() {
    if (!issued) return
    try {
      await navigator.clipboard.writeText(issued.token)
      setMessage('Credential copied. Transfer it privately to your device.')
    } catch { setMessage('Clipboard unavailable. Select the credential field and copy it.') }
  }
  return <section aria-label="Phone connections" style={{ padding: 20, marginBottom: 24, border: '1px solid var(--border)', borderRadius: 12 }}>
    <h2>Phone connections</h2>
    <p>Create a separate Notes-only credential for each device. Keep this vault’s computer awake and reachable. Desktop logout does not revoke device access.</p>
    <form onSubmit={event => { event.preventDefault(); void create() }} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <label>Device name <input required maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
      <Button variant="secondary" type="submit" disabled={busy}>Create Notes credential</Button>
    </form>
    {issued && <div style={{ marginTop: 16 }}>
      <p>Copy this credential now. It will not be shown again.</p>
      <input aria-label="New Notes credential" type="password" value={issued.token} readOnly autoComplete="off" style={{ width: '100%' }} />
      <Button variant="secondary" type="button" onClick={() => { void copyCredential() }}>Copy credential</Button>
    </div>}
    <p role="status" aria-live="polite">{message}</p>
    <ul>{devices.map(device => <li key={device.id} style={{ margin: '12px 0' }}>
      {device.name} — {device.revoked_at ? 'Revoked' : device.expires_at <= Date.now() ? 'Expired' : 'Active'}
      {!device.revoked_at && <Button variant="secondary" type="button" disabled={busy} onClick={() => { void revoke(device.id) }} style={{ marginLeft: 12 }}>Revoke {device.name}</Button>}
    </li>)}</ul>
    <a href="/connect">Check a device connection</a>
  </section>
}
