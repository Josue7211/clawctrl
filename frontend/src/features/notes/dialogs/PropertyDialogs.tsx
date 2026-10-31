import {
  useRef,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import {
  type DocumentPropertyValueKind,
  normalizeDocumentPropertyKey,
  formatDocumentPropertyInputValue,
} from '@/features/notes/documentProperties'
import { NotePencil, Table, ListBullets } from '@phosphor-icons/react'
import type { VaultNote } from '@/features/notes/types'
import { buildVaultPropertyIndex } from '@/features/notes/documentPropertiesIndex'
import { buildTagIndex } from '@/features/notes/tags'
import {
  type DocumentPropertyRequest,
  type TagRenameRequest,
  type TagRemoveRequest,
} from '@/features/notes/workspaceTypes'

function DocumentPropertyDialog({
  request,
  onSubmit,
  onCancel,
}: {
  request: DocumentPropertyRequest
  onSubmit: (key: string, value: string, sourceKey?: string) => void
  onCancel: () => void
}) {
  const propertyKeys = Object.keys(request.properties)
  const firstKey = request.sourceKey || request.defaultKey || propertyKeys[0] || ''
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)
  const [sourceKey, setSourceKey] = useState(firstKey)
  const [key, setKey] = useState(request.mode === 'remove' || request.mode === 'rename' ? firstKey : request.defaultKey || 'status')
  const [value, setValue] = useState(request.defaultValue || '')
  const [valueKind, setValueKind] = useState<DocumentPropertyValueKind>(request.defaultKind || 'text')
  const normalizedSourceKey = normalizeDocumentPropertyKey(sourceKey)
  const normalizedKey = normalizeDocumentPropertyKey(key)
  const valid = request.mode === 'rename'
    ? normalizedSourceKey.length > 0 && propertyKeys.includes(normalizedSourceKey) && normalizedKey.length > 0 && normalizedKey !== normalizedSourceKey
    : request.mode === 'remove'
      ? normalizedKey.length > 0 && propertyKeys.includes(normalizedKey)
      : normalizedKey.length > 0
  const title = request.mode === 'rename'
    ? 'Rename document property'
    : request.mode === 'remove'
      ? 'Remove document property'
      : 'Set document property'

  useEffect(() => {
    setSourceKey(firstKey)
    setKey(request.mode === 'remove' || request.mode === 'rename' ? firstKey : request.defaultKey || 'status')
    setValue(request.defaultValue || '')
    setValueKind(request.defaultKind || 'text')
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      if (inputRef.current instanceof HTMLInputElement) inputRef.current.select()
    })
  }, [firstKey, request.defaultKey, request.defaultKind, request.defaultValue, request.mode])

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
          if (valid) onSubmit(normalizedKey, formatDocumentPropertyInputValue(valueKind, value), normalizedSourceKey)
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
          <NotePencil size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>{title}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {request.mode === 'rename'
                ? 'Rename frontmatter metadata without changing its value.'
                : request.mode === 'remove'
                  ? 'Remove frontmatter metadata from this note.'
                  : 'Write frontmatter metadata for this note.'}
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
          {request.mode === 'rename' && (
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Current property</span>
              <select
                value={sourceKey}
                onChange={event => {
                  setSourceKey(event.target.value)
                  setKey(event.target.value)
                }}
                aria-label="Current property"
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
                {propertyKeys.map(propertyKey => (
                  <option key={propertyKey} value={propertyKey}>{propertyKey}</option>
                ))}
              </select>
            </label>
          )}
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>
              {request.mode === 'rename' ? 'New property name' : 'Property name'}
            </span>
            {request.mode === 'remove' && propertyKeys.length > 0 ? (
              <select
                ref={node => {
                  inputRef.current = node
                }}
                value={key}
                onChange={event => setKey(event.target.value)}
                aria-label="Property name"
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
                {propertyKeys.map(propertyKey => (
                  <option key={propertyKey} value={propertyKey}>{propertyKey}</option>
                ))}
              </select>
            ) : (
              <input
                ref={node => {
                  inputRef.current = node
                }}
                type="text"
                value={key}
                onChange={event => setKey(event.target.value)}
                aria-label={request.mode === 'rename' ? 'New property name' : 'Property name'}
                placeholder={request.mode === 'rename' ? 'review_status' : 'status'}
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
            )}
          </label>
          {request.mode === 'set' && (
            <>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Property type</span>
                <select
                  value={valueKind}
                  onChange={event => setValueKind(event.target.value as DocumentPropertyValueKind)}
                  aria-label="Property type"
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
                  <option value="text">Text</option>
                  <option value="list">List</option>
                  <option value="number">Number</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="date">Date</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Property value</span>
                <input
                  type={valueKind === 'date' ? 'date' : valueKind === 'number' ? 'number' : 'text'}
                  value={value}
                  onChange={event => setValue(event.target.value)}
                  aria-label="Property value"
                  placeholder={valueKind === 'list' ? 'draft, reviewed' : valueKind === 'checkbox' ? 'true' : 'draft'}
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
            </>
          )}
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
              ? propertyKeys.length === 0
                ? 'This note has no document properties to rename.'
                : normalizedKey === normalizedSourceKey
                  ? 'Enter a different destination property name.'
                  : `Renames ${normalizedSourceKey || 'property'} to ${normalizedKey || 'property'} in the note frontmatter.`
              : request.mode === 'remove'
              ? propertyKeys.length === 0
                ? 'This note has no document properties to remove.'
                : 'Removes the selected property from the note frontmatter.'
              : `Saves ${valueKind} metadata as ${normalizedKey || 'property'} in the note frontmatter.`}
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

function AllPropertiesDialog({
  notes,
  onOpenNote,
  onEditProperty,
  onRenameProperty,
  onRemoveProperty,
  onClose,
}: {
  notes: VaultNote[]
  onOpenNote: (id: string) => void
  onEditProperty: (noteId: string, key: string) => void
  onRenameProperty: (noteId: string, key: string) => void
  onRemoveProperty: (noteId: string, key: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const entries = useMemo(() => buildVaultPropertyIndex(notes, query), [notes, query])
  const totalProperties = useMemo(() => buildVaultPropertyIndex(notes), [notes])

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
      aria-label="All properties"
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
      <aside
        style={{
          width: 'min(760px, 100%)',
          maxHeight: '82vh',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
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
          <Table size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>All properties</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {totalProperties.length} property {totalProperties.length === 1 ? 'key' : 'keys'} across the vault
            </div>
          </div>
          <button
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
            Close
          </button>
        </div>
        <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Filter by key, value, note, or folder"
            aria-label="Filter properties"
            autoFocus
            style={{
              width: '100%',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              padding: '8px 10px',
              font: 'inherit',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ overflow: 'auto', padding: 14, display: 'grid', gap: 8 }}>
          {entries.length ? entries.map(entry => (
            <section
              key={entry.key}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-white-02)',
                padding: 10,
                display: 'grid',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 650 }}>{entry.key}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {entry.noteCount} {entry.noteCount === 1 ? 'note' : 'notes'} · {entry.kind}
                  </div>
                </div>
                <span
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-muted)',
                    padding: '3px 6px',
                    fontSize: 10,
                    textTransform: 'capitalize',
                  }}
                >
                  {entry.kind}
                </span>
              </div>
              {entry.values.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {entry.values.map(value => (
                    <span
                      key={value}
                      title={value}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-base)',
                        color: 'var(--text-secondary)',
                        padding: '4px 6px',
                        fontSize: 11,
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {value}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gap: 4 }}>
                {entry.notes.map(note => (
                  <div
                    key={note.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      className="hover-bg"
                      onClick={() => onOpenNote(note.id)}
                      style={{
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '5px 6px',
                        fontSize: 12,
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {note.title} <span style={{ color: 'var(--text-muted)' }}>{note.folder}</span>
                      {note.value && <span style={{ color: 'var(--text-muted)' }}> · {note.value}</span>}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <PropertyIndexActionButton label={`Edit ${entry.key} in ${note.title}`} onClick={() => onEditProperty(note.id, entry.key)}>
                        Edit
                      </PropertyIndexActionButton>
                      <PropertyIndexActionButton label={`Rename ${entry.key} in ${note.title}`} onClick={() => onRenameProperty(note.id, entry.key)}>
                        Rename
                      </PropertyIndexActionButton>
                      <PropertyIndexActionButton label={`Remove ${entry.key} from ${note.title}`} onClick={() => onRemoveProperty(note.id, entry.key)}>
                        Remove
                      </PropertyIndexActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )) : (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-white-02)',
                color: 'var(--text-muted)',
                padding: 14,
                fontSize: 12,
              }}
            >
              No properties match this filter.
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function AllTagsDialog({
  notes,
  onOpenNote,
  onRenameTag,
  onRemoveTag,
  currentNote,
  onApplyTagToCurrent,
  onFilterTag,
  onClose,
}: {
  notes: VaultNote[]
  onOpenNote: (id: string) => void
  onRenameTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  currentNote: VaultNote | null
  onApplyTagToCurrent: (tag: string) => void
  onFilterTag: (tag: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const entries = useMemo(() => buildTagIndex(notes, query), [notes, query])
  const totalTags = useMemo(() => buildTagIndex(notes), [notes])

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
      aria-label="All tags"
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
      <aside
        style={{
          width: 'min(760px, 100%)',
          maxHeight: '82vh',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
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
          <ListBullets size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>All tags</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {totalTags.length} tag {totalTags.length === 1 ? 'path' : 'paths'} across the vault
            </div>
          </div>
          <button
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
            Close
          </button>
        </div>
        <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Filter by tag, note, folder, or nested path"
            aria-label="Filter tags"
            autoFocus
            style={{
              width: '100%',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              padding: '8px 10px',
              font: 'inherit',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ overflow: 'auto', padding: 14, display: 'grid', gap: 8 }}>
          {entries.length ? entries.map(entry => (
            <section
              key={entry.tag}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-white-02)',
                padding: 10,
                display: 'grid',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0, paddingLeft: entry.depth * 12 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    #{entry.tag}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {entry.directCount} direct · {entry.count} total
                    {entry.count !== entry.directCount && ` · ${entry.count - entry.directCount} inherited`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PropertyIndexActionButton label={`Filter notes by tag ${entry.tag}`} onClick={() => onFilterTag(entry.tag)}>
                    Filter
                  </PropertyIndexActionButton>
                  {entry.directCount > 0 && currentNote && !currentNote.tags.some(tag => tag === entry.tag) && (
                    <PropertyIndexActionButton label={`Apply tag ${entry.tag} to current note`} onClick={() => onApplyTagToCurrent(entry.tag)}>
                      Apply
                    </PropertyIndexActionButton>
                  )}
                  {entry.directCount > 0 && (
                    <>
                      <PropertyIndexActionButton label={`Rename tag ${entry.tag}`} onClick={() => onRenameTag(entry.tag)}>
                        Rename
                      </PropertyIndexActionButton>
                      <PropertyIndexActionButton label={`Remove tag ${entry.tag}`} onClick={() => onRemoveTag(entry.tag)}>
                        Remove
                      </PropertyIndexActionButton>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                {entry.notes.map(note => (
                  <div
                    key={note.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      className="hover-bg"
                      onClick={() => onOpenNote(note.id)}
                      style={{
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '5px 6px',
                        fontSize: 12,
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {note.title} <span style={{ color: 'var(--text-muted)' }}>{note.folder}</span>
                    </button>
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: 11,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 220,
                      }}
                    >
                      {note.tags.map(tag => `#${tag}`).join(' ')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )) : (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-white-02)',
                color: 'var(--text-muted)',
                padding: 14,
                fontSize: 12,
              }}
            >
              No tags match this filter.
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function PropertyIndexActionButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="hover-bg"
      aria-label={label}
      onClick={onClick}
      style={{
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        background: 'transparent',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        padding: '4px 5px',
        fontSize: 11,
      }}
    >
      {children}
    </button>
  )
}

function TagRenameDialog({
  request,
  onSubmit,
  onCancel,
}: {
  request: TagRenameRequest
  onSubmit: (nextTag: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(request.tag)
  const normalized = normalizeTagInput(value)
  const unchanged = normalized === normalizeTagInput(request.tag)
  const valid = normalized.length > 0 && !/\s/.test(normalized) && !unchanged
  const affectedLabel = `${request.affectedCount} note${request.affectedCount === 1 ? '' : 's'}`

  useEffect(() => {
    setValue(request.tag)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
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
        aria-label="Rename tag"
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
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Rename tag</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              #{request.tag} in {affectedLabel}
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
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>New tag</span>
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-base)',
                display: 'flex',
                alignItems: 'center',
                minWidth: 0,
              }}
            >
              <span style={{ color: 'var(--text-muted)', paddingLeft: 9, fontSize: 13 }}>#</span>
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={event => setValue(event.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  padding: '8px 9px 8px 3px',
                  font: 'inherit',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
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
            {unchanged
              ? 'Choose a different tag name.'
              : valid
                ? `Renames matching inline and frontmatter tags to #${normalized}.`
                : 'Tags cannot be empty or contain spaces.'}
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
              Rename tag
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function TagRemoveDialog({
  request,
  onSubmit,
  onCancel,
}: {
  request: TagRemoveRequest
  onSubmit: () => void
  onCancel: () => void
}) {
  const removeRef = useRef<HTMLButtonElement>(null)
  const affectedLabel = `${request.affectedCount} note${request.affectedCount === 1 ? '' : 's'}`

  useEffect(() => {
    requestAnimationFrame(() => removeRef.current?.focus())
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
        aria-label="Remove tag"
        onSubmit={event => {
          event.preventDefault()
          onSubmit()
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
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Remove tag</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              #{request.tag} in {affectedLabel}
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
            Removes matching inline and frontmatter tags from affected notes. Other nested tags and partial matches stay unchanged.
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
              ref={removeRef}
              type="submit"
              style={{
                border: '1px solid color-mix(in srgb, var(--red) 34%, var(--border))',
                borderRadius: 'var(--radius-sm)',
                background: 'color-mix(in srgb, var(--red) 11%, transparent)',
                color: 'var(--red)',
                cursor: 'pointer',
                padding: '7px 11px',
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              Remove tag
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function normalizeTagInput(tag: string): string {
  return tag.trim().replace(/^#+/, '').replace(/^\/+|\/+$/g, '')
}

export { DocumentPropertyDialog, AllPropertiesDialog, AllTagsDialog, TagRenameDialog, TagRemoveDialog }
