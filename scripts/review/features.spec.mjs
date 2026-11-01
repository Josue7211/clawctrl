import { test, expect, NOTE, PROJECT } from './fixtures.mjs'

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
  await expect.poll(() => review.note.content).toContain('Recovered after reconnect')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('mc-notes-drafts') || '')).not.toContain('This edit survives')
  await capture(page, testInfo, 'notes-restored.png')
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
  await project.selectOption('')
  await capture(page, testInfo, 'chat-cleared-before-response.png')
  release()
  await expect(page.getByRole('button', { name: 'Select project Review project', exact: true })).toBeVisible()
  await expect(project).toHaveValue('')
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
