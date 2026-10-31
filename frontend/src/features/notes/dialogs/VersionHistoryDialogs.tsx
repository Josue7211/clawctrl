import type { VaultRevision, VaultRevisionDetail } from '@/features/notes/storage/vault'
import {
  useState,
  useMemo,
  useEffect,
  useRef,
} from 'react'
import {
  buildVersionDiff,
  summarizeVersionDiff,
  VERSION_RESTORE_SAFETY_NOTE,
} from '@/features/notes/versionDiff'
import { GitBranch } from '@phosphor-icons/react'
import { type VersionNameRequest } from '@/features/notes/workspaceTypes'

function VersionHistoryDialog({
  noteTitle,
  currentContent,
  revisions,
  preview,
  loading,
  error,
  onCreateCheckpoint,
  onPreview,
  onRename,
  onCopyToCurrent,
  onRestore,
  onClose,
}: {
  noteTitle: string
  currentContent: string
  revisions: VaultRevision[]
  preview: VaultRevisionDetail | null
  loading: boolean
  error: string | null
  onCreateCheckpoint: () => void
  onPreview: (rev: string) => void
  onRename: (rev: string, currentLabel?: string | null) => void
  onCopyToCurrent: (rev: string) => void
  onRestore: (rev: string) => void
  onClose: () => void
}) {
  const [compareMode, setCompareMode] = useState(false)
  const diffRows = useMemo(
    () => (preview ? buildVersionDiff(preview.content, currentContent) : []),
    [currentContent, preview],
  )
  const diffSummary = useMemo(() => summarizeVersionDiff(diffRows), [diffRows])

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
      aria-label="Version history"
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
          width: 'min(760px, calc(100vw - 24px))',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          boxShadow: '-18px 0 60px var(--overlay-heavy)',
        }}
      >
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Version history</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {noteTitle}
          </div>
        </div>
        <div style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onCreateCheckpoint}
            style={{
              background: 'var(--bg-white-04)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px 10px',
              fontSize: 12,
            }}
          >
            Name current version
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) 1fr' }}>
          <div style={{ overflow: 'auto', borderRight: '1px solid var(--border)', padding: 12 }}>
            {loading && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 12 }}>Loading versions...</div>
            )}
            {error && <div style={{ color: 'var(--red)', fontSize: 12, lineHeight: 1.5, padding: 12 }}>{error}</div>}
            {!loading && !error && revisions.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5, padding: 12 }}>
                No local versions yet. Autosave and named checkpoints appear here.
              </div>
            )}
            {!loading &&
              !error &&
              revisions.map((revision, index) => {
                const selected = preview?.rev === revision.rev
                const title =
                  revision.label ||
                  (index === 0 ? 'Current version' : `Version ${revision.version_number ?? revisions.length - index}`)
                return (
                  <button
                    key={revision.rev}
                    type="button"
                    onClick={() => onPreview(revision.rev)}
                    style={{
                      width: '100%',
                      display: 'block',
                      padding: '10px 8px',
                      border: 'none',
                      borderBottom: '1px solid var(--border)',
                      borderRadius: 0,
                      background: selected ? 'var(--bg-white-04)' : 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {title}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 3,
                      }}
                    >
                      {revision.reason || revision.status}
                      {revision.created_at
                        ? ` - ${new Date(revision.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                        : ''}
                    </span>
                  </button>
                )
              })}
          </div>
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {preview ? (
              <>
                <div
                  style={{
                    padding: 12,
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {preview.label || `Version ${preview.version_number ?? ''}`}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                      {preview.reason || 'version'}
                      {preview.created_at ? ` - ${new Date(preview.created_at).toLocaleString()}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompareMode(value => !value)}
                    style={{
                      background: compareMode ? 'var(--accent-dim)' : 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: compareMode ? 'var(--text-on-color)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '5px 9px',
                      fontSize: 11,
                    }}
                  >
                    {compareMode ? 'Preview' : 'Compare'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRename(preview.rev, preview.label)}
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
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopyToCurrent(preview.rev)}
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
                    Copy to current
                  </button>
                  <button
                    type="button"
                    onClick={() => onRestore(preview.rev)}
                    style={{
                      background: 'var(--bg-white-04)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '5px 9px',
                      fontSize: 11,
                    }}
                  >
                    Restore
                  </button>
                </div>
                <div
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    lineHeight: 1.45,
                  }}
                >
                  {VERSION_RESTORE_SAFETY_NOTE}
                </div>
                {compareMode ? (
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflow: 'auto',
                      padding: 12,
                      background: 'var(--bg-base)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      lineHeight: 1.55,
                    }}
                  >
                    <div style={{ color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: 11, marginBottom: 10 }}>
                      {diffSummary.added} added, {diffSummary.removed} removed
                    </div>
                    {diffRows.map((row, index) => (
                      <div
                        key={`${row.kind}-${index}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '22px 1fr',
                          gap: 8,
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          color:
                            row.kind === 'removed'
                              ? 'var(--red)'
                              : row.kind === 'added'
                                ? 'var(--green)'
                                : 'var(--text-secondary)',
                          background:
                            row.kind === 'removed'
                              ? 'rgba(239, 68, 68, 0.10)'
                              : row.kind === 'added'
                                ? 'rgba(34, 197, 94, 0.10)'
                                : 'transparent',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', userSelect: 'none' }}>
                          {row.kind === 'removed' ? '-' : row.kind === 'added' ? '+' : ' '}
                        </span>
                        <span>{row.text || ' '}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre
                    style={{
                      flex: 1,
                      minHeight: 0,
                      margin: 0,
                      overflow: 'auto',
                      padding: 16,
                      background: 'var(--bg-base)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {preview.content}
                  </pre>
                )}
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                }}
              >
                Select a version to preview
              </div>
            )}
          </div>
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

function VersionNameDialog({
  request,
  loading,
  onSubmit,
  onCancel,
}: {
  request: VersionNameRequest
  loading: boolean
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(request.mode === 'rename' ? request.currentLabel ?? '' : '')
  const trimmed = value.trim()
  const valid = request.mode === 'rename' ? trimmed !== (request.currentLabel ?? '').trim() : trimmed.length > 0
  const title = request.mode === 'rename' ? 'Rename version' : 'Name current version'

  useEffect(() => {
    setValue(request.mode === 'rename' ? request.currentLabel ?? '' : '')
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [request.currentLabel, request.mode])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !loading) onCancel()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0, 0, 0, 0.42)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <form
        aria-label={title}
        onSubmit={event => {
          event.preventDefault()
          if (valid && !loading) onSubmit(trimmed)
        }}
        style={{
          width: 'min(420px, 100%)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-panel)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <GitBranch size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>{title}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {request.mode === 'rename' ? 'Update or clear this saved version name.' : 'Create a named checkpoint for the current note.'}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="hover-bg"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: loading ? 'default' : 'pointer',
              padding: '6px 10px',
              fontSize: 12,
            }}
          >
            Cancel
          </button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Version name</span>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={event => setValue(event.target.value)}
              placeholder="Draft before review"
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                padding: '8px 9px',
                font: 'inherit',
                fontSize: 13,
                minWidth: 0,
                outline: 'none',
              }}
            />
          </label>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-white-02)',
              color: valid ? 'var(--text-secondary)' : 'var(--text-muted)',
              padding: '8px 10px',
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            {request.mode === 'rename'
              ? 'Leave blank and save to clear the visible name.'
              : 'Named versions make important checkpoints easier to find later.'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: loading ? 'default' : 'pointer',
                padding: '7px 11px',
                fontSize: 12,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid || loading}
              style={{
                border: '1px solid var(--accent-a20)',
                borderRadius: 'var(--radius-sm)',
                background: valid && !loading ? 'var(--accent-a12)' : 'var(--bg-muted)',
                color: valid && !loading ? 'var(--accent)' : 'var(--text-muted)',
                cursor: valid && !loading ? 'pointer' : 'not-allowed',
                padding: '7px 11px',
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              {loading ? 'Saving...' : title}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export { VersionHistoryDialog, VersionNameDialog }
