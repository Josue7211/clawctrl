import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ConnectionPage from '../ConnectionPage'
import { clearMobileConnection, getRequestBaseForPath } from '@/lib/api'
const token = `ccm_v1.${'a'.repeat(64)}`
afterEach(() => { cleanup(); clearMobileConnection(); vi.unstubAllGlobals(); localStorage.clear() })
it('shows offline, connected, and revoked states while keeping the credential out of browser storage', async () => {
  const request = vi.fn().mockRejectedValueOnce(new TypeError('unreachable'))
  vi.stubGlobal('fetch', request)
  const view = render(<ConnectionPage />)
  fireEvent.change(screen.getByLabelText('Backend HTTPS address'), { target: { value: 'https://notes.example.test' } })
  fireEvent.change(screen.getByLabelText('Notes device credential'), { target: { value: token } })
  fireEvent.click(screen.getByRole('button', { name: 'Connect / retry' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Backend unreachable'))
  request.mockResolvedValueOnce({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ ok: true, data: { notes: { list: true, read: true, write: true, revision_conflicts: true, idempotency: true }, protocol_version: 1, backend: { mode: 'headless', os: 'linux' }, credential: { device_id: 'sample', expires_at: 1800000000000 } } }) })
  fireEvent.click(screen.getByRole('button', { name: 'Connect / retry' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Connected to Notes'))
  expect(screen.getByLabelText('Connection capabilities')).toHaveTextContent('headless on linux')
  request.mockResolvedValueOnce({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ ok: true, data: { protocol_version: 1, credential: {} } }) })
  fireEvent.click(screen.getByRole('button', { name: 'Connect / retry' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('does not support this device connection'))
  request.mockResolvedValueOnce({ ok: false, status: 401, text: async () => '{"error":"Unauthorized"}' })
  fireEvent.click(screen.getByRole('button', { name: 'Connect / retry' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('expired, invalid, or revoked'))
  expect(JSON.stringify({ ...localStorage })).not.toContain(token)
  fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
  expect(screen.getByLabelText('Notes device credential')).toHaveValue('')
  view.unmount()
  expect(getRequestBaseForPath('/api/mobile/capabilities')).not.toBe('https://notes.example.test')
})
