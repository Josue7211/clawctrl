import {
  isSyncConflictState,
  formatSyncConflictSummary,
  formatSyncLedgerTimestamp,
  remoteConflictContent,
  baseConflictContent,
  mergedSyncConflictContent,
  conflictMarkedMergeContent,
} from '@/features/notes/syncConflicts'
import { useEffect, useMemo, useState } from 'react'
import { Cloud, ShieldCheck } from '@phosphor-icons/react'
import type {
  VaultStatus,
  VaultAuditEvent,
  VaultSyncLedger,
  VaultRecoverableDraft,
} from '@/features/notes/storage/vault'
import type { VaultNote } from '@/features/notes/types'
import { type LocalCollabDraft, mergeLocalCollabDraft, mergeNonOverlappingLineChanges } from '@/features/notes/collaboration'
import { buildVersionDiff, summarizeVersionDiff } from '@/features/notes/versionDiff'
import { type QueuedLocalEdit, type MergeConflictReviewRequest } from '@/features/notes/workspaceTypes'
import { formatBytes } from '@/features/notes/workspaceHelpers'

function QueuedEditsDialog({
  edits,
  online,
  saving,
  onRetry,
  onOpenNote,
  onOpenDiagnostics,
  onClose,
}: {
  edits: QueuedLocalEdit[]
  online: boolean
  saving: boolean
  onRetry: () => void
  onOpenNote: (noteId: string) => void
  onOpenDiagnostics: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Queued local edits"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.34)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <section
        style={{
          width: 'min(680px, calc(100vw - 32px))',
          maxHeight: 'min(720px, calc(100vh - 32px))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-panel)',
          boxShadow: '0 24px 80px var(--overlay-heavy)',
        }}
      >
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Cloud size={18} style={{ color: online ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--text-primary)' }}>Queued local edits</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Local-only changes waiting for a successful vault save
              </div>
            </div>
          </div>
        </div>
        <div style={{ overflow: 'auto', padding: 16, display: 'grid', gap: 10 }}>
          {edits.length === 0 ? (
            <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>
              No queued local edits.
            </div>
          ) : (
            edits.map(edit => {
              const lineCount = Math.max(1, edit.content.split('\n').length)
              const previewLines = edit.content.trim().split('\n').filter(Boolean)
              const preview = previewLines[previewLines.length - 1] || 'Empty note content'
              return (
                <div
                  key={edit.noteId}
                  style={{
                    border: `1px solid ${edit.error ? 'color-mix(in srgb, var(--red) 35%, var(--border))' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    background: edit.error ? 'color-mix(in srgb, var(--red) 7%, transparent)' : 'var(--bg-white-02)',
                    padding: 10,
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {edit.title}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {edit.folder} / {edit.noteId}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenNote(edit.noteId)}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '6px 8px',
                        fontSize: 12,
                      }}
                    >
                      Open note
                    </button>
                  </div>
                  {edit.error && (
                    <div style={{ color: 'var(--red)', fontSize: 11, lineHeight: 1.4 }}>
                      Save failed: {edit.error}
                    </div>
                  )}
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {lineCount} line{lineCount === 1 ? '' : 's'} local-only - {edit.content.length} chars
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {preview}
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onOpenDiagnostics}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px 10px',
              fontSize: 12,
            }}
          >
            Sync diagnostics
          </button>
          <button
            type="button"
            onClick={onRetry}
            disabled={!online || saving || edits.length === 0}
            style={{
              border: '1px solid var(--accent-a30)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-a12)',
              color: !online || saving || edits.length === 0 ? 'var(--text-muted)' : 'var(--accent)',
              cursor: !online || saving || edits.length === 0 ? 'default' : 'pointer',
              padding: '7px 10px',
              fontSize: 12,
              fontWeight: 650,
            }}
          >
            {saving ? 'Retrying...' : 'Retry all queued edits'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-white-04)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px 10px',
              fontSize: 12,
            }}
          >
            Close
          </button>
        </div>
      </section>
    </div>
  )
}

function VaultStatusDialog({
  status,
  auditEvents,
  syncLedger,
  notes,
  loading,
  error,
  onRefresh,
  onOpenNote,
  onSuggestRemote,
  onReviewMerge,
  onKeepLocal,
  onClose,
}: {
  status: VaultStatus | null
  auditEvents: VaultAuditEvent[]
  syncLedger: VaultSyncLedger | null
  notes: VaultNote[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onOpenNote: (noteId: string) => void
  onSuggestRemote: (state: VaultSyncLedger['sync_states'][number]) => void
  onReviewMerge: (state: VaultSyncLedger['sync_states'][number]) => void
  onKeepLocal: (state: VaultSyncLedger['sync_states'][number]) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const counts = status?.counts
  const noteContentById = useMemo(() => {
    const byId = new Map<string, string>()
    for (const note of notes) {
      if (note.type === 'note') byId.set(note._id, note.content)
    }
    return byId
  }, [notes])
  const rows = counts
    ? [
        ['Live notes', counts.live_notes],
        ['Trashed notes', counts.trashed_notes],
        ['Folders', counts.folders],
        ['Attachments', counts.attachments],
        ['Attachment storage', formatBytes(counts.attachment_bytes)],
        ['Versions', counts.versions],
        ['Open comments', counts.open_comments],
        ['Open suggestions', counts.open_suggestions],
        ['Pending saves', counts.pending_saves],
        ['Audit events', counts.audit_events],
      ]
    : []
  const syncConflicts = (syncLedger?.sync_states ?? []).filter(state => isSyncConflictState(state))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vault privacy status"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.34)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <section
        style={{
          width: 'min(620px, calc(100vw - 32px))',
          maxHeight: 'min(760px, calc(100vh - 32px))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-panel)',
          boxShadow: '0 24px 80px var(--overlay-heavy)',
        }}
      >
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--text-primary)' }}>Vault privacy status</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Local-first storage and backup readiness
              </div>
            </div>
          </div>
        </div>
        <div style={{ overflow: 'auto', padding: 16 }}>
          {loading && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 12 }}>Loading vault status...</div>
          )}
          {error && <div style={{ color: 'var(--red)', fontSize: 12, lineHeight: 1.5, padding: 12 }}>{error}</div>}
          {!loading && !error && status && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                <StatusBadge
                  label="Canonical store"
                  value={status.canonical_store === 'local_sqlite' ? 'Local SQLite' : status.canonical_store}
                />
                <StatusBadge label="Cloud required" value={status.remote_required ? 'Yes' : 'No'} />
                <StatusBadge
                  label="Encrypted backup"
                  value={status.encrypted_backup_supported ? 'Ready' : 'Unavailable'}
                />
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {rows.map(([label, value]) => (
                  <div
                    key={label}
                    style={{ display: 'flex', gap: 12, padding: '8px 10px', borderBottom: '1px solid var(--border)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0, color: 'var(--text-muted)', fontSize: 12 }}>{label}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 650 }}>{value}</div>
                  </div>
                ))}
              </div>
              <PathRow label="Database" value={status.database_path} />
              <PathRow label="Attachments" value={status.attachments_path} />
              {syncConflicts.length > 0 && (
                <div
                  style={{
                    border: '1px solid var(--red-a20, var(--border))',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    background: 'var(--bg-white-02)',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 10px',
                      color: 'var(--red)',
                      fontSize: 11,
                      fontWeight: 750,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    Sync conflicts
                  </div>
                  <div style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.45 }}>
                    Review these before trusting remote sync. Local notes remain editable, but the remote provider has
                    unresolved state for the same document.
                  </div>
                  {syncConflicts.map(state => (
                    <SyncConflictRow
                      key={`${state.provider}:${state.remote_id}:${state.local_id}`}
                      state={state}
                      localContent={noteContentById.get(state.local_id) ?? null}
                      onOpenNote={onOpenNote}
                      onSuggestRemote={onSuggestRemote}
                      onReviewMerge={onReviewMerge}
                      onKeepLocal={onKeepLocal}
                    />
                  ))}
                </div>
              )}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '8px 10px',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: 650,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  Save and sync ledger
                </div>
                {!syncLedger || (syncLedger.pending_saves.length === 0 && syncLedger.sync_states.length === 0) ? (
                  <div style={{ padding: 10, color: 'var(--text-muted)', fontSize: 12 }}>
                    No queued local saves or sync conflicts.
                  </div>
                ) : (
                  <>
                    {syncLedger.pending_saves.map(save => (
                      <LedgerRow
                        key={save.id}
                        title={save.operation}
                        detail={save.document_id}
                        meta={
                          save.last_error ? `${save.attempts} tries · ${save.last_error}` : `${save.attempts} tries`
                        }
                      />
                    ))}
                    {syncLedger.sync_states.map(state => (
                      <LedgerRow
                        key={`${state.provider}:${state.remote_id}`}
                        title={`${state.provider} · ${state.conflict_state}`}
                        detail={state.local_id}
                        meta={
                          state.last_synced_at
                            ? new Date(state.last_synced_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : 'Not synced'
                        }
                      />
                    ))}
                  </>
                )}
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '8px 10px',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: 650,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  Recent audit events
                </div>
                {auditEvents.length === 0 ? (
                  <div style={{ padding: 10, color: 'var(--text-muted)', fontSize: 12 }}>
                    No local audit events yet.
                  </div>
                ) : (
                  auditEvents.map(event => (
                    <div
                      key={event.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(120px, 1fr) minmax(0, 2fr) auto',
                        gap: 10,
                        padding: '8px 10px',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          color: 'var(--text-secondary)',
                          fontSize: 12,
                          fontWeight: 650,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {event.action.replace(/_/g, ' ')}
                      </div>
                      <div
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: 11,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {event.document_id || String(event.metadata.path || event.metadata.id || 'vault')}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {event.created_at
                          ? new Date(event.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div
          style={{
            padding: 12,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onRefresh}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px 12px',
              fontSize: 12,
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-white-04)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px 12px',
              fontSize: 12,
            }}
          >
            Close
          </button>
        </div>
      </section>
    </div>
  )
}

function StatusBadge({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: 10,
        background: 'var(--bg-white-02)',
        minWidth: 0,
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div
        style={{
          color: 'var(--text-primary)',
          fontSize: 13,
          fontWeight: 650,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function LedgerRow({ title, detail, meta }: { title: string; detail: string; meta: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(120px, 1fr) minmax(0, 2fr) auto',
        gap: 10,
        padding: '8px 10px',
        borderBottom: '1px solid var(--border)',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          color: 'var(--text-secondary)',
          fontSize: 12,
          fontWeight: 650,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: 11,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {detail || 'vault'}
      </div>
      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: 11,
          whiteSpace: 'nowrap',
          maxWidth: 180,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {meta}
      </div>
    </div>
  )
}

function SyncConflictRow({
  state,
  localContent,
  onOpenNote,
  onSuggestRemote,
  onReviewMerge,
  onKeepLocal,
}: {
  state: VaultSyncLedger['sync_states'][number]
  localContent: string | null
  onOpenNote: (noteId: string) => void
  onSuggestRemote: (state: VaultSyncLedger['sync_states'][number]) => void
  onReviewMerge: (state: VaultSyncLedger['sync_states'][number]) => void
  onKeepLocal: (state: VaultSyncLedger['sync_states'][number]) => void
}) {
  const payload = JSON.stringify(state.conflict ?? {}, null, 2)
  const remoteContent = remoteConflictContent(state.conflict)
  const baseContent = baseConflictContent(state.conflict)
  const mergedContent = useMemo(
    () => (
      baseContent && remoteContent && localContent !== null
        ? mergeNonOverlappingLineChanges(baseContent, localContent, remoteContent)
        : null
    ),
    [baseContent, localContent, remoteContent],
  )
  const diffRows = useMemo(
    () => (remoteContent && localContent !== null ? buildVersionDiff(localContent, remoteContent) : []),
    [localContent, remoteContent],
  )
  const mergeDiffRows = useMemo(
    () => (mergedContent && localContent !== null ? buildVersionDiff(localContent, mergedContent) : []),
    [localContent, mergedContent],
  )
  const diffSummary = useMemo(() => summarizeVersionDiff(diffRows), [diffRows])
  const mergeDiffSummary = useMemo(() => summarizeVersionDiff(mergeDiffRows), [mergeDiffRows])
  const previewRows = diffRows.filter(row => row.kind !== 'same').slice(0, 8)
  const mergePreviewRows = mergeDiffRows.filter(row => row.kind !== 'same').slice(0, 6)
  return (
    <details
      style={{
        borderTop: '1px solid var(--border)',
        padding: '8px 10px',
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          display: 'grid',
          gridTemplateColumns: 'minmax(120px, 1fr) minmax(0, 1.5fr) auto',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <span
          style={{
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {state.provider}
        </span>
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: 11,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {state.local_id || 'vault'} {state.remote_id ? `-> ${state.remote_id}` : ''}
        </span>
        <span
          style={{
            border: '1px solid var(--red-a20, var(--border))',
            borderRadius: '999px',
            color: 'var(--red)',
            fontSize: 10,
            fontWeight: 750,
            padding: '2px 7px',
            whiteSpace: 'nowrap',
          }}
        >
          {state.conflict_state}
        </span>
      </summary>
      <div
        style={{
          display: 'grid',
          gap: 6,
          marginTop: 8,
          color: 'var(--text-muted)',
          fontSize: 11,
          lineHeight: 1.45,
        }}
      >
        <div>{formatSyncConflictSummary(state)}</div>
        <div>
          Remote revision: <strong style={{ color: 'var(--text-secondary)' }}>{state.remote_rev || 'unknown'}</strong>
        </div>
        <div>Last synced: {formatSyncLedgerTimestamp(state.last_synced_at)}</div>
        {baseContent && (
          <div>
            Base version: <strong style={{ color: 'var(--text-secondary)' }}>available for merge review</strong>
          </div>
        )}
        {remoteContent && localContent !== null && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              background: 'var(--bg-white-02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                padding: '6px 8px',
                borderBottom: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 650,
              }}
            >
              <span>Remote preview</span>
              <span>
                {diffSummary.added} added, {diffSummary.removed} removed
              </span>
            </div>
            <div style={{ display: 'grid' }}>
              {previewRows.length === 0 ? (
                <div style={{ padding: '6px 8px', color: 'var(--text-muted)', fontSize: 11 }}>
                  Remote content matches the local note text.
                </div>
              ) : (
                previewRows.map((row, index) => (
                  <div
                    key={`${row.kind}-${index}-${row.text}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '18px minmax(0, 1fr)',
                      gap: 6,
                      padding: '3px 8px',
                      color: row.kind === 'added' ? 'var(--green)' : 'var(--red)',
                      background:
                        row.kind === 'added'
                          ? 'color-mix(in srgb, var(--green) 9%, transparent)'
                          : 'color-mix(in srgb, var(--red) 8%, transparent)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                    }}
                  >
                    <span>{row.kind === 'added' ? '+' : '-'}</span>
                    <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row.text || ' '}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {mergedContent && localContent !== null && mergedContent !== remoteContent && mergedContent !== localContent && (
          <div
            style={{
              border: '1px solid var(--accent-a20)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              background: 'color-mix(in srgb, var(--accent) 7%, transparent)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                padding: '6px 8px',
                borderBottom: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <span>Auto-merge preview</span>
              <span>
                {mergeDiffSummary.added} added, {mergeDiffSummary.removed} removed
              </span>
            </div>
            <div style={{ display: 'grid' }}>
              {mergePreviewRows.length === 0 ? (
                <div style={{ padding: '6px 8px', color: 'var(--text-muted)', fontSize: 11 }}>
                  The merged version matches the local note text.
                </div>
              ) : (
                mergePreviewRows.map((row, index) => (
                  <div
                    key={`merge-${row.kind}-${index}-${row.text}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '18px minmax(0, 1fr)',
                      gap: 6,
                      padding: '3px 8px',
                      color: row.kind === 'added' ? 'var(--green)' : 'var(--red)',
                      background:
                        row.kind === 'added'
                          ? 'color-mix(in srgb, var(--green) 9%, transparent)'
                          : 'color-mix(in srgb, var(--red) 8%, transparent)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                    }}
                  >
                    <span>{row.kind === 'added' ? '+' : '-'}</span>
                    <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row.text || ' '}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {state.local_id && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => onOpenNote(state.local_id)}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px 8px',
                fontSize: 12,
              }}
            >
              Open local note
            </button>
            {remoteContent && (
              <button
                type="button"
                onClick={() => onSuggestRemote(state)}
                style={{
                  border: '1px solid var(--accent-a20)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-a12)',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  padding: '6px 8px',
                  fontSize: 12,
                  fontWeight: 650,
                }}
              >
                Suggest remote version
              </button>
            )}
            {remoteContent && localContent !== null && (
              <button
                type="button"
                onClick={() => onReviewMerge(state)}
                style={{
                  border: '1px solid var(--accent-a20)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-a12)',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  padding: '6px 8px',
                  fontSize: 12,
                  fontWeight: 650,
                }}
              >
                Review merge
              </button>
            )}
            <button
              type="button"
              onClick={() => onKeepLocal(state)}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-white-04)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px 8px',
                fontSize: 12,
              }}
            >
              Keep local version
            </button>
          </div>
        )}
        {payload !== '{}' && (
          <pre
            style={{
              margin: 0,
              maxHeight: 170,
              overflow: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-base)',
              color: 'var(--text-secondary)',
              padding: 8,
              fontSize: 11,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            {payload}
          </pre>
        )}
      </div>
    </details>
  )
}

function SyncConflictMergeDialog({
  request,
  saving,
  onCreate,
  onCancel,
}: {
  request: MergeConflictReviewRequest
  saving: boolean
  onCreate: (content: string) => void
  onCancel: () => void
}) {
  const [content, setContent] = useState(request.initialContent)
  useEffect(() => {
    setContent(request.initialContent)
  }, [request])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const canCreate = content.trim().length > 0 && content.trimEnd() !== request.localContent.trimEnd()
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review sync merge"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onCancel()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'calc(var(--z-modal) + 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <section
        style={{
          width: 'min(860px, calc(100vw - 32px))',
          maxHeight: 'min(820px, calc(100vh - 32px))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-panel)',
          boxShadow: '0 24px 80px var(--overlay-heavy)',
        }}
      >
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Review sync merge</div>
          <div style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: 12 }}>
            {request.noteTitle} · {request.state.provider} · {request.state.remote_id}
          </div>
        </div>
        <div style={{ overflow: 'auto', padding: 14, display: 'grid', gap: 10 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            <MergeSourcePreview label="Local" content={request.localContent} />
            <MergeSourcePreview label="Remote" content={request.remoteContent} />
            <MergeSourcePreview label="Base" content={request.baseContent ?? 'No base version in conflict payload.'} />
          </div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>
              Merged Markdown
            </span>
            <textarea
              aria-label="Merged Markdown"
              value={content}
              autoFocus
              onChange={event => setContent(event.target.value)}
              style={{
                minHeight: 280,
                width: '100%',
                resize: 'vertical',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                padding: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.55,
              }}
            />
          </label>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.45 }}>
            {request.autoMerged
              ? 'Started from an automatic non-overlapping line merge. Edit before creating the review suggestion.'
              : 'Started from local and remote conflict sections. Replace the markers with the final text before accepting later.'}
          </div>
        </div>
        <div
          style={{
            padding: 12,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px 11px',
              fontSize: 12,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canCreate || saving}
            onClick={() => onCreate(content)}
            style={{
              border: '1px solid var(--accent-a20)',
              borderRadius: 'var(--radius-sm)',
              background: canCreate ? 'var(--accent-a12)' : 'var(--bg-muted)',
              color: canCreate ? 'var(--accent)' : 'var(--text-muted)',
              cursor: saving ? 'wait' : canCreate ? 'pointer' : 'not-allowed',
              padding: '7px 11px',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Create merge suggestion
          </button>
        </div>
      </section>
    </div>
  )
}

function MergeSourcePreview({ label, content }: { label: string; content: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, marginBottom: 5 }}>{label}</div>
      <pre
        style={{
          margin: 0,
          minHeight: 92,
          maxHeight: 130,
          overflow: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-white-02)',
          color: 'var(--text-secondary)',
          padding: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
        }}
      >
        {content}
      </pre>
    </div>
  )
}

function PathRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 5 }}>{label}</div>
      <div
        style={{
          color: 'var(--text-secondary)',
          background: 'var(--bg-white-02)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 10px',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function LocalCollabDraftDialog({
  drafts,
  localContent,
  baseContent,
  onApply,
  onDismiss,
  onClose,
}: {
  drafts: LocalCollabDraft[]
  localContent: string
  baseContent: string
  onApply: (draft: LocalCollabDraft) => void
  onDismiss: (draftId: string) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Incoming local drafts"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.34)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <aside
        style={{
          width: 'min(500px, calc(100vw - 24px))',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          boxShadow: '-18px 0 60px var(--overlay-heavy)',
        }}
      >
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Local collaboration</div>
          <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--text-primary)' }}>Incoming drafts</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {drafts.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5, padding: 12 }}>
              No incoming local drafts.
            </div>
          ) : (
            drafts.map(draft => {
              const merge = mergeLocalCollabDraft(localContent, baseContent, draft)
              const statusLabel =
                merge.status === 'apply-remote'
                  ? 'Safe to apply'
                  : merge.status === 'merge-remote'
                    ? 'Safe to merge'
                  : merge.status === 'conflict'
                    ? 'Conflict'
                    : merge.status === 'keep-local'
                      ? 'Already covered locally'
                      : 'Already applied'
              const statusColor = merge.status === 'conflict' ? 'var(--red)' : 'var(--accent)'
              return (
                <div key={draft.id} style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: 650,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {draft.peer.name}
                    </div>
                    <div
                      style={{
                        color: statusColor,
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '2px 6px',
                        fontSize: 10,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {statusLabel}
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>
                    {new Date(draft.updatedAt).toLocaleString()}
                  </div>
                  <pre
                    style={{
                      maxHeight: 170,
                      overflow: 'auto',
                      margin: '8px 0 0',
                      padding: 8,
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-white-02)',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {draft.content.length > 800 ? `${draft.content.slice(0, 800)}...` : draft.content}
                  </pre>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => onDismiss(draft.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '5px 9px',
                        fontSize: 11,
                      }}
                    >
                      Keep mine
                    </button>
                    <button
                      type="button"
                      onClick={() => onApply(draft)}
                      style={{
                        background: merge.status === 'conflict' ? 'var(--red)' : 'var(--accent-dim)',
                        border: '1px solid transparent',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-on-color)',
                        cursor: 'pointer',
                        padding: '5px 9px',
                        fontSize: 11,
                      }}
                    >
                      {merge.status === 'conflict' ? 'Replace mine' : 'Apply'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-white-04)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px 12px',
              fontSize: 12,
            }}
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  )
}

function DraftRecoveryDialog({
  drafts,
  onRestore,
  onDiscard,
  onRefresh,
  onClose,
}: {
  drafts: VaultRecoverableDraft[]
  onRestore: (id: string) => void
  onDiscard: (id: string) => void
  onRefresh: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recovered drafts"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.34)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <aside
        style={{
          width: 'min(460px, calc(100vw - 24px))',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          boxShadow: '-18px 0 60px var(--overlay-heavy)',
        }}
      >
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Crash recovery</div>
          <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--text-primary)' }}>Recovered drafts</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {drafts.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5, padding: 12 }}>
              No unsynced local drafts.
            </div>
          ) : (
            drafts.map(draft => (
              <div key={draft.id} style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>
                <div
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 650,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {draft.title}
                </div>
                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {draft.folder || 'Vault root'} - {new Date(draft.updated_at).toLocaleString()}
                </div>
                <pre
                  style={{
                    maxHeight: 120,
                    overflow: 'auto',
                    margin: '8px 0 0',
                    padding: 8,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-white-02)',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {draft.content.length > 600 ? `${draft.content.slice(0, 600)}...` : draft.content}
                </pre>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => onDiscard(draft.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '5px 9px',
                      fontSize: 11,
                    }}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => onRestore(draft.id)}
                    style={{
                      background: 'var(--accent-dim)',
                      border: '1px solid transparent',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-on-color)',
                      cursor: 'pointer',
                      padding: '5px 9px',
                      fontSize: 11,
                    }}
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div
          style={{
            padding: 12,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onRefresh}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px 12px',
              fontSize: 12,
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-white-04)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px 12px',
              fontSize: 12,
            }}
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  )
}

export {
  VaultStatusDialog,
  SyncConflictMergeDialog,
  QueuedEditsDialog,
  LocalCollabDraftDialog,
  DraftRecoveryDialog,
}
