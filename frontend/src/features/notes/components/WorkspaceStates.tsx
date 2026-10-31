import { useState, useEffect } from 'react'
import { ShareNetwork, CloudSlash, ArrowClockwise } from '@phosphor-icons/react'

function AttachmentPreview({ id }: { id: string }) {
  const name = id.split('/').pop() || id
  const [src, setSrc] = useState(() => `/api/vault/local/media?id=${encodeURIComponent(id)}`)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSrc(`/api/vault/local/media?id=${encodeURIComponent(id)}`)
    setError(null)
  }, [id])

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        padding: 32,
        background: 'var(--bg-base)',
      }}
    >
      {!error && (
        <img
          src={src}
          alt={name}
          onError={() => {
            setError('Failed to load image')
          }}
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: 8,
            boxShadow: '0 2px 16px var(--overlay-light)',
          }}
        />
      )}
      {error && (
        <button
          onClick={() => {
            setError(null)
            setSrc(`/api/vault/local/media?id=${encodeURIComponent(id)}`)
          }}
          style={{
            background: 'var(--bg-white-04)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '8px 16px',
            fontSize: 12,
          }}
        >
          Retry loading image
        </button>
      )}
      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          color: 'var(--text-muted)',
          opacity: 0.6,
        }}
      >
        {name}
      </div>
    </div>
  )
}

function EmptyState({ onCreateNote }: { onCreateNote: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        color: 'var(--text-muted)',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--bg-white-02)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ShareNetwork size={22} style={{ opacity: 0.3, color: 'var(--accent)' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 4,
            color: 'var(--text-secondary)',
          }}
        >
          Your knowledge graph awaits
        </div>
        <div style={{ fontSize: 12, maxWidth: 280, lineHeight: 1.6, opacity: 0.6 }}>
          Create notes and link them with [[wikilinks]]
        </div>
      </div>
      <button
        onClick={onCreateNote}
        style={{
          background: 'var(--accent-dim)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-on-color)',
          cursor: 'pointer',
          padding: '7px 18px',
          fontSize: 12,
          fontWeight: 500,
          transition: 'opacity var(--duration-fast)',
        }}
        onMouseEnter={e => {
          ;(e.target as HTMLButtonElement).style.opacity = '0.85'
        }}
        onMouseLeave={e => {
          ;(e.target as HTMLButtonElement).style.opacity = '1'
        }}
      >
        Create first note
      </button>
    </div>
  )
}

function UnavailableNotesState({ count, onRetry }: { count: number; onRetry: () => void }) {
  return (
    <div
      data-testid="unavailable-notes-state"
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        color: 'var(--text-muted)',
        padding: 28,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 10,
          background: 'var(--bg-white-02)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CloudSlash size={21} style={{ opacity: 0.45, color: 'var(--text-muted)' }} />
      </div>
      <div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, marginBottom: 5 }}>
          Note bodies are still loading
        </div>
        <div style={{ maxWidth: 400, fontSize: 12, lineHeight: 1.6, opacity: 0.72 }}>
          {count} cached title{count === 1 ? ' is' : 's are'} visible in the sidebar, but editing is locked until the local vault returns the real file content.
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          background: 'var(--bg-white-04)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          padding: '7px 13px',
          fontSize: 12,
        }}
      >
        <ArrowClockwise size={13} />
        Retry loading
      </button>
    </div>
  )
}

export { UnavailableNotesState, AttachmentPreview, EmptyState }
