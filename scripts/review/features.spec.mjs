import { test, expect, NOTE, PROJECT, MOBILE_ORIGIN, DEVICE_TOKEN } from './fixtures.mjs'

async function capture(page, testInfo, name) {
  const path = testInfo.outputPath(name)
  await page.screenshot({ path, fullPage: true, animations: 'disabled' })
  await testInfo.attach(name, { path, contentType: 'image/png' })
}

test('Notes preserves a draft through a controlled save failure', async ({ page, review }, testInfo) => {
  await page.goto('/notes')
  const editor = page.locator('[contenteditable=true]:visible').first()
  await expect(editor).toContainText('A fixed sample note')
  await capture(page, testInfo, 'notes-before.png')
  review.failSave = true
  await editor.fill('Review note\n\nThis edit survives a failed save.')
  await expect.poll(() => review.failedSaves).toBeGreaterThan(0)
  expect(review.note.content).toBe(NOTE.content)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('mc-notes-drafts'))).toContain('This edit survives')
  await capture(page, testInfo, 'notes-save-failure.png')
  await page.reload()
  await expect(editor).toContainText('This edit survives')
  expect(review.note.content).toBe(NOTE.content)
  await capture(page, testInfo, 'notes-recovered-local.png')
  review.failSave = false
  await editor.fill('Review note\n\nThis edit survives a failed save. Recovered after reconnect.')
  await expect.poll(() => review.note.content).toBe('# Review note\n\nThis edit survives a failed save. Recovered after reconnect.')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('mc-notes-drafts') || '')).not.toContain('This edit survives')
  await capture(page, testInfo, 'notes-restored.png')
})

test('Notes retains a stale draft and shows the conflict', async ({ page, review }, testInfo) => {
  await page.goto('/notes')
  const editor = page.locator('[contenteditable=true]:visible').first()
  await expect(editor).toContainText('A fixed sample note')
  review.note = { ...review.note, _rev: `local-${NOTE.updated_at + 1}`, updated_at: NOTE.updated_at + 1, content: '# Review note\n\nEdited by another client.' }
  await editor.fill('Review note\n\nMy draft must survive this conflict.')
  await expect.poll(() => review.conflicts).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: 'Note status', exact: true })).toContainText('Save failed')
  await page.getByRole('button', { name: 'Note status', exact: true }).click()
  await expect(page.getByText('Note changed; reload its current revision before saving', { exact: false }).first()).toBeVisible()
  expect(review.note.content).toContain('Edited by another client')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('mc-notes-drafts'))).toContain('My draft must survive')
  await capture(page, testInfo, 'notes-conflict.png')
  await page.reload()
  await expect(editor).toContainText('My draft must survive')
  await editor.fill('Review note\n\nMy draft must survive this conflict and restart.')
  await expect.poll(() => review.writes.at(-1)?.content).toContain('and restart.')
  expect(review.writes.at(-1)._rev).toBe(NOTE._rev)
  expect(review.note.content).toContain('Edited by another client')
  await page.getByRole('button', { name: 'Note status', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Review queued edits', exact: false }).click()
  await expect(page.getByText('Save failed: Note changed; reload its current revision before saving', { exact: true })).toBeVisible()
  await capture(page, testInfo, 'notes-conflict-after-restart.png')
})

test('Chat keeps a cleared project after a late workspace response', async ({ page, review }, testInfo) => {
  let release
  review.workspaceGate = new Promise(resolve => { release = resolve })
  review.releaseWorkspace = () => release()
  await page.addInitScript(project => {
    localStorage.setItem('chat-selected-project-path', project.path)
  }, PROJECT)
  await page.goto('/chat?new=1')
  await expect.poll(() => review.workspaceRequested).toBe(true)
  const project = page.getByLabel('Project', { exact: true })
  await expect(project).toHaveValue(PROJECT.path)
  review.selectionBeforeClear = await project.inputValue()
  await capture(page, testInfo, 'chat-cached-before-clear.png')
  await project.selectOption('')
  review.clearedBeforeResponse = !review.workspaceDelivered
  expect(review.clearedBeforeResponse).toBe(true)
  await capture(page, testInfo, 'chat-cleared-before-response.png')
  release()
  await expect.poll(() => review.workspaceDelivered).toBe(true)
  await expect(page.getByRole('button', { name: 'Select project Review project', exact: true })).toBeVisible()
  await expect(project).toHaveValue('')
  review.selectionAfterResponse = await project.inputValue()
  expect(await page.evaluate(() => localStorage.getItem('chat-selected-project-path'))).toBe('')
  expect(new URL(page.url()).searchParams.has('projectId')).toBe(false)
  await capture(page, testInfo, 'chat-after-late-response.png')
})

test('Network isolation blocks unknown writes and external HTTP and WebSockets', async ({ page, review }) => {
  review.expectedViolations = [
    'POST /api/unmodeled at http://127.0.0.1:5186',
    'GET /api/auth/session at https://blocked.invalid',
    'WebSocket ws://blocked.invalid/unmodeled',
  ]
  await page.goto('/__review_network_probe')
  for (const [url, method] of [
    ['http://127.0.0.1:5186/api/unmodeled', 'POST'],
    ['https://blocked.invalid/api/auth/session', 'GET'],
  ]) {
    const result = await page.evaluate(async ({ url, method }) => (await fetch(url, { method })).json(), { url, method })
    expect(result).toEqual({ error: 'Unmodeled review request blocked' })
  }
  await page.evaluate(() => new Promise(resolve => {
    const socket = new WebSocket('ws://blocked.invalid/unmodeled')
    socket.onclose = () => resolve()
  }))
  expect(review.violations).toEqual(review.expectedViolations)
})


test('Device connection shows offline, recovery, and revoked states', async ({ page, review }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/connect')
  await page.getByLabel('Backend HTTPS address').fill(MOBILE_ORIGIN)
  await page.getByLabel('Notes device credential').fill(DEVICE_TOKEN)
  review.mobileState = 'offline'
  await page.getByRole('button', { name: 'Connect / retry' }).click()
  await expect(page.getByRole('status')).toContainText('Backend unreachable')
  await capture(page, testInfo, 'connection-offline.png')
  review.mobileState = 'online'
  await page.getByRole('button', { name: 'Connect / retry' }).click()
  await expect(page.getByRole('status')).toContainText('Connected to Notes')
  await expect(page.getByLabel('Connection capabilities')).toContainText('headless on linux')
  await page.getByText('Manage credentials in desktop Settings → Connections.').scrollIntoViewIfNeeded()
  await expect(page.getByText('Manage credentials in desktop Settings → Connections.')).toBeVisible()
  await capture(page, testInfo, 'connection-online.png')
  review.mobileState = 'revoked'
  await page.getByRole('button', { name: 'Connect / retry' }).click()
  await expect(page.getByRole('status')).toContainText('expired, invalid, or revoked')
  expect(await page.evaluate(token => JSON.stringify({ ...localStorage, ...sessionStorage }).includes(token), DEVICE_TOKEN)).toBe(false)
  await capture(page, testInfo, 'connection-revoked.png')
  await page.getByRole('button', { name: 'Disconnect' }).click()
  await expect(page.getByLabel('Notes device credential')).toHaveValue('')
})

test('Desktop creates and revokes a Notes-only device credential', async ({ page, review }, testInfo) => {
  await page.goto('/settings?section=connections')
  const panel = page.getByRole('region', { name: 'Phone connections' })
  await panel.getByLabel('Device name').fill('Review phone')
  await panel.getByRole('button', { name: 'Create Notes credential' }).click()
  await expect(panel.getByLabel('New Notes credential')).toHaveValue(DEVICE_TOKEN)
  await expect(panel.getByText('Review phone — Active', { exact: false })).toBeVisible()
  await capture(page, testInfo, 'device-created.png')
  await panel.getByRole('button', { name: 'Revoke Review phone' }).click()
  await expect(panel.getByRole('status')).toContainText('Device revoked')
  await expect(panel.getByLabel('New Notes credential')).toHaveCount(0)
  expect(review.devices[0].revoked_at).toBeTruthy()
  await capture(page, testInfo, 'device-revoked.png')
})

test('Settings distinguishes an offline provider from a ready backend and recovers', async ({ page, review }, testInfo) => {
  review.setupStatus = {
    ok: true, pairing_required: false, capabilities: {}, missing: [],
    services: Object.fromEntries(['supabase', 'harness', 'agentsecrets', 'memd', 'bluebubbles', 'mac_bridge']
      .map(name => [name, { configured: true, reachable: name !== 'supabase' }])),
  }
  await page.goto('/settings?section=connections')
  await expect(page.getByText('Backend reachable, some core services still need work', { exact: true })).toBeVisible()
  await expect(page.getByText('Supabase configured but offline', { exact: false })).toBeVisible()
  await expect(page.getByText('Backend ready', { exact: true })).toHaveCount(0)
  await capture(page, testInfo, 'supabase-offline.png')

  review.setupStatus.services.supabase.reachable = true
  await page.getByRole('button', { name: 'Check Server', exact: true }).click()
  await expect(page.getByText('Backend ready', { exact: true })).toBeVisible()
  await expect(page.getByText('Supabase online', { exact: false })).toBeVisible()
  await capture(page, testInfo, 'supabase-recovered.png')

  review.setupStatus.services.supabase.reachable = false
  await page.getByRole('button', { name: 'Check Server', exact: true }).click()
  await expect(page.getByText('Supabase configured but offline', { exact: false })).toBeVisible()
  await expect(page.getByText('Backend ready', { exact: true })).toHaveCount(0)
})

test('Sidebar links remain usable after an item drag', async ({ page }, testInfo) => {
  await page.goto('/settings?section=connections')
  const sidebar = page.getByRole('navigation', { name: 'Main navigation' })
  const note = sidebar.locator('[data-sidebar-item="true"][data-sidebar-href="/notes"]')
  const category = sidebar.locator('[data-sidebar-category-header="true"]').first()
  const from = await note.boundingBox()
  const to = await category.boundingBox()
  expect(from).toBeTruthy()
  expect(to).toBeTruthy()
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 })
  await page.mouse.up()
  // Exercise the real 250 ms post-drag click suppression window.
  await page.waitForTimeout(300)
  await note.click()
  await expect(page).toHaveURL(/\/notes$/)
  await expect(page.locator('[contenteditable=true]:visible').first()).toContainText('A fixed sample note')
  await capture(page, testInfo, 'sidebar-after-drag.png')
})
