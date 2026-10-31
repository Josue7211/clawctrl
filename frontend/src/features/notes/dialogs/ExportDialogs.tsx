import { type ReviewPackagePermission } from '@/features/notes/export'
import { useRef, useState, useEffect } from 'react'
import { ShareNetwork, UploadSimple, ShieldCheck } from '@phosphor-icons/react'
import {
  type ReviewPackageRequest,
  type PluginMarketplaceFeedRequest,
  type EncryptedBackupRequest,
} from '@/features/notes/workspaceTypes'

function ReviewPackageDialog({
  request,
  onSubmit,
  onCancel,
}: {
  request: ReviewPackageRequest
  onSubmit: (permission: ReviewPackagePermission, recipient: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [permission, setPermission] = useState<ReviewPackagePermission>('suggest')
  const [recipient, setRecipient] = useState('')

  useEffect(() => {
    setPermission('suggest')
    setRecipient('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [request.noteId])

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
        if (event.target === event.currentTarget) onCancel()
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
        aria-label="Private share package"
        onSubmit={event => {
          event.preventDefault()
          onSubmit(permission, recipient)
        }}
        style={{
          width: 'min(460px, 100%)',
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
          <ShareNetwork size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Private share package</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {request.title}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="hover-bg"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: 12,
            }}
          >
            Cancel
          </button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Permission</span>
            <select
              aria-label="Permission"
              value={permission}
              onChange={event => setPermission(event.target.value as ReviewPackagePermission)}
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
            >
              <option value="view">View only</option>
              <option value="comment">Comment</option>
              <option value="suggest">Suggest edits</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Recipient</span>
            <input
              ref={inputRef}
              type="text"
              aria-label="Recipient"
              value={recipient}
              onChange={event => setRecipient(event.target.value)}
              placeholder="Name or email, optional"
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
              color: 'var(--text-secondary)',
              padding: '8px 10px',
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            Exports a local review package with the current document, comments, suggestions, and selected role.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
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
              type="submit"
              style={{
                border: '1px solid var(--accent-a20)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-a12)',
                color: 'var(--accent)',
                cursor: 'pointer',
                padding: '7px 11px',
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              Export share package
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function PluginMarketplaceFeedDialog({
  request,
  onSubmit,
  onCancel,
}: {
  request: PluginMarketplaceFeedRequest
  onSubmit: (url: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(request.defaultUrl)
  const trimmed = value.trim()

  useEffect(() => {
    setValue(request.defaultUrl)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [request.defaultUrl])

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
        if (event.target === event.currentTarget) onCancel()
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
        aria-label="Import plugin marketplace feed"
        onSubmit={event => {
          event.preventDefault()
          if (trimmed) onSubmit(trimmed)
        }}
        style={{
          width: 'min(460px, 100%)',
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
          <UploadSimple size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Import marketplace feed</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Fetch signed plugin package metadata into a local vault note.
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="hover-bg"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: 12,
            }}
          >
            Cancel
          </button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Feed URL</span>
            <input
              ref={inputRef}
              type="url"
              aria-label="Feed URL"
              value={value}
              onChange={event => setValue(event.target.value)}
              placeholder="https://plugins.example/feed.json"
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
              color: 'var(--text-secondary)',
              padding: '8px 10px',
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            HTTPS feeds are fetched without credentials. Local HTTP is only accepted for development hosts.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
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
              type="submit"
              disabled={!trimmed}
              style={{
                border: '1px solid var(--accent-a20)',
                borderRadius: 'var(--radius-sm)',
                background: trimmed ? 'var(--accent-a12)' : 'var(--bg-muted)',
                color: trimmed ? 'var(--accent)' : 'var(--text-muted)',
                cursor: trimmed ? 'pointer' : 'not-allowed',
                padding: '7px 11px',
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              Import feed
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function EncryptedBackupPasswordDialog({
  request,
  onSubmit,
  onCancel,
}: {
  request: EncryptedBackupRequest
  onSubmit: (password: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const isExport = request.mode === 'export'
  const valid = password.length > 0 && (!isExport || confirmation === password)
  const title = isExport ? 'Export encrypted vault backup' : 'Import encrypted vault backup'
  const helper = isExport
    ? confirmation && confirmation !== password
      ? 'Backup passwords do not match.'
      : 'Choose a password for this local encrypted vault backup.'
    : `Enter the password for ${request.fileName || 'this encrypted vault backup'}.`

  useEffect(() => {
    setPassword('')
    setConfirmation('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [request.mode, request.fileName])

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
        if (event.target === event.currentTarget) onCancel()
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
          if (valid) onSubmit(password)
        }}
        style={{
          width: 'min(440px, 100%)',
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
          <ShieldCheck size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>{title}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isExport ? 'Create a password-protected local vault backup.' : request.fileName || 'Restore a local encrypted vault backup.'}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="hover-bg"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: 12,
            }}
          >
            Cancel
          </button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Password</span>
            <input
              ref={inputRef}
              type="password"
              aria-label="Password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="new-password"
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
          {isExport && (
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Confirm password</span>
              <input
                type="password"
                aria-label="Confirm password"
                value={confirmation}
                onChange={event => setConfirmation(event.target.value)}
                autoComplete="new-password"
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
          )}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-white-02)',
              color: isExport && confirmation && confirmation !== password ? 'var(--red)' : 'var(--text-secondary)',
              padding: '8px 10px',
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            {helper}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
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
              type="submit"
              disabled={!valid}
              style={{
                border: '1px solid var(--accent-a20)',
                borderRadius: 'var(--radius-sm)',
                background: valid ? 'var(--accent-a12)' : 'var(--bg-muted)',
                color: valid ? 'var(--accent)' : 'var(--text-muted)',
                cursor: valid ? 'pointer' : 'not-allowed',
                padding: '7px 11px',
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              {isExport ? 'Export backup' : 'Import backup'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export { ReviewPackageDialog, PluginMarketplaceFeedDialog, EncryptedBackupPasswordDialog }
