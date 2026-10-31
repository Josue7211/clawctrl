import {
  useRef,
  useState,
  useEffect,
  useMemo,
} from 'react'
import { FileText, FolderPlus, FolderOpen } from '@phosphor-icons/react'
import { normalizeFolderPath } from '@/features/notes/storage/vault'
import {
  type ConfirmActionRequest,
  type NoticeRequest,
  type TemplatePromptRequest,
  type TemplateNameRequest,
  type FolderCreateRequest,
  type FolderRenameRequest,
  type MoveNoteRequest,
  type WorkspaceRenameRequest,
} from '@/features/notes/workspaceTypes'
import { viewModeLabel } from '@/features/notes/workspaceHelpers'

function ConfirmActionDialog({
  request,
  onCancel,
  onSettled,
}: {
  request: ConfirmActionRequest
  onCancel: () => void
  onSettled: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const [loading, setLoading] = useState(false)
  const danger = request.tone === 'danger'

  useEffect(() => {
    requestAnimationFrame(() => confirmRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [loading, onCancel])

  return (
    <div
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !loading) onCancel()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.42)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        aria-label={request.title}
        onSubmit={event => {
          event.preventDefault()
          if (loading) return
          setLoading(true)
          void Promise.resolve(request.onConfirm()).finally(onSettled)
        }}
        style={{
          width: 'min(440px, 100%)',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>{request.title}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Confirm the vault action before continuing.</div>
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
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-white-02)',
              color: 'var(--text-secondary)',
              padding: '9px 10px',
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            {request.detail}
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
                opacity: loading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              ref={confirmRef}
              type="submit"
              disabled={loading}
              style={{
                border: danger ? '1px solid color-mix(in srgb, var(--red) 34%, var(--border))' : '1px solid var(--accent-a20)',
                borderRadius: 'var(--radius-sm)',
                background: danger ? 'color-mix(in srgb, var(--red) 11%, transparent)' : 'var(--accent-a12)',
                color: danger ? 'var(--red)' : 'var(--accent)',
                cursor: loading ? 'default' : 'pointer',
                padding: '7px 11px',
                fontSize: 12,
                fontWeight: 650,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Working...' : request.confirmLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function NoticeDialog({
  request,
  onClose,
}: {
  request: NoticeRequest
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const toneColor = request.tone === 'danger'
    ? 'var(--red)'
    : request.tone === 'warning'
      ? 'var(--warning)'
      : 'var(--accent)'

  useEffect(() => {
    requestAnimationFrame(() => closeRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.42)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={request.title}
        style={{
          width: 'min(420px, 100%)',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>{request.title}</div>
            <div style={{ color: toneColor, fontSize: 11 }}>Notes vault</div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
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
            {request.actionLabel ?? 'Close'}
          </button>
        </div>
        <div style={{ padding: 16 }}>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-white-02)',
              color: 'var(--text-secondary)',
              padding: '9px 10px',
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            {request.detail}
          </div>
        </div>
      </section>
    </div>
  )
}

function TemplatePromptDialog({
  request,
  onSubmit,
  onCancel,
}: {
  request: TemplatePromptRequest
  onSubmit: (values: Record<string, string>) => void
  onCancel: () => void
}) {
  const firstInputRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(request.prompts.map(prompt => [prompt.name, prompt.defaultValue])),
  )

  useEffect(() => {
    setValues(Object.fromEntries(request.prompts.map(prompt => [prompt.name, prompt.defaultValue])))
    requestAnimationFrame(() => firstInputRef.current?.focus())
  }, [request])

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
        background: 'rgba(0, 0, 0, 0.42)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={event => {
          event.preventDefault()
          onSubmit(values)
        }}
        style={{
          width: 'min(460px, 100%)',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Template values</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {request.templateLabel}
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
          {request.prompts.map((prompt, index) => (
            <label key={prompt.name} style={{ display: 'grid', gap: 5 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>{prompt.name}</span>
              <input
                ref={index === 0 ? firstInputRef : undefined}
                type="text"
                value={values[prompt.name] ?? ''}
                placeholder={prompt.defaultValue}
                onChange={event => setValues(prev => ({ ...prev, [prompt.name]: event.target.value }))}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  padding: '8px 9px',
                  font: 'inherit',
                  fontSize: 13,
                  minWidth: 0,
                }}
              />
            </label>
          ))}
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
              Apply
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function TemplateNameDialog({
  request,
  onSubmit,
  onCancel,
}: {
  request: TemplateNameRequest
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(request.defaultTitle)
  const trimmed = value.trim()

  useEffect(() => {
    setValue(request.defaultTitle)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [request.defaultTitle])

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
        background: 'rgba(0, 0, 0, 0.42)',
        backdropFilter: 'blur(8px)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        aria-label="Save current note as template"
        onSubmit={event => {
          event.preventDefault()
          if (trimmed) onSubmit(trimmed)
        }}
        style={{
          width: 'min(420px, 100%)',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
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
          <FileText size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Save as template</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Store this note in the Templates folder for reuse.
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
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Template name</span>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={event => setValue(event.target.value)}
              placeholder="Project brief template"
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
            The saved template keeps the current note body and adds template frontmatter.
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
              Save template
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function FolderNameDialog({
  mode,
  request,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'rename'
  request: FolderCreateRequest | FolderRenameRequest
  onSubmit: (value: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isRename = mode === 'rename'
  const renameRequest = isRename ? request as FolderRenameRequest : null
  const createRequest = isRename ? null : request as FolderCreateRequest
  const [value, setValue] = useState(isRename ? renameRequest?.path ?? '' : '')
  const normalized = normalizeFolderPath(value)
  const unchanged = !!renameRequest && normalized === renameRequest.path
  const insideSelf = !!renameRequest && normalized.startsWith(`${renameRequest.path}/`)
  const valid = normalized.length > 0 && !unchanged && !insideSelf
  const title = isRename ? 'Rename folder' : 'Create folder'
  const inputLabel = isRename ? 'Folder path' : 'Folder name'
  const detail = isRename
    ? `${renameRequest?.affectedNoteCount ?? 0} note${renameRequest?.affectedNoteCount === 1 ? '' : 's'} and ${renameRequest?.affectedFolderCount ?? 0} folder${renameRequest?.affectedFolderCount === 1 ? '' : 's'}`
    : createRequest?.parent
      ? `Inside ${createRequest.parent}`
      : 'Vault root'
  const helper = isRename
    ? insideSelf
      ? 'A folder cannot be renamed inside itself.'
      : unchanged
        ? 'Choose a different folder path.'
        : valid
          ? `Renames this folder to ${normalized}.`
          : 'Folder path cannot be empty.'
    : valid
      ? `Creates ${normalizeFolderPath(createRequest?.parent ? `${createRequest.parent}/${value}` : value)}.`
      : 'Folder name cannot be empty.'

  useEffect(() => {
    setValue(isRename ? renameRequest?.path ?? '' : '')
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [isRename, renameRequest?.path])

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
        background: 'rgba(0, 0, 0, 0.42)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        aria-label={title}
        onSubmit={event => {
          event.preventDefault()
          if (valid) onSubmit(isRename ? normalized : value)
        }}
        style={{
          width: 'min(420px, 100%)',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
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
          <FolderPlus size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>{title}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {detail}
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
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>{inputLabel}</span>
            <input
              ref={inputRef}
              type="text"
              aria-label={inputLabel}
              value={value}
              onChange={event => setValue(event.target.value)}
              placeholder={isRename ? 'Projects/Archive' : 'Projects'}
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
              color: valid || unchanged ? 'var(--text-secondary)' : 'var(--red)',
              padding: '8px 10px',
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
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
              {title}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function MoveNoteDialog({
  request,
  onSubmit,
  onCancel,
}: {
  request: MoveNoteRequest
  onSubmit: (folder: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const currentFolder = normalizeFolderPath(request.currentFolder)
  const folderOptions = useMemo(
    () => [...new Set(request.folders.map(folder => normalizeFolderPath(folder)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [request.folders],
  )
  const [value, setValue] = useState(currentFolder)
  const normalized = normalizeFolderPath(value)
  const changed = normalized !== currentFolder
  const helper = changed
    ? normalized
      ? `Moves ${request.title} to ${normalized}.`
      : `Moves ${request.title} to the vault root.`
    : 'Choose a different destination folder.'

  useEffect(() => {
    setValue(currentFolder)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [currentFolder])

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
        background: 'rgba(0, 0, 0, 0.42)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        aria-label="Move note"
        onSubmit={event => {
          event.preventDefault()
          if (changed) onSubmit(normalized)
        }}
        style={{
          width: 'min(440px, 100%)',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
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
          <FolderOpen size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Move note</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {request.title} from {currentFolder || 'Vault root'}
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
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Existing folders</span>
            <select
              aria-label="Existing folders"
              value={folderOptions.includes(normalized) || normalized === '' ? normalized : '__custom__'}
              onChange={event => {
                if (event.currentTarget.value !== '__custom__') setValue(event.currentTarget.value)
              }}
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
              <option value="">Vault root</option>
              {folderOptions.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
              {!folderOptions.includes(normalized) && normalized && (
                <option value="__custom__">Custom: {normalized}</option>
              )}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Destination folder</span>
            <input
              ref={inputRef}
              type="text"
              aria-label="Destination folder"
              value={value}
              onChange={event => setValue(event.target.value)}
              placeholder="Leave blank for vault root"
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
              color: changed ? 'var(--text-secondary)' : 'var(--text-muted)',
              padding: '8px 10px',
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
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
              disabled={!changed}
              style={{
                border: '1px solid var(--accent-a20)',
                borderRadius: 'var(--radius-sm)',
                background: changed ? 'var(--accent-a12)' : 'var(--bg-muted)',
                color: changed ? 'var(--accent)' : 'var(--text-muted)',
                cursor: changed ? 'pointer' : 'not-allowed',
                padding: '7px 11px',
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              Move note
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function WorkspaceRenameDialog({
  request,
  onSubmit,
  onCancel,
}: {
  request: WorkspaceRenameRequest
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(request.currentName)
  const normalized = value.trim()
  const valid = normalized.length > 0 && normalized !== request.currentName

  useEffect(() => {
    setValue(request.currentName)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [request.currentName])

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
        background: 'rgba(0, 0, 0, 0.42)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        aria-label="Rename workspace"
        onSubmit={event => {
          event.preventDefault()
          if (valid) onSubmit(normalized)
        }}
        style={{
          width: 'min(420px, 100%)',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Rename workspace</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {viewModeLabel(request.viewMode)} layout preset
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
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Workspace name</span>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={event => setValue(event.target.value)}
              style={{
                width: '100%',
                minWidth: 0,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                padding: '8px 9px',
                font: 'inherit',
                fontSize: 13,
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
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {normalized.length === 0
              ? 'Workspace names cannot be empty.'
              : valid
                ? 'Renames this local workspace preset without changing the layout.'
                : 'Choose a different workspace name.'}
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
              Rename workspace
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export {
  ConfirmActionDialog,
  NoticeDialog,
  TemplatePromptDialog,
  TemplateNameDialog,
  FolderNameDialog,
  MoveNoteDialog,
  WorkspaceRenameDialog,
}
