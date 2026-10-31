import { useEffect, useRef, useState } from 'react'
import { groupedNotesShortcuts } from '@/features/notes/notesShortcuts'
import { type DocumentStats } from '@/features/notes/documentStats'
import {
  type NotesEditorPreferences,
  dailyNoteDateInputValue,
  dailyNoteDateFromInput,
  buildDailyNoteTitle,
} from '@/features/notes/notesPreferences'
import { type MarkdownOutlineHeading } from '@/features/notes/workspaceTypes'

function NotesShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const groups = groupedNotesShortcuts()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.42)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <aside
        style={{
          width: 'min(680px, 100%)',
          maxHeight: '80vh',
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Keyboard shortcuts</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Local notes, editor, and review actions</div>
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
        <div
          style={{
            padding: 16,
            overflow: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 12,
          }}
        >
          {Object.entries(groups).map(([scope, shortcuts]) => (
            <section
              key={scope}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-white-02)',
                padding: 10,
              }}
            >
              <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 650, marginBottom: 8 }}>
                {scope}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {shortcuts.map(shortcut => (
                  <div
                    key={`${shortcut.scope}-${shortcut.keys}-${shortcut.action}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '92px minmax(0, 1fr)',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <kbd
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-base)',
                        color: 'var(--text-primary)',
                        padding: '4px 5px',
                        fontSize: 10,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {shortcut.keys}
                    </kbd>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.35 }}>
                      {shortcut.action}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>
    </div>
  )
}

function TopBarWordCountDialog({
  stats,
  selectionStats,
  onClose,
}: {
  stats: DocumentStats
  selectionStats: DocumentStats | null
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

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
      role="dialog"
      aria-modal="true"
      aria-label="Word count"
      onMouseDown={(event) => {
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
        style={{
          width: 'min(440px, 100%)',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Word count</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Current note statistics</div>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 14 }}>
          <WordCountStatsSection title="Document" stats={stats} />
          <WordCountStatsSection title="Selection" stats={selectionStats} emptyLabel="No selected text" />
        </div>
        <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
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
            Close
          </button>
        </div>
      </section>
    </div>
  )
}

function ActiveNoteOutlineDialog({
  noteTitle,
  headings,
  onJump,
  onClose,
}: {
  noteTitle: string
  headings: MarkdownOutlineHeading[]
  onJump: (heading: MarkdownOutlineHeading) => void
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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
        zIndex: 220,
        background: 'rgba(0, 0, 0, 0.42)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '72px 16px 16px',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Active note outline"
        style={{
          width: 'min(420px, 100%)',
          maxHeight: 'min(520px, calc(100vh - 96px))',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Outline</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {noteTitle}
          </div>
        </div>
        <div style={{ overflow: 'auto', padding: 8, display: 'grid', gap: 2 }}>
          {headings.length === 0 ? (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-white-02)',
                color: 'var(--text-muted)',
                padding: '10px 11px',
                fontSize: 12,
              }}
            >
              No headings in this note
            </div>
          ) : (
            headings.map((heading, index) => (
              <button
                key={`${heading.lineNumber}-${index}`}
                type="button"
                className="hover-bg"
                onClick={() => onJump(heading)}
                title={heading.text}
                style={{
                  minHeight: 28,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  color: heading.level <= 2 ? 'var(--text-secondary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '5px 8px',
                  paddingLeft: 8 + Math.min(heading.level - 1, 4) * 14,
                  textAlign: 'left',
                  font: 'inherit',
                  fontSize: heading.level <= 2 ? 12 : 11,
                  fontWeight: heading.level === 1 ? 650 : 500,
                }}
              >
                <span style={{ color: 'var(--text-faint)', fontSize: 10, flex: '0 0 auto' }}>H{heading.level}</span>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {heading.text}
                </span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontSize: 10, flex: '0 0 auto' }}>
                  {heading.lineNumber}
                </span>
              </button>
            ))
          )}
        </div>
        <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
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
            Close
          </button>
        </div>
      </section>
    </div>
  )
}

function WordCountStatsSection({
  title,
  stats,
  emptyLabel,
}: {
  title: string
  stats: DocumentStats | null
  emptyLabel?: string
}) {
  return (
    <section aria-label={`${title} word count`} style={{ display: 'grid', gap: 8 }}>
      <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 650 }}>{title}</div>
      {stats ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          <WordCountMetric label="Words" value={stats.words} />
          <WordCountMetric label="Characters" value={stats.chars} />
          <WordCountMetric label="Characters no spaces" value={stats.charsNoSpaces} />
          <WordCountMetric label="Lines" value={stats.lines} />
          <WordCountMetric label="Paragraphs" value={stats.paragraphs} />
          <WordCountMetric label="Estimated pages" value={stats.estimatedPages} />
          <WordCountMetric label="Links" value={stats.links} />
          <WordCountMetric label="Tags" value={stats.tags} />
        </div>
      ) : (
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-white-02)',
            color: 'var(--text-muted)',
            padding: '9px 10px',
            fontSize: 12,
          }}
        >
          {emptyLabel ?? 'No stats'}
        </div>
      )}
    </section>
  )
}

function WordCountMetric({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-white-02)',
        padding: '9px 10px',
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 650, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function DailyDatePickerDialog({
  preferences,
  onOpenDate,
  onClose,
}: {
  preferences: NotesEditorPreferences
  onOpenDate: (date: Date) => void
  onClose: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(() => dailyNoteDateInputValue(new Date()))
  const selectedDate = dailyNoteDateFromInput(value)
  const previewTitle = selectedDate ? buildDailyNoteTitle(preferences, selectedDate) : 'Invalid date'

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
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
      <form
        onSubmit={event => {
          event.preventDefault()
          if (selectedDate) onOpenDate(selectedDate)
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
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Daily note date</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Open or create one local calendar day</div>
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
            Cancel
          </button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Date</span>
            <input
              ref={inputRef}
              type="date"
              value={value}
              onChange={event => setValue(event.target.value)}
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
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-white-02)',
              color: selectedDate ? 'var(--text-secondary)' : 'var(--red)',
              padding: '8px 10px',
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {previewTitle}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
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
              disabled={!selectedDate}
              style={{
                border: '1px solid var(--accent-a20)',
                borderRadius: 'var(--radius-sm)',
                background: selectedDate ? 'var(--accent-a12)' : 'var(--bg-muted)',
                color: selectedDate ? 'var(--accent)' : 'var(--text-muted)',
                cursor: selectedDate ? 'pointer' : 'not-allowed',
                padding: '7px 11px',
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              Open daily note
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export { NotesShortcutsDialog, TopBarWordCountDialog, ActiveNoteOutlineDialog, DailyDatePickerDialog }
