import { type TemplatePrompt } from '@/features/notes/templates'
import { type DocumentPropertyValueKind } from '@/features/notes/documentProperties'
import type { NoteSelectionAnchor } from '@/features/notes/types'
import { type WritingAssistDraft } from '@/features/notes/assistiveWriting'
import type { VaultSyncLedger } from '@/features/notes/storage/vault'
import { type VaultDataWorkspaceContext } from '@/features/notes/dataMode'

type ViewMode = 'editor' | 'graph' | 'data' | 'canvas'
type SaveState = 'saved' | 'unsaved' | 'saving' | 'error'
type WorkspaceSyncState = 'local' | 'loading' | 'saving' | 'synced' | 'error'
type SavedSearchSyncState = 'local' | 'loading' | 'saving' | 'synced' | 'error'
type PinnedNotesSyncState = 'local' | 'loading' | 'saving' | 'synced' | 'error'
type EditorPreferencesSyncState = 'local' | 'loading' | 'saving' | 'synced' | 'error'
type TopBarMenu = 'workspace' | 'status' | 'create' | 'view' | 'more' | 'note-tools' | 'note-identity'

interface TemplatePromptRequest {
  templateLabel: string
  prompts: TemplatePrompt[]
}

interface TemplateNameRequest {
  defaultTitle: string
}

interface TagRenameRequest {
  tag: string
  affectedCount: number
}

interface TagRemoveRequest {
  tag: string
  affectedCount: number
}

interface FolderCreateRequest {
  parent?: string
}

interface FolderRenameRequest {
  path: string
  affectedNoteCount: number
  affectedFolderCount: number
}

interface MoveNoteRequest {
  noteId: string
  title: string
  currentFolder: string
  folders: string[]
}

interface VersionNameRequest {
  mode: 'create' | 'rename'
  rev?: string
  currentLabel?: string | null
}

interface DocumentPropertyRequest {
  mode: 'set' | 'remove' | 'rename'
  properties: Record<string, string | string[]>
  sourceKey?: string
  defaultKey?: string
  defaultValue?: string
  defaultKind?: DocumentPropertyValueKind
}

interface ReviewPackageRequest {
  noteId: string
  title: string
}

interface PluginMarketplaceFeedRequest {
  defaultUrl: string
}

interface EncryptedBackupRequest {
  mode: 'export' | 'import'
  file?: File
  fileName?: string
}

interface ConfirmActionRequest {
  title: string
  detail: string
  confirmLabel: string
  tone?: 'default' | 'danger'
  onConfirm: () => void | Promise<void>
}

interface NoticeRequest {
  title: string
  detail: string
  actionLabel?: string
  tone?: 'default' | 'warning' | 'danger'
}

interface WorkspaceRenameRequest {
  snapshotKey: string
  currentName: string
  viewMode: ViewMode
}

interface MarkdownOutlineHeading {
  level: number
  text: string
  lineNumber: number
}

interface CommentComposeRequest {
  mode: 'comment' | 'reply'
  noteId: string
  noteTitle: string
  anchor?: NoteSelectionAnchor | Record<string, unknown>
  commentId?: string
  suggestionId?: string
  quote?: string
  defaultBody?: string
}

interface SuggestionComposeRequest {
  noteId: string
  noteTitle: string
  anchor: NoteSelectionAnchor
  defaultContent: string
  selectedText: string
  cursorInsert: boolean
}

interface WritingAssistRequest {
  noteId: string
  noteTitle: string
  draft: WritingAssistDraft
}

interface MergeConflictReviewRequest {
  state: VaultSyncLedger['sync_states'][number]
  noteId: string
  noteTitle: string
  localContent: string
  remoteContent: string
  baseContent: string | null
  initialContent: string
  autoMerged: boolean
}

interface QueuedLocalEdit {
  noteId: string
  title: string
  folder: string
  content: string
  error?: string
}

interface NotesWorkspaceSnapshot {
  id?: string
  name?: string
  viewMode: ViewMode
  focusMode: boolean
  infoPanelOpen: boolean
  treeWidth: number
  sidePaneWidth?: number
  searchQuery?: string
  expandedFolders?: string[]
  referencesOpen?: boolean
  graphContext?: NotesGraphWorkspaceContext
  dataContext?: VaultDataWorkspaceContext
  selectedId: string | null
  sidePaneId?: string | null
  tabIds?: string[]
  savedAt: number
}

interface NotesGraphWorkspaceContext {
  graphSearch: string
  focusMatches: boolean
  hideOrphans: boolean
  localGraph: boolean
  groupMode: 'tag' | 'folder' | 'type' | 'none'
}

interface SuggestionDiffLine {
  kind: 'same' | 'removed' | 'added'
  text: string
}

export {
  type NotesGraphWorkspaceContext,
  type ViewMode,
  type NotesWorkspaceSnapshot,
  type MarkdownOutlineHeading,
  type SuggestionDiffLine,
  type VersionNameRequest,
  type DocumentPropertyRequest,
  type TagRenameRequest,
  type TagRemoveRequest,
  type ReviewPackageRequest,
  type PluginMarketplaceFeedRequest,
  type EncryptedBackupRequest,
  type CommentComposeRequest,
  type SuggestionComposeRequest,
  type WritingAssistRequest,
  type QueuedLocalEdit,
  type MergeConflictReviewRequest,
  type ConfirmActionRequest,
  type NoticeRequest,
  type TemplatePromptRequest,
  type TemplateNameRequest,
  type FolderCreateRequest,
  type FolderRenameRequest,
  type MoveNoteRequest,
  type WorkspaceRenameRequest,
  type TopBarMenu,
  type WorkspaceSyncState,
  type SavedSearchSyncState,
  type PinnedNotesSyncState,
  type EditorPreferencesSyncState,
  type SaveState,
}
