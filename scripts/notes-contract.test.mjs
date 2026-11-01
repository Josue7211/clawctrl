import { test } from 'node:test'
import assert from 'node:assert/strict'
import { notesContract, validateNoteExchange, validateNoteSchema } from './notes-contract.mjs'

test('Notes wire responses require revisions and the real API envelope', () => {
  const note = structuredClone(notesContract.components.schemas.NoteDocument.examples[0])
  validateNoteExchange('GET', '/api/vault/local/doc', 200, { ok: true, data: note })
  delete note._rev
  assert.throws(() => validateNoteExchange('GET', '/api/vault/local/doc', 200, { ok: true, data: note }), /Notes response drift/)
  assert.throws(() => validateNoteExchange('PUT', '/api/vault/local/doc', 200, { data: { rev: 'local-1' } }), /Notes response drift/)
})
test('Notes request and error fixtures reject incompatible data', () => {
  validateNoteSchema('NoteWrite', { content: '', operation_id: 'capture:fixture-1' })
  assert.throws(() => validateNoteSchema('NoteWrite', { content: 1 }), /Notes contract/)
  assert.throws(() => validateNoteSchema('NoteWrite', { content: '', operation_id: 'ambiguous operation' }), /Notes contract/)
  validateNoteExchange('PUT', '/api/vault/local/doc', 409, { ok: false, error: 'Note changed', code: 'conflict' })
  assert.throws(() => validateNoteExchange('PUT', '/api/vault/local/doc', 409, { error: 'Note changed' }), /Notes response drift/)
  validateNoteExchange('GET', '/api/vault/local/documents', 401, 'Unauthorized: invalid or missing API key', 'text/plain')
})
