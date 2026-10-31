import type { VaultComment, VaultSuggestion } from '@/features/notes/storage/vault'
import { useEffect, useRef, useState } from 'react'
import { NotePencil, PenNib } from '@phosphor-icons/react'
import {
  type WritingAssistControls,
  type WritingAssistOption,
  applyWritingAssistControls,
  type WritingAssistProvider,
  writingAssistProviderLabel,
  type WritingAssistTone,
  type WritingAssistLength,
  writingAssistPrivacySummary,
} from '@/features/notes/assistiveWriting'
import {
  type CommentComposeRequest,
  type SuggestionComposeRequest,
  type WritingAssistRequest,
} from '@/features/notes/workspaceTypes'
import { suggestionDiff } from '@/features/notes/workspaceHelpers'

function CommentsDialog({
  noteTitle,
  comments,
  loading,
  error,
  onAdd,
  onResolve,
  onReply,
  onDraftReply,
  onJump,
  onClose,
}: {
  noteTitle: string
  comments: VaultComment[]
  loading: boolean
  error: string | null
  onAdd: () => void
  onResolve: (id: string) => void
  onReply: (id: string, defaultBody?: string) => void
  onDraftReply: (id: string) => void
  onJump: (id: string) => void
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
      aria-label="Comments"
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
          width: 'min(380px, calc(100vw - 24px))',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          boxShadow: '-18px 0 60px var(--overlay-heavy)',
        }}
      >
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Comments</div>
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
        <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={onAdd}
            style={{
              width: '100%',
              background: 'var(--bg-white-04)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px 10px',
              fontSize: 12,
            }}
          >
            Add comment
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {loading && <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 12 }}>Loading comments...</div>}
          {error && <div style={{ color: 'var(--red)', fontSize: 12, lineHeight: 1.5, padding: 12 }}>{error}</div>}
          {!loading && !error && comments.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5, padding: 12 }}>
              No comments yet.
            </div>
          )}
          {!loading &&
            !error &&
            comments.map(comment => {
              const resolved = Boolean(comment.resolved_at) || comment.status === 'resolved'
              const quote = typeof comment.anchor?.quote === 'string' ? comment.anchor.quote : ''
              return (
                <div
                  key={comment.id}
                  style={{
                    padding: '10px 8px',
                    borderBottom: '1px solid var(--border)',
                    opacity: resolved ? 0.58 : 1,
                  }}
                >
                  <div
                    style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}
                  >
                    {comment.body}
                  </div>
                  {quote && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '6px 8px',
                        borderLeft: '2px solid var(--accent-dim)',
                        background: 'var(--bg-white-02)',
                        color: 'var(--text-muted)',
                        fontSize: 11,
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {quote.length > 220 ? `${quote.slice(0, 220)}...` : quote}
                    </div>
                  )}
                  {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                    <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                      {comment.replies.map(reply => (
                        <div
                          key={reply.id}
                          style={{
                            padding: '6px 8px',
                            borderLeft: '2px solid var(--border)',
                            background: 'var(--bg-white-02)',
                            color: 'var(--text-secondary)',
                            fontSize: 11,
                            lineHeight: 1.45,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          <div>{reply.body}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>
                            {new Date(reply.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span style={{ flex: 1, minWidth: 0, color: 'var(--text-muted)', fontSize: 11 }}>
                      {new Date(comment.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    {quote && (
                      <button
                        type="button"
                        onClick={() => {
                          onJump(comment.id)
                          onClose()
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          fontSize: 11,
                        }}
                      >
                        Jump
                      </button>
                    )}
                    {!resolved && (
                      <button
                        type="button"
                        onClick={() => onDraftReply(comment.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          fontSize: 11,
                        }}
                      >
                        Draft reply
                      </button>
                    )}
                    {!resolved && (
                      <button
                        type="button"
                        onClick={() => onReply(comment.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          fontSize: 11,
                        }}
                      >
                        Reply
                      </button>
                    )}
                    {!resolved && (
                      <button
                        type="button"
                        onClick={() => onResolve(comment.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          fontSize: 11,
                        }}
                      >
                        Resolve
                      </button>
                    )}
                    {resolved && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Resolved</span>}
                  </div>
                </div>
              )
            })}
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

function CommentComposeDialog({
  request,
  loading,
  onSubmit,
  onCancel,
}: {
  request: CommentComposeRequest
  loading: boolean
  onSubmit: (body: string) => void
  onCancel: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [body, setBody] = useState(request.defaultBody ?? '')
  const title = request.mode === 'reply' ? 'Reply to comment' : request.suggestionId ? 'Comment on suggestion' : 'Add comment'
  const valid = body.trim().length > 0

  useEffect(() => {
    setBody(request.defaultBody ?? '')
    requestAnimationFrame(() => textareaRef.current?.focus())
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
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0, 0, 0, 0.42)',
      }}
    >
      <form
        aria-label={title}
        onSubmit={event => {
          event.preventDefault()
          if (valid && !loading) onSubmit(body)
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
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>{title}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {request.noteTitle}
          </div>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          {request.quote && (
            <div
              style={{
                borderLeft: '2px solid var(--accent-dim)',
                background: 'var(--bg-white-02)',
                color: 'var(--text-muted)',
                fontSize: 11,
                lineHeight: 1.45,
                maxHeight: 96,
                overflow: 'auto',
                padding: '7px 9px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {request.quote.length > 260 ? `${request.quote.slice(0, 260)}...` : request.quote}
            </div>
          )}
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>
              {request.mode === 'reply' ? 'Reply' : 'Comment'}
            </span>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={event => setBody(event.target.value)}
              rows={5}
              aria-label={request.mode === 'reply' ? 'Reply text' : 'Comment text'}
              placeholder={request.mode === 'reply' ? 'Write a reply...' : 'Write a comment...'}
              style={{
                width: '100%',
                minWidth: 0,
                resize: 'vertical',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                padding: '8px 9px',
                font: 'inherit',
                fontSize: 13,
                lineHeight: 1.45,
                outline: 'none',
              }}
            />
          </label>
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
              {loading ? 'Saving...' : request.mode === 'reply' ? 'Send reply' : 'Add comment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function SuggestionsDialog({
  noteTitle,
  suggestions,
  comments,
  loading,
  error,
  onAdd,
  onComment,
  onResolveComment,
  onReplyToComment,
  onDraftReplyToComment,
  onApply,
  onReject,
  onApplyAll,
  onRejectAll,
  onJump,
  onClose,
}: {
  noteTitle: string
  suggestions: VaultSuggestion[]
  comments: VaultComment[]
  loading: boolean
  error: string | null
  onAdd: () => void
  onComment: (id: string) => void
  onResolveComment: (id: string) => void
  onReplyToComment: (id: string) => void
  onDraftReplyToComment: (id: string) => void
  onApply: (id: string) => void
  onReject: (id: string) => void
  onApplyAll: () => void
  onRejectAll: () => void
  onJump: (id: string) => void
  onClose: () => void
}) {
  const openCount = suggestions.filter(suggestion => suggestion.status === 'open').length

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
      aria-label="Suggestions"
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
          width: 'min(420px, calc(100vw - 24px))',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          boxShadow: '-18px 0 60px var(--overlay-heavy)',
        }}
      >
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Suggestions</div>
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
        <div style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'grid', gap: 8 }}>
          <button
            type="button"
            onClick={onAdd}
            style={{
              width: '100%',
              background: 'var(--bg-white-04)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px 10px',
              fontSize: 12,
            }}
          >
            Suggest edit
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              disabled={loading || openCount === 0}
              onClick={onApplyAll}
              style={{
                background: openCount === 0 ? 'var(--bg-muted)' : 'var(--accent-dim)',
                border: '1px solid transparent',
                borderRadius: 'var(--radius-sm)',
                color: openCount === 0 ? 'var(--text-muted)' : 'var(--text-on-color)',
                cursor: loading || openCount === 0 ? 'not-allowed' : 'pointer',
                padding: '7px 10px',
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              Accept all
            </button>
            <button
              type="button"
              disabled={loading || openCount === 0}
              onClick={onRejectAll}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: openCount === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                cursor: loading || openCount === 0 ? 'not-allowed' : 'pointer',
                padding: '7px 10px',
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              Reject all
            </button>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.35 }}>
            {openCount === 0 ? 'No open suggestions.' : `${openCount} open suggestion${openCount === 1 ? '' : 's'}.`}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {loading && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 12 }}>Loading suggestions...</div>
          )}
          {error && <div style={{ color: 'var(--red)', fontSize: 12, lineHeight: 1.5, padding: 12 }}>{error}</div>}
          {!loading && !error && suggestions.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5, padding: 12 }}>
              No suggestions yet.
            </div>
          )}
          {!loading &&
            !error &&
            suggestions.map(suggestion => {
              const open = suggestion.status === 'open'
              const body = typeof suggestion.patch.body === 'string' ? suggestion.patch.body : ''
              const content = typeof suggestion.patch.content === 'string' ? suggestion.patch.content : ''
              const quote = typeof suggestion.anchor?.quote === 'string' ? suggestion.anchor.quote : ''
              const diffBase = suggestion.patch.type === 'replace_selection' ? quote : ''
              const diff = suggestionDiff(diffBase, content)
              const label =
                suggestion.patch.type === 'replace_selection'
                  ? 'Selection replacement'
                  : suggestion.patch.type === 'replace_document'
                    ? 'Document replacement'
                    : suggestion.patch.type === 'insert_at_cursor'
                      ? 'Cursor insertion'
                      : String(suggestion.patch.type || 'Suggestion')
              const suggestionComments = comments.filter(comment => {
                const anchor = comment.anchor as unknown
                return Boolean(
                  anchor &&
                    typeof anchor === 'object' &&
                    (anchor as Record<string, unknown>).suggestion_id === suggestion.id,
                )
              })
              return (
                <div
                  key={suggestion.id}
                  style={{
                    padding: '10px 8px',
                    borderBottom: '1px solid var(--border)',
                    opacity: open ? 1 : 0.58,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span
                      style={{ flex: 1, minWidth: 0, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}
                    >
                      {label}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{suggestion.status}</span>
                  </div>
                  {body && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                        marginBottom: 8,
                      }}
                    >
                      {body}
                    </div>
                  )}
                  {quote && (
                    <div
                      style={{
                        marginBottom: 8,
                        padding: '6px 8px',
                        borderLeft: '2px solid var(--accent-dim)',
                        background: 'var(--bg-white-02)',
                        color: 'var(--text-muted)',
                        fontSize: 11,
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {quote.length > 220 ? `${quote.slice(0, 220)}...` : quote}
                    </div>
                  )}
                  {content && (
                    <div
                      style={{
                        margin: 0,
                        maxHeight: 150,
                        overflow: 'auto',
                        background: 'var(--bg-white-02)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 8,
                        fontSize: 11,
                        lineHeight: 1.45,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {diff.map((line, index) => (
                        <div
                          key={`${line.kind}-${index}-${line.text}`}
                          style={{
                            color:
                              line.kind === 'added'
                                ? 'var(--green)'
                                : line.kind === 'removed'
                                  ? 'var(--red)'
                                  : 'var(--text-muted)',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {line.kind === 'added' ? '+ ' : line.kind === 'removed' ? '- ' : '  '}
                          {line.text || ' '}
                        </div>
                      ))}
                    </div>
                  )}
                  {suggestionComments.length > 0 && (
                    <div
                      aria-label={`Comments on suggestion ${suggestion.id}`}
                      style={{
                        marginTop: 8,
                        display: 'grid',
                        gap: 7,
                        borderLeft: '2px solid var(--accent-dim)',
                        padding: '2px 0 2px 8px',
                      }}
                    >
                      <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 650 }}>
                        {suggestionComments.length} comment{suggestionComments.length === 1 ? '' : 's'}
                      </div>
                      {suggestionComments.map(comment => {
                        const resolved = Boolean(comment.resolved_at) || comment.status === 'resolved'
                        return (
                          <div
                            key={comment.id}
                            style={{
                              display: 'grid',
                              gap: 6,
                              padding: '7px 8px',
                              background: 'var(--bg-white-02)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              opacity: resolved ? 0.58 : 1,
                            }}
                          >
                            <div
                              style={{
                                color: 'var(--text-secondary)',
                                fontSize: 11,
                                lineHeight: 1.45,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {comment.body}
                            </div>
                            {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                              <div style={{ display: 'grid', gap: 5 }}>
                                {comment.replies.map(reply => (
                                  <div
                                    key={reply.id}
                                    style={{
                                      borderLeft: '2px solid var(--border)',
                                      paddingLeft: 7,
                                      color: 'var(--text-muted)',
                                      fontSize: 10,
                                      lineHeight: 1.4,
                                      whiteSpace: 'pre-wrap',
                                    }}
                                  >
                                    {reply.body}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ flex: 1, minWidth: 0, color: 'var(--text-muted)', fontSize: 10 }}>
                                {new Date(comment.created_at).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </span>
                              {!resolved && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onDraftReplyToComment(comment.id)}
                                    style={{
                                      background: 'transparent',
                                      border: '0',
                                      color: 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      padding: 0,
                                      fontSize: 10,
                                    }}
                                  >
                                    Draft
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onReplyToComment(comment.id)}
                                    style={{
                                      background: 'transparent',
                                      border: '0',
                                      color: 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      padding: 0,
                                      fontSize: 10,
                                    }}
                                  >
                                    Reply
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onResolveComment(comment.id)}
                                    style={{
                                      background: 'transparent',
                                      border: '0',
                                      color: 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      padding: 0,
                                      fontSize: 10,
                                    }}
                                  >
                                    Resolve
                                  </button>
                                </>
                              )}
                              {resolved && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Resolved</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span style={{ flex: 1, minWidth: 0, color: 'var(--text-muted)', fontSize: 11 }}>
                      {new Date(suggestion.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    {quote && (
                      <button
                        type="button"
                        onClick={() => {
                          onJump(suggestion.id)
                          onClose()
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          fontSize: 11,
                        }}
                      >
                        Jump
                      </button>
                    )}
                    {open && (
                      <>
                        <button
                          type="button"
                          onClick={() => onComment(suggestion.id)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontSize: 11,
                          }}
                        >
                          Comment
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject(suggestion.id)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontSize: 11,
                          }}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => onApply(suggestion.id)}
                          style={{
                            background: 'var(--accent-dim)',
                            border: '1px solid transparent',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-on-color)',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontSize: 11,
                          }}
                        >
                          Accept
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
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

function SuggestionComposeDialog({
  request,
  loading,
  onSubmit,
  onCancel,
}: {
  request: SuggestionComposeRequest
  loading: boolean
  onSubmit: (content: string, body: string) => void
  onCancel: () => void
}) {
  const [content, setContent] = useState(request.defaultContent)
  const [body, setBody] = useState('')
  const contentRef = useRef<HTMLTextAreaElement | null>(null)
  const modeLabel =
    request.anchor.scope === 'selection'
      ? 'Replace selected text'
      : request.cursorInsert
        ? 'Insert at cursor'
        : 'Replace document'
  const valid = content.trim().length > 0 && (request.cursorInsert || content !== request.defaultContent)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      contentRef.current?.focus()
      contentRef.current?.select()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Suggest edit"
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
        background: 'rgba(0, 0, 0, 0.34)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <form
        aria-label="Suggest edit"
        onSubmit={event => {
          event.preventDefault()
          if (valid && !loading) onSubmit(content, body)
        }}
        style={{
          width: 'min(620px, calc(100vw - 32px))',
          maxHeight: 'min(760px, calc(100vh - 32px))',
          overflow: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-panel)',
          boxShadow: '0 24px 80px var(--overlay-heavy)',
          padding: 16,
        }}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'start' }}>
            <NotePencil size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--text-primary)' }}>Suggest edit</div>
              <div
                style={{
                  marginTop: 3,
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {modeLabel} in {request.noteTitle}
              </div>
            </div>
          </div>

          {request.selectedText && (
            <div
              style={{
                borderLeft: '2px solid var(--accent-dim)',
                background: 'var(--bg-white-02)',
                color: 'var(--text-muted)',
                fontSize: 12,
                lineHeight: 1.45,
                maxHeight: 110,
                overflow: 'auto',
                padding: '7px 9px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {request.selectedText}
            </div>
          )}

          <label style={{ display: 'grid', gap: 6, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
            Suggested Markdown
            <textarea
              ref={contentRef}
              value={content}
              onChange={event => setContent(event.target.value)}
              rows={9}
              aria-label="Suggested Markdown"
              placeholder={request.cursorInsert ? 'Markdown to insert...' : 'Replacement Markdown...'}
              style={{
                width: '100%',
                minWidth: 0,
                resize: 'vertical',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                padding: '8px 9px',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.5,
                outline: 'none',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
            Suggestion note
            <textarea
              value={body}
              onChange={event => setBody(event.target.value)}
              rows={3}
              aria-label="Suggestion note"
              placeholder="Optional note for reviewers..."
              style={{
                width: '100%',
                minWidth: 0,
                resize: 'vertical',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                padding: '8px 9px',
                font: 'inherit',
                fontSize: 13,
                lineHeight: 1.45,
                outline: 'none',
              }}
            />
          </label>

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
              {loading ? 'Saving...' : 'Create suggestion'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function WritingAssistDialog({
  request,
  defaultControls,
  loading,
  error,
  onControlsChange,
  onCreate,
  onCancel,
}: {
  request: WritingAssistRequest
  defaultControls: WritingAssistControls
  loading: boolean
  error: string | null
  onControlsChange: (controls: WritingAssistControls) => void
  onCreate: (option: WritingAssistOption) => void
  onCancel: () => void
}) {
  const [selectedId, setSelectedId] = useState(request.draft.options[0]?.id ?? '')
  const [controls, setControls] = useState<WritingAssistControls>(defaultControls)
  const firstButtonRef = useRef<HTMLButtonElement | null>(null)
  const selectedBase = request.draft.options.find(option => option.id === selectedId) ?? request.draft.options[0]
  const selected = selectedBase ? applyWritingAssistControls(selectedBase, controls) : undefined
  const modeLabel =
    request.draft.anchor.scope === 'selection'
      ? 'Selection'
      : request.draft.cursorInsert
        ? 'Cursor'
        : 'Document'

  useEffect(() => {
    const timeout = window.setTimeout(() => firstButtonRef.current?.focus(), 0)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    setControls(defaultControls)
  }, [defaultControls, request.noteId])

  const updateControls = (patch: Partial<WritingAssistControls>) => {
    const next = { ...controls, ...patch }
    setControls(next)
    onControlsChange(next)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Writing assistant"
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
        background: 'rgba(0, 0, 0, 0.34)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <section
        aria-label="Writing assistant"
        style={{
          width: 'min(720px, calc(100vw - 32px))',
          maxHeight: 'min(760px, calc(100vh - 32px))',
          overflow: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-panel)',
          boxShadow: '0 24px 80px var(--overlay-heavy)',
          padding: 16,
        }}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'start' }}>
            <PenNib size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--text-primary)' }}>Writing assistant</div>
              <div
                style={{
                  marginTop: 3,
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {modeLabel} suggestion for {request.noteTitle}
              </div>
            </div>
          </div>

          {request.draft.sourceText && (
            <div
              aria-label="Writing assistant source"
              style={{
                borderLeft: '2px solid var(--accent-dim)',
                background: 'var(--bg-white-02)',
                color: 'var(--text-muted)',
                fontSize: 12,
                lineHeight: 1.45,
                maxHeight: 110,
                overflow: 'auto',
                padding: '7px 9px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {request.draft.sourceText}
            </div>
          )}

          <div role="radiogroup" aria-label="Writing assistant options" style={{ display: 'grid', gap: 8 }}>
            {request.draft.options.map((option, index) => (
              <button
                key={option.id}
                ref={index === 0 ? firstButtonRef : undefined}
                type="button"
                role="radio"
                aria-checked={selected?.id === option.id}
                onClick={() => setSelectedId(option.id)}
                style={{
                  textAlign: 'left',
                  border: selected?.id === option.id ? '1px solid var(--accent-a40)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: selected?.id === option.id ? 'var(--accent-a08)' : 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: 10,
                }}
              >
                <span style={{ display: 'block', fontSize: 13, fontWeight: 650 }}>{option.label}</span>
                <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: 'var(--text-muted)' }}>{option.detail}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <label style={{ display: 'grid', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
              Provider
              <select
                aria-label="Writing assistant provider"
                value={controls.provider}
                onChange={event => updateControls({ provider: event.target.value as WritingAssistProvider })}
                style={{
                  minWidth: 0,
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  padding: '7px 8px',
                  font: 'inherit',
                  fontSize: 12,
                }}
              >
                <option value="local">{writingAssistProviderLabel('local')}</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
              Tone
              <select
                aria-label="Writing assistant tone"
                value={controls.tone}
                onChange={event => updateControls({ tone: event.target.value as WritingAssistTone })}
                style={{
                  minWidth: 0,
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  padding: '7px 8px',
                  font: 'inherit',
                  fontSize: 12,
                }}
              >
                <option value="neutral">Neutral</option>
                <option value="direct">Direct</option>
                <option value="friendly">Friendly</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
              Length
              <select
                aria-label="Writing assistant length"
                value={controls.length}
                onChange={event => updateControls({ length: event.target.value as WritingAssistLength })}
                style={{
                  minWidth: 0,
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  padding: '7px 8px',
                  font: 'inherit',
                  fontSize: 12,
                }}
              >
                <option value="standard">Standard</option>
                <option value="short">Short</option>
              </select>
            </label>
          </div>
          <div
            role="note"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-white-02)',
              color: 'var(--text-muted)',
              fontSize: 12,
              lineHeight: 1.4,
              padding: '7px 9px',
            }}
          >
            {writingAssistPrivacySummary(controls)}
          </div>

          <label style={{ display: 'grid', gap: 6, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
            Suggested Markdown
            <textarea
              readOnly
              value={selected?.content ?? ''}
              rows={9}
              aria-label="Writing assistant suggestion"
              style={{
                width: '100%',
                minWidth: 0,
                resize: 'vertical',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                padding: '8px 9px',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.5,
                outline: 'none',
              }}
            />
          </label>

          {error && (
            <div role="alert" style={{ color: 'var(--danger)', fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 2 }}>
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
              Reject
            </button>
            <button
              type="button"
              onClick={() => selected && onCreate(selected)}
              disabled={!selected || loading}
              style={{
                border: '1px solid var(--accent-a20)',
                borderRadius: 'var(--radius-sm)',
                background: selected && !loading ? 'var(--accent-a12)' : 'var(--bg-muted)',
                color: selected && !loading ? 'var(--accent)' : 'var(--text-muted)',
                cursor: selected && !loading ? 'pointer' : 'not-allowed',
                padding: '7px 11px',
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              {loading ? 'Saving...' : 'Create suggestion'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export {
  CommentsDialog,
  CommentComposeDialog,
  SuggestionsDialog,
  SuggestionComposeDialog,
  WritingAssistDialog,
}
