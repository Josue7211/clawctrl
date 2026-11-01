import { test as base, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { notesContract, validateNoteSchema, validateNoteExchange } from '../notes-contract.mjs'

export const REVIEW_ORIGIN = 'http://127.0.0.1:5186'
export const FIXTURE_ORIGIN = 'http://fixture.invalid'
export const NOTE = structuredClone(notesContract.components.schemas.NoteDocument.examples[0])
export const FIXED_TIME = NOTE.created_at
export const PROJECT = {
  name: 'Review project', path: '/fixture/review-project',
  branches: ['main'], currentBranch: 'main', scripts: [],
}

export const test = base.extend({
  review: [async ({ context, page }, use, testInfo) => {
    const state = {
      note: structuredClone(NOTE), failSave: false, failedSaves: 0, conflicts: 0,
      writes: [], mutations: [], errors: [], warnings: [], forwardedOrigins: [], expectedErrors: [], violations: [], expectedViolations: [], requests: [],
      workspaceGate: null, workspaceRequested: false, workspaceDelivered: false,
    }
    const observePage = target => {
      target.on('pageerror', error => state.errors.push(error.message))
      target.on('console', message => {
        if (message.type() === 'warning') state.warnings.push(message.text())
        if (message.type() !== 'error') return
        const text = message.text()
        const location = message.location().url
        // Injected HTTP 503 responses have browser-generated resource diagnostics.
        if (location.includes('/api/vault/local/doc?') && ((state.failedSaves > 0 && /^Failed to load resource:.*503/.test(text)) || (state.conflicts > 0 && /^Failed to load resource:.*409/.test(text)))) state.expectedErrors.push(text)
        else if (state.conflicts > 0 && text.startsWith('[notes] autosave failed: ApiError: Note changed; reload its current revision before saving')) state.expectedErrors.push(text)
        else state.errors.push(text)
      })
    }
    context.pages().forEach(observePage)
    context.on('page', observePage)
    await page.clock.setFixedTime(new Date(FIXED_TIME))
    await context.addInitScript(() => {
      if (!localStorage.getItem('review-initialized')) {
        localStorage.setItem('setup-complete', 'true')
        localStorage.setItem('demo-mode', 'false')
        localStorage.setItem('mc-notes-focus-mode', 'true')
        localStorage.setItem('review-initialized', 'true')
      }
    })
    await context.routeWebSocket('**', socket => {
      const url = new URL(socket.url())
      if (url.origin === REVIEW_ORIGIN.replace('http:', 'ws:')) socket.connectToServer()
      else {
        state.violations.push(`WebSocket ${url.origin}${url.pathname}`)
        socket.close()
      }
    })
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url())
      const key = `${request.method()} ${url.pathname}`
      const rawJson = (body, status = 200) => route.fulfill({ status, json: body, headers: { 'access-control-allow-origin': REVIEW_ORIGIN } })
      const json = (body, status = 200) => {
        validateNoteExchange(request.method(), url.pathname, status, body)
        return rawJson(body, status)
      }
      const block = () => {
        state.violations.push(`${key} at ${url.origin}`)
        return rawJson({ error: 'Unmodeled review request blocked' })
      }
      if (url.origin === REVIEW_ORIGIN && url.pathname === '/__review_network_probe' && request.method() === 'GET') {
        return route.fulfill({ contentType: 'text/html', body: '<title>Isolated network probe</title>' })
      }
      if (request.method() === 'GET' && url.origin === 'https://fonts.googleapis.com' && url.pathname === '/css2') return route.fulfill({ contentType: 'text/css', body: '' })
      if (![FIXTURE_ORIGIN, REVIEW_ORIGIN, 'http://127.0.0.1:3010'].includes(url.origin)) return block()
      if (!url.pathname.startsWith('/api/')) {
        if (url.origin === REVIEW_ORIGIN && ['GET', 'HEAD'].includes(request.method())) {
          if (!state.forwardedOrigins.includes(url.origin)) state.forwardedOrigins.push(url.origin)
          return route.continue()
        }
        return block()
      }
      state.requests.push(key)
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) state.mutations.push(key)
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
        'access-control-allow-origin': REVIEW_ORIGIN,
        'access-control-allow-headers': '*', 'access-control-allow-methods': '*',
      } })
      if (key === 'PUT /api/vault/local/doc') {
        const note = request.postDataJSON()
        if (url.searchParams.get('id') !== NOTE._id || note._id !== NOTE._id) return block()
        validateNoteSchema('NoteWrite', note)
        state.writes.push(structuredClone(note))
        if (state.failSave) {
          state.failedSaves++
          return json({ ok: false, error: 'Review fixture: vault save unavailable', code: 'service_unavailable' }, 503)
        }
        if (note._rev !== state.note._rev) {
          state.conflicts++
          return json({ ok: false, error: 'Note changed; reload its current revision before saving', code: 'conflict' }, 409)
        }
        const nextTime = state.note.updated_at + 1
        const { content_status, operation_id, ...wireNote } = note
        state.note = { ...wireNote, updated_at: nextTime, _rev: `local-${nextTime}` }
        return json({ ok: true, data: { id: state.note._id, rev: state.note._rev } })
      }
      if (['PATCH /api/user-preferences', 'POST /api/vault/local/collaboration/events', 'PUT /api/vault/local/collaboration/crdt-state'].includes(key)) return json({ ok: true })
      if (key === 'POST /api/gateway/events-token') return json({ token: 'fixture-events-token' })
      if (key === 'GET /api/gateway/events') return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' })
      if (key === 'POST /api/auth/sync/hydrate') return json({ ready: true })
      if (key === 'GET /api/chat/workspace-context') {
        state.workspaceRequested = true
        if (state.workspaceGate) await state.workspaceGate
        state.workspaceDelivered = true
        return json({ projects: [PROJECT], runtimeModes: ['Work locally'] })
      }
      const reads = {
        '/api/auth/session': { authenticated: true, user: { id: 'review-user', email: 'review@example.test' }, mfa_verified: true },
        '/api/setup/status': { ok: true, pairing_required: false, capabilities: {}, services: { supabase: { configured: true, reachable: true } } },
        '/api/auth/sync/status': { ready: true, has_cached_key: true, requires_unlock: false, has_synced_services: false, needs_recovery_key: false },
        '/api/user-preferences': { ok: true, data: {} },
        '/api/generated-modules': { modules: [] },
        '/api/cache': { data: [] },
        '/api/hermes/runtime-config': {},
        '/api/hermes/usage': { available: false },
        '/api/chat/models': { models: [] },
        '/api/chat/providers/status': { providers: [] },
        '/api/gateway/sessions': { sessions: [] },
        '/api/vault/local/collaboration/crdt-state': { data: { state: null } },
        '/api/status': { status: 'ok', services: [] },
        '/api/approvals': { approvals: [], pending: [] },
        '/api/vault/local/doc': { ok: true, data: state.note },
        '/api/vault/local/documents': { ok: true, data: { notes: [state.note], attachments: [] } },
        '/api/vault/local/folders': { data: { folders: [{ path: 'Workspace', name: 'Workspace' }] } },
        '/api/vault/local/sync-ledger': { data: { pending_saves: [], sync_states: [], events: [] } },
        '/api/vault/local/audit': { data: { events: [] } },
        '/api/vault/local/comments': { data: { comments: [] } },
        '/api/vault/local/suggestions': { data: { suggestions: [] } },
        '/api/vault/local/collaboration/events': { data: { events: [] } },
        '/api/vault/local/collaboration/pairings': { data: { pairings: [] } },
      }
      if (request.method() === 'GET' && Object.hasOwn(reads, url.pathname)) return json(reads[url.pathname])
      return block()
    })
    try { await use(state) }
    finally {
      state.releaseWorkspace?.()
      const results = testInfo.outputPath('browser-results.json')
      await writeFile(results, JSON.stringify(state, (key, value) => key === 'workspaceGate' ? undefined : value, 2))
      await testInfo.attach('browser-and-network-results', {
        path: results,
        contentType: 'application/json',
      })
      expect(state.violations, 'Every unknown network request must be modeled explicitly').toEqual(state.expectedViolations)
      expect(state.errors, 'Unexpected browser errors').toEqual([])
      expect(state.forwardedOrigins.every(origin => origin === REVIEW_ORIGIN)).toBe(true)
    }
  }, { auto: true }],
})
export { expect }
