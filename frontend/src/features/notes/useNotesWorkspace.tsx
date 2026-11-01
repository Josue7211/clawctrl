import { useVault } from '@/features/notes/storage/useVault'
import {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from 'react'
import { useLocalStorageState, LOCAL_STORAGE_STATE_EVENT } from '@/lib/hooks/useLocalStorageState'
import {
  type NotesEditorPreferences,
  DEFAULT_NOTES_EDITOR_PREFERENCES,
  normalizeNotesEditorPreferences,
  notesCssSnippetText,
  isNotesRemoteCollaborationBaseUrl,
  isNotesRemoteCollaborationPairingKey,
  buildDailyNoteTitle,
  type NotesPeriodicKind,
  periodicNoteFolder,
  buildPeriodicNoteTitle,
  periodicNoteTemplateId,
  dailyNoteDateWithOffset,
} from '@/features/notes/notesPreferences'
import {
  type VaultDataWorkspaceContext,
  normalizeVaultDataWorkspaceContext,
  type VaultTaskRow,
  setTaskLineDone,
} from '@/features/notes/dataMode'
import {
  type NotesSavedSearch,
  normalizeSavedSearches,
  mergeSavedSearches,
  savedSearchesEqual,
  upsertSavedSearch,
  removeSavedSearch,
} from '@/features/notes/savedSearches'
import type { NoteSelectionAnchor, NoteReviewMarker, VaultNote } from '@/features/notes/types'
import {
  type SyncedNotesEditorPreferences,
  notesEditorPreferencesToSyncState,
  saveSyncedNotesEditorPreferences,
  loadSyncedNotesEditorPreferences,
  mergeSyncedNotesEditorPreferences,
  syncedNotesEditorPreferencesEqual,
  applySyncedNotesEditorPreferences,
} from '@/features/notes/editorPreferenceSync'
import {
  type NotesPinnedNotesState,
  normalizePinnedNoteIds,
  saveSyncedPinnedNotesState,
  loadSyncedPinnedNotesState,
  mergePinnedNotesState,
  pinnedNotesStateEqual,
} from '@/features/notes/pinnedNotesSync'
import type {
  VaultRevision,
  VaultRevisionDetail,
  VaultComment,
  VaultSuggestion,
  VaultStatus,
  VaultAuditEvent,
  VaultSyncLedger,
  VaultRecoverableDraft,
} from '@/features/notes/storage/vault'
import { documentStats } from '@/features/notes/documentStats'
import {
  type WritingAssistControls,
  buildCommentReplyDraft,
  buildWritingAssistDraft,
  type WritingAssistOption,
  writingAssistPatchForDraft,
} from '@/features/notes/assistiveWriting'
import {
  type LocalCollabTransportProvider,
  createLayeredLocalCollabTransport,
  type LocalCollabTransportStatus,
  summarizeLocalCollabProviderStatuses,
  useLocalNoteCollaboration,
  autoMergeLocalCollabOperation,
  type LocalCollabDraft,
  mergeLocalCollabDraft,
} from '@/features/notes/collaboration'
import {
  publishVaultCollaborationEvent,
  listVaultCollaborationEvents,
  getVaultCollaborationCrdtState,
  saveVaultCollaborationCrdtState,
  createVaultCollaborationHttpTransport,
  getNoteComments,
  getNoteSuggestions,
  searchVaultNotes,
  normalizeFolderPath,
  createNoteVersionCheckpoint,
  getVaultSyncLedger,
  getVaultStatus,
  getVaultAuditEvents,
  getRecoverableDrafts,
  restoreLocalDraft,
  discardLocalDraft,
  exportEncryptedVault,
  importEncryptedVault,
  uploadAttachment,
  getNoteRevisions,
  createNoteCommentReply,
  createNoteComment,
  resolveNoteComment,
  createNoteSuggestion,
  resolveVaultSyncConflict,
  applyNoteSuggestion,
  rejectNoteSuggestion,
  restoreNoteRevision,
  getNoteRevision,
  labelNoteRevision,
  saveLocalDraft,
  rewriteWikilinks,
  linkFirstPlainMention,
  noteIdFromTitle,
} from '@/features/notes/storage/vault'
import { getRemoteApiKey, getRequestApiKeyForPath, getRequestBaseForPath } from '@/lib/api'
import {
  vaultTemplatesFromNotes,
  type NoteTemplate,
  NOTE_TEMPLATES,
  selectFolderTemplate,
  extractTemplatePrompts,
  applyTemplate,
  VAULT_TEMPLATES_FOLDER,
  appendTemplateToContent,
} from '@/features/notes/templates'
import {
  installedVaultPlugins,
  buildVaultPluginCommandContributions,
  fetchVaultPluginMarketplaceFeed,
  buildVaultPluginTrustedPublishers,
  vaultPluginMarketplacePackagesMarkdown,
  buildVaultPluginWriteRecords,
  planVaultPluginWriteApply,
  removeAppliedVaultPluginWriteBlocks,
} from '@/features/notes/vaultPlugins'
import {
  isCanvasBoardNote,
  CANVAS_FOLDER,
  CANVAS_TITLE,
  serializeCanvasNote,
  buildInitialCanvasData,
} from '@/features/notes/canvasData'
import { normalizeSelectionAnchor } from '@/features/notes/reviewAnchors'
import { saveSyncedNotesSavedSearches, loadSyncedNotesSavedSearches } from '@/features/notes/savedSearchSync'
import { noteSearchText, matchesNoteSearch } from '@/features/notes/searchFilters'
import { isNoteInTrash, isNotesTrashPath, noteFolderPath } from '@/features/notes/trash'
import {
  normalizeNotesWorkspaceSnapshots,
  saveSyncedNotesWorkspaceSnapshots,
  loadSyncedNotesWorkspaceSnapshots,
  mergeNotesWorkspaceSnapshots,
  notesWorkspaceSnapshotsEqual,
} from '@/features/notes/workspaceSync'
import {
  affectedNotesForTagRename,
  renameTagInContent,
  removeTagFromContent,
  applyTagToContent,
  buildTagRows,
} from '@/features/notes/tags'
import {
  downloadMarkdown,
  downloadDocx,
  printNotePdf,
  downloadHtml,
  downloadPublishedNotesSite,
  type ReviewPackagePermission,
  downloadReviewPackage,
} from '@/features/notes/export'
import { verifyMarkdownVaultArchive } from '@/features/notes/storage/vaultArchive'
import { verifyEncryptedVaultBackup } from '@/features/notes/storage/vaultBackup'
import {
  planMarkdownVaultImport,
  folderAncestors,
  readImportedNoteMarkdown,
} from '@/features/notes/vaultImport'
import { readClipboardClipInput, buildClipNote } from '@/features/notes/clipper'
import { applySuggestionPatch } from '@/features/notes/suggestions'
import { restoreRevisionConfirmMessage } from '@/features/notes/versionDiff'
import type { BacklinkReference } from '@/features/notes/backlinks'
import { upsertMarkdownTableOfContents } from '@/features/notes/markdownBridge'
import {
  renameDocumentProperty,
  removeDocumentProperty,
  upsertDocumentProperty,
  formatDocumentPropertyInputValue,
  inferDocumentPropertyValueKind,
} from '@/features/notes/documentProperties'
import { type CommandAction } from '@/features/notes/NotesCommandPalette'
import {
  NotePencil,
  FileText,
  FolderPlus,
  GitBranch,
  Table,
  SquaresFour,
  PenNib,
  ListBullets,
  ShieldCheck,
  UploadSimple,
  X,
  DotsThree,
  ShareNetwork,
  Trash,
  FolderOpen,
  Star,
  Copy,
  Cloud,
  ChatCircleText,
  FileDoc,
  FilePdf,
  FileHtml,
  CloudSlash,
} from '@phosphor-icons/react'
import {
  type ViewMode,
  type TopBarMenu,
  type TemplatePromptRequest,
  type TemplateNameRequest,
  type TagRenameRequest,
  type TagRemoveRequest,
  type FolderCreateRequest,
  type FolderRenameRequest,
  type MoveNoteRequest,
  type WorkspaceRenameRequest,
  type NotesWorkspaceSnapshot,
  type WorkspaceSyncState,
  type SavedSearchSyncState,
  type PinnedNotesSyncState,
  type EditorPreferencesSyncState,
  type SaveState,
  type VersionNameRequest,
  type DocumentPropertyRequest,
  type ReviewPackageRequest,
  type PluginMarketplaceFeedRequest,
  type EncryptedBackupRequest,
  type ConfirmActionRequest,
  type NoticeRequest,
  type CommentComposeRequest,
  type SuggestionComposeRequest,
  type WritingAssistRequest,
  type MergeConflictReviewRequest,
  type MarkdownOutlineHeading,
  type QueuedLocalEdit,
} from '@/features/notes/workspaceTypes'
import {
  DEFAULT_FILE_TREE_WIDTH,
  COMPACT_TOPBAR_VIEWPORT_WIDTH,
  collectMarkdownOutlineHeadings,
  notesAppearanceStyle,
  errorMessage,
  COMPACT_TOPBAR_ACTUAL_WIDTH,
  clampWorkspaceSidePaneWidth,
  DEFAULT_WORKSPACE_SIDE_PANE_WIDTH,
  viewModeLabel,
  isNoteInsideFolder,
  isInsideFolder,
  applyPathRewrites,
  WORKSPACE_SIDE_PANE_WIDTH_STEP,
  FILE_TREE_WIDTH_STEP,
  clampFileTreeWidth,
  readGraphWorkspaceContext,
  restoreGraphWorkspaceContext,
  workspaceSnapshotKey,
  noteEmbedMarkdown,
  usableSelectionAnchor,
  usableSuggestionAnchor,
  SAVE_DEBOUNCE_MS,
  insertMarkdownBlockAtAnchor,
  markdownAnchorOrHeadingFallback,
  insertBlockIdAtAnchor,
  createBlockId,
  blockIdAtAnchorLine,
  blockReferenceMarkdown,
  headingForReference,
  headingReferenceMarkdown,
  MIN_WORKSPACE_SIDE_PANE_WIDTH,
  MAX_WORKSPACE_SIDE_PANE_WIDTH,
  MIN_FILE_TREE_WIDTH,
  MAX_FILE_TREE_WIDTH,
} from '@/features/notes/workspaceHelpers'
import {
  remoteConflictContent,
  baseConflictContent,
  mergedSyncConflictContent,
  conflictMarkedMergeContent,
  isSyncConflictState,
} from '@/features/notes/syncConflicts'

export function useNotesWorkspace() {
  const {
    notes,
    unavailableNotes,
    folders,
    loading,
    syncing,
    error,
    refresh,
    createNote,
    createFolder,
    updateNote,
    moveNote,
    deleteNote,
    trashNote,
    trashFolder,
    restoreTrashedNote,
    restoreTrashedFolder,
    emptyTrash,
    deleteFolder,
  } = useVault()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('graph')
  const [searchQuery, setSearchQuery] = useState('')
  const [treeWidth, setTreeWidth] = useState(DEFAULT_FILE_TREE_WIDTH)
  const [workspaceSidePaneWidth, setWorkspaceSidePaneWidth] = useLocalStorageState('mc-notes-workspace-side-pane-width', 420)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [focusMode, setFocusMode] = useLocalStorageState('mc-notes-focus-mode', false)
  const [infoPanelOpen, setInfoPanelOpen] = useLocalStorageState('mc-notes-info-panel-open', false)
  const [editorPreferences, setEditorPreferences] = useLocalStorageState<NotesEditorPreferences>(
    'mc-notes-editor-preferences',
    DEFAULT_NOTES_EDITOR_PREFERENCES,
  )
  const [editorPreferencesSyncUpdatedAt, setEditorPreferencesSyncUpdatedAt] = useLocalStorageState('mc-notes-editor-preferences-sync-updated-at', 0)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [topBarMenu, setTopBarMenu] = useState<TopBarMenu | null>(null)
  const [compactTopBarActions, setCompactTopBarActions] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < COMPACT_TOPBAR_VIEWPORT_WIDTH
  })
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [wordCountOpen, setWordCountOpen] = useState(false)
  const [propertiesIndexOpen, setPropertiesIndexOpen] = useState(false)
  const [tagsIndexOpen, setTagsIndexOpen] = useState(false)
  const [activeOutlineOpen, setActiveOutlineOpen] = useState(false)
  const [editorJumpRequest, setEditorJumpRequest] = useState<{ noteId: string; lineNumber: number; requestId: number } | null>(null)
  const [backlinksOpenRequest, setBacklinksOpenRequest] = useState(0)
  const [referencesPanelCollapsed, setReferencesPanelCollapsed] = useLocalStorageState('mc-backlinks-collapsed', true)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [dailyDatePickerOpen, setDailyDatePickerOpen] = useState(false)
  const [templatePromptRequest, setTemplatePromptRequest] = useState<TemplatePromptRequest | null>(null)
  const [templateNameRequest, setTemplateNameRequest] = useState<TemplateNameRequest | null>(null)
  const [tagRenameRequest, setTagRenameRequest] = useState<TagRenameRequest | null>(null)
  const [tagRemoveRequest, setTagRemoveRequest] = useState<TagRemoveRequest | null>(null)
  const [folderCreateRequest, setFolderCreateRequest] = useState<FolderCreateRequest | null>(null)
  const [folderRenameRequest, setFolderRenameRequest] = useState<FolderRenameRequest | null>(null)
  const [moveNoteRequest, setMoveNoteRequest] = useState<MoveNoteRequest | null>(null)
  const [workspaceRenameRequest, setWorkspaceRenameRequest] = useState<WorkspaceRenameRequest | null>(null)
  const [pinnedNoteIds, setPinnedNoteIds] = useLocalStorageState<string[]>('mc-pinned-note-ids', [])
  const [pinnedNoteSyncUpdatedAt, setPinnedNoteSyncUpdatedAt] = useLocalStorageState('mc-pinned-note-sync-updated-at', 0)
  const [recentNoteIds, setRecentNoteIds] = useLocalStorageState<string[]>('mc-recent-note-ids', [])
  const [recentLimit, setRecentLimit] = useLocalStorageState('mc-notes-recent-limit', 5)
  const [workspaceSnapshot, setWorkspaceSnapshot] = useLocalStorageState<NotesWorkspaceSnapshot | null>('mc-notes-workspace-snapshot', null)
  const [workspaceSnapshots, setWorkspaceSnapshots] = useLocalStorageState<NotesWorkspaceSnapshot[]>('mc-notes-workspace-snapshots', [])
  const [workspaceTabIds, setWorkspaceTabIds] = useLocalStorageState<string[]>('mc-notes-workspace-tab-ids', [])
  const [workspaceSidePaneId, setWorkspaceSidePaneId] = useLocalStorageState<string | null>('mc-notes-workspace-side-pane-id', null)
  const [fileTreeExpandedFolders, setFileTreeExpandedFolders] = useState<Set<string>>(new Set(['']))
  const [dataWorkspaceContext, setDataWorkspaceContext] = useState<VaultDataWorkspaceContext>(() => normalizeVaultDataWorkspaceContext(null))
  const [workspaceSyncState, setWorkspaceSyncState] = useState<WorkspaceSyncState>('local')
  const [workspaceSyncError, setWorkspaceSyncError] = useState<string | null>(null)
  const [savedSearches, setSavedSearches] = useLocalStorageState<NotesSavedSearch[]>('mc-notes-saved-searches', [])
  const [savedSearchSyncState, setSavedSearchSyncState] = useState<SavedSearchSyncState>('local')
  const [savedSearchSyncError, setSavedSearchSyncError] = useState<string | null>(null)
  const [pinnedNotesSyncState, setPinnedNotesSyncState] = useState<PinnedNotesSyncState>('local')
  const [pinnedNotesSyncError, setPinnedNotesSyncError] = useState<string | null>(null)
  const [editorPreferencesSyncState, setEditorPreferencesSyncState] = useState<EditorPreferencesSyncState>('local')
  const [editorPreferencesSyncError, setEditorPreferencesSyncError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const topBarRef = useRef<HTMLDivElement>(null)
  const templatePromptResolverRef = useRef<((values: Record<string, string> | null) => void) | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const encryptedBackupInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingContentRef = useRef<Map<string, string>>(new Map())
  const selectionAnchorRef = useRef<NoteSelectionAnchor | null>(null)
  const notesRef = useRef(notes)
  const initialSelectionRecoveredRef = useRef(false)
  const workspaceSnapshotsRef = useRef(workspaceSnapshots)
  const savedSearchesRef = useRef(savedSearches)
  const editorPreferencesRef = useRef(editorPreferences)
  const editorPreferencesSyncStateRef = useRef<SyncedNotesEditorPreferences>(
    notesEditorPreferencesToSyncState(editorPreferences, Number(editorPreferencesSyncUpdatedAt) || 0),
  )
  const pinnedNotesStateRef = useRef<NotesPinnedNotesState>({
    pinnedNoteIds: normalizePinnedNoteIds(pinnedNoteIds),
    updatedAt: Number(pinnedNoteSyncUpdatedAt) || 0,
  })
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [networkOnline, setNetworkOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true
    return navigator.onLine !== false
  })
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyRevisions, setHistoryRevisions] = useState<VaultRevision[]>([])
  const [historyPreview, setHistoryPreview] = useState<VaultRevisionDetail | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [versionNameRequest, setVersionNameRequest] = useState<VersionNameRequest | null>(null)
  const [documentPropertyRequest, setDocumentPropertyRequest] = useState<DocumentPropertyRequest | null>(null)
  const [reviewPackageRequest, setReviewPackageRequest] = useState<ReviewPackageRequest | null>(null)
  const [pluginMarketplaceFeedRequest, setPluginMarketplaceFeedRequest] = useState<PluginMarketplaceFeedRequest | null>(null)
  const [encryptedBackupRequest, setEncryptedBackupRequest] = useState<EncryptedBackupRequest | null>(null)
  const [confirmActionRequest, setConfirmActionRequest] = useState<ConfirmActionRequest | null>(null)
  const [noticeRequest, setNoticeRequest] = useState<NoticeRequest | null>(null)
  const [searchResultNotes, setSearchResultNotes] = useState<typeof notes | null>(null)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [noteComments, setNoteComments] = useState<VaultComment[]>([])
  const [commentComposeRequest, setCommentComposeRequest] = useState<CommentComposeRequest | null>(null)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [noteSuggestions, setNoteSuggestions] = useState<VaultSuggestion[]>([])
  const [suggestionComposeRequest, setSuggestionComposeRequest] = useState<SuggestionComposeRequest | null>(null)
  const [writingAssistRequest, setWritingAssistRequest] = useState<WritingAssistRequest | null>(null)
  const [mergeConflictReviewRequest, setMergeConflictReviewRequest] = useState<MergeConflictReviewRequest | null>(null)
  const [selectionAnchor, setSelectionAnchor] = useState<NoteSelectionAnchor | null>(null)
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null)
  const [vaultStatusOpen, setVaultStatusOpen] = useState(false)
  const [vaultStatusLoading, setVaultStatusLoading] = useState(false)
  const [vaultStatusError, setVaultStatusError] = useState<string | null>(null)
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null)
  const [vaultAuditEvents, setVaultAuditEvents] = useState<VaultAuditEvent[]>([])
  const [vaultSyncLedger, setVaultSyncLedger] = useState<VaultSyncLedger | null>(null)
  const [draftRecoveryOpen, setDraftRecoveryOpen] = useState(false)
  const [recoverableDrafts, setRecoverableDrafts] = useState<VaultRecoverableDraft[]>([])
  const [collabReviewOpen, setCollabReviewOpen] = useState(false)
  const [queuedEditsOpen, setQueuedEditsOpen] = useState(false)
  const [saveErrorByNoteId, setSaveErrorByNoteId] = useState<Record<string, string>>({})

  const selected = notes.find(n => n._id === selectedId) ?? null
  const selectedWordStats = useMemo(
    () => selected?.type === 'note' ? documentStats(selected.content) : null,
    [selected],
  )
  const selectedOutlineHeadings = useMemo(() => {
    if (selected?.type !== 'note') return []
    return collectMarkdownOutlineHeadings(pendingContentRef.current.get(selected._id) ?? selected.content)
  }, [saveState, selected])
  const selectedWordSelectionStats = useMemo(
    () => selectionAnchor?.scope === 'selection' && selectionAnchor.quote?.trim()
      ? documentStats(selectionAnchor.quote)
      : null,
    [selectionAnchor],
  )
  const normalizedEditorPreferences = useMemo(
    () => normalizeNotesEditorPreferences(editorPreferences),
    [editorPreferences],
  )
  const writingAssistDefaults = useMemo<WritingAssistControls>(
    () => ({
      provider: normalizedEditorPreferences.writingAssistProvider,
      tone: normalizedEditorPreferences.writingAssistTone,
      length: normalizedEditorPreferences.writingAssistLength,
    }),
    [
      normalizedEditorPreferences.writingAssistLength,
      normalizedEditorPreferences.writingAssistProvider,
      normalizedEditorPreferences.writingAssistTone,
    ],
  )
  const notesCssSnippet = useMemo(
    () => notesCssSnippetText(normalizedEditorPreferences),
    [normalizedEditorPreferences],
  )
  const notesVaultAppearanceStyle = useMemo(
    () => notesAppearanceStyle(normalizedEditorPreferences.appearanceMode),
    [normalizedEditorPreferences.appearanceMode],
  )
  const editorPreferencesSyncLabel =
    editorPreferencesSyncState === 'loading'
      ? 'Preferences syncing'
      : editorPreferencesSyncState === 'saving'
        ? 'Preferences saving'
        : editorPreferencesSyncState === 'synced'
          ? 'Preferences synced'
          : editorPreferencesSyncState === 'error'
            ? 'Preferences unsynced'
            : 'Preferences local'
  const editorPreferencesSyncDetail =
    editorPreferencesSyncState === 'error'
      ? editorPreferencesSyncError || 'Editor preferences are kept on this device.'
      : editorPreferencesSyncState === 'local'
        ? 'Saved locally until vault sync is available.'
        : 'Synced through the local vault. Remote collaboration keys stay local.'
  const localCollabTransport = useMemo(
    () => {
      const providers: LocalCollabTransportProvider[] = [
        {
          id: 'local-sqlite',
          transport: {
            publish: publishVaultCollaborationEvent,
            list: listVaultCollaborationEvents,
            getCrdtState: getVaultCollaborationCrdtState,
            saveCrdtState: saveVaultCollaborationCrdtState,
          },
        },
      ]
      const remoteBaseUrl = normalizedEditorPreferences.remoteCollaborationBaseUrl
      const pairingKey = normalizedEditorPreferences.remoteCollaborationPairingKey
      if (
        normalizedEditorPreferences.remoteCollaborationEnabled &&
        isNotesRemoteCollaborationBaseUrl(remoteBaseUrl) &&
        isNotesRemoteCollaborationPairingKey(pairingKey)
      ) {
        providers.push({
          id: 'remote-http',
          transport: createVaultCollaborationHttpTransport({
            baseUrl: remoteBaseUrl,
            apiKey: getRemoteApiKey(),
            pairingKey,
            timeoutMs: 10_000,
          }),
        })
      }
      return createLayeredLocalCollabTransport(providers)
    },
    [
      normalizedEditorPreferences.remoteCollaborationBaseUrl,
      normalizedEditorPreferences.remoteCollaborationEnabled,
      normalizedEditorPreferences.remoteCollaborationPairingKey,
    ],
  )
  const [localCollabProviderStatuses, setLocalCollabProviderStatuses] = useState<LocalCollabTransportStatus[]>(() =>
    localCollabTransport.status(),
  )
  useEffect(() => {
    setLocalCollabProviderStatuses(localCollabTransport.status())
    const timer = window.setInterval(() => {
      setLocalCollabProviderStatuses(localCollabTransport.status())
    }, 2_000)
    return () => window.clearInterval(timer)
  }, [localCollabTransport])
  const localCollabProviderSummary = useMemo(
    () => summarizeLocalCollabProviderStatuses(localCollabProviderStatuses),
    [localCollabProviderStatuses],
  )
  const {
    supported: localCollabSupported,
    peers: localCollabPeers,
    drafts: localCollabDrafts,
    syncing: localCollabSyncing,
    lastSyncedAt: localCollabLastSyncedAt,
    lastSyncError: localCollabLastSyncError,
    syncNow: syncLocalCollabNow,
    broadcastOperation: broadcastLocalOperation,
    broadcastCursor: broadcastLocalCursor,
    dismissDraft: dismissLocalCollabDraft,
  } = useLocalNoteCollaboration(selected?.type === 'note' ? selected._id : null, 'Local editor', localCollabTransport)
  const vaultTemplates = useMemo(() => vaultTemplatesFromNotes(notes), [notes])
  const allTemplates = useMemo<NoteTemplate[]>(() => [...NOTE_TEMPLATES, ...vaultTemplates], [vaultTemplates])
  const selectedFolderTemplate = useMemo(
    () => selectFolderTemplate(vaultTemplates, selected?.folder),
    [selected?.folder, vaultTemplates],
  )
  const vaultPlugins = useMemo(() => installedVaultPlugins(notes), [notes])
  const vaultPluginCommands = useMemo(() => buildVaultPluginCommandContributions(notes), [notes])
  const pinnedNoteSet = useMemo(() => new Set(pinnedNoteIds), [pinnedNoteIds])
  const pinnedNotesSyncLabel =
    pinnedNotesSyncState === 'loading'
      ? 'Pinned notes syncing'
      : pinnedNotesSyncState === 'saving'
        ? 'Pinned notes saving'
        : pinnedNotesSyncState === 'synced'
          ? 'Pinned notes synced'
          : pinnedNotesSyncState === 'error'
            ? 'Pinned notes unsynced'
            : 'Pinned notes local'
  const pinnedNotesSyncDetail =
    pinnedNotesSyncState === 'error'
      ? pinnedNotesSyncError || 'Local pinned notes are kept on this device.'
      : pinnedNotesSyncState === 'local'
        ? 'Saved locally until vault sync is available.'
        : 'Synced through the local vault.'
  const normalizedSavedSearches = useMemo(() => normalizeSavedSearches(savedSearches), [savedSearches])
  const savedSearchSyncLabel =
    savedSearchSyncState === 'loading'
      ? 'Searches syncing'
      : savedSearchSyncState === 'saving'
        ? 'Searches saving'
        : savedSearchSyncState === 'synced'
          ? 'Searches synced'
          : savedSearchSyncState === 'error'
            ? 'Searches unsynced'
            : 'Searches local'
  const savedSearchSyncDetail =
    savedSearchSyncState === 'error'
      ? savedSearchSyncError || 'Local saved searches are kept on this device.'
      : savedSearchSyncState === 'local'
        ? 'Saved locally until vault sync is available.'
        : 'Synced through the local vault.'
  const canvasBoardNote = useMemo(
    () => notes.find(note => note.type === 'note' && isCanvasBoardNote(note)) ?? null,
    [notes],
  )
  const reviewMarkers = useMemo<NoteReviewMarker[]>(() => {
    if (!selected || selected.type === 'attachment') return []
    return [
      ...noteComments
        .filter(comment => !comment.resolved_at && comment.status !== 'resolved')
        .map(comment => ({
          id: comment.id,
          kind: 'comment' as const,
          status: comment.status,
          anchor: comment.anchor,
        })),
      ...noteSuggestions
        .filter(suggestion => suggestion.status === 'open')
        .map(suggestion => {
          const patchType = typeof suggestion.patch.type === 'string' ? suggestion.patch.type : ''
          const content = typeof suggestion.patch.content === 'string' ? suggestion.patch.content : ''
          const anchor = normalizeSelectionAnchor(suggestion.anchor)
          const trackedChange =
            patchType === 'replace_selection'
              ? { type: 'replace' as const, before: anchor?.quote ?? '', after: content }
              : patchType === 'insert_at_cursor'
                ? { type: 'insert' as const, after: content }
                : patchType === 'replace_document'
                  ? { type: 'replace_document' as const, after: content }
                  : undefined
          return {
            id: suggestion.id,
            kind: 'suggestion' as const,
            status: suggestion.status,
            anchor: suggestion.anchor,
            trackedChange,
          }
        }),
    ]
  }, [noteComments, noteSuggestions, selected])

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  useEffect(() => {
    editorPreferencesRef.current = normalizedEditorPreferences
    editorPreferencesSyncStateRef.current = notesEditorPreferencesToSyncState(
      normalizedEditorPreferences,
      Number(editorPreferencesSyncUpdatedAt) || 0,
    )
  }, [editorPreferencesSyncUpdatedAt, normalizedEditorPreferences])

  const syncEditorPreferencesState = useCallback(async (state: SyncedNotesEditorPreferences) => {
    const normalized = notesEditorPreferencesToSyncState(state.preferences, Number(state.updatedAt) || Date.now())
    editorPreferencesSyncStateRef.current = normalized
    setEditorPreferencesSyncState('saving')
    setEditorPreferencesSyncError(null)
    try {
      await saveSyncedNotesEditorPreferences(normalized)
      setEditorPreferencesSyncState('synced')
    } catch (err) {
      setEditorPreferencesSyncState('error')
      setEditorPreferencesSyncError(errorMessage(err))
    }
  }, [])

  const updateEditorPreferences = useCallback((preferences: NotesEditorPreferences) => {
    const normalized = normalizeNotesEditorPreferences(preferences)
    const updatedAt = Date.now()
    const syncState = notesEditorPreferencesToSyncState(normalized, updatedAt)
    editorPreferencesRef.current = normalized
    editorPreferencesSyncStateRef.current = syncState
    setEditorPreferences(normalized)
    setEditorPreferencesSyncUpdatedAt(updatedAt)
    void syncEditorPreferencesState(syncState)
  }, [setEditorPreferences, setEditorPreferencesSyncUpdatedAt, syncEditorPreferencesState])

  const updateWritingAssistDefaults = useCallback((controls: WritingAssistControls) => {
    updateEditorPreferences({
      ...editorPreferencesRef.current,
      writingAssistProvider: controls.provider,
      writingAssistTone: controls.tone,
      writingAssistLength: controls.length,
    })
  }, [updateEditorPreferences])

  useEffect(() => {
    let cancelled = false
    setEditorPreferencesSyncState('loading')
    setEditorPreferencesSyncError(null)

    async function loadEditorPreferences() {
      const local = editorPreferencesSyncStateRef.current
      const synced = await loadSyncedNotesEditorPreferences()
      if (cancelled) return
      const merged = mergeSyncedNotesEditorPreferences(synced, local)
      editorPreferencesSyncStateRef.current = merged
      if (!syncedNotesEditorPreferencesEqual(merged, local)) {
        const nextPreferences = applySyncedNotesEditorPreferences(editorPreferencesRef.current, merged)
        editorPreferencesRef.current = nextPreferences
        setEditorPreferences(nextPreferences)
        setEditorPreferencesSyncUpdatedAt(merged.updatedAt)
      }
      if (!syncedNotesEditorPreferencesEqual(merged, synced)) {
        await syncEditorPreferencesState(merged)
        return
      }
      setEditorPreferencesSyncState('synced')
    }

    loadEditorPreferences().catch((err) => {
      if (cancelled) return
      setEditorPreferencesSyncState('error')
      setEditorPreferencesSyncError(errorMessage(err))
    })

    return () => {
      cancelled = true
    }
  }, [setEditorPreferences, setEditorPreferencesSyncUpdatedAt, syncEditorPreferencesState])

  const handleRetryEditorPreferencesSync = useCallback(() => {
    void syncEditorPreferencesState(editorPreferencesSyncStateRef.current)
  }, [syncEditorPreferencesState])

  useEffect(() => {
    pinnedNotesStateRef.current = {
      pinnedNoteIds: normalizePinnedNoteIds(pinnedNoteIds),
      updatedAt: Number(pinnedNoteSyncUpdatedAt) || 0,
    }
  }, [pinnedNoteIds, pinnedNoteSyncUpdatedAt])

  const syncPinnedNotesState = useCallback(async (state: NotesPinnedNotesState) => {
    const normalized: NotesPinnedNotesState = {
      pinnedNoteIds: normalizePinnedNoteIds(state.pinnedNoteIds),
      updatedAt: Number(state.updatedAt) || Date.now(),
    }
    pinnedNotesStateRef.current = normalized
    setPinnedNotesSyncState('saving')
    setPinnedNotesSyncError(null)
    try {
      await saveSyncedPinnedNotesState(normalized)
      setPinnedNotesSyncState('synced')
    } catch (err) {
      setPinnedNotesSyncState('error')
      setPinnedNotesSyncError(errorMessage(err))
    }
  }, [])

  const updatePinnedNoteIds = useCallback((updater: (previous: string[]) => string[]) => {
    const updatedAt = Date.now()
    setPinnedNoteIds(prev => {
      const next = normalizePinnedNoteIds(updater(prev))
      const nextState = { pinnedNoteIds: next, updatedAt }
      pinnedNotesStateRef.current = nextState
      void syncPinnedNotesState(nextState)
      return next
    })
    setPinnedNoteSyncUpdatedAt(updatedAt)
  }, [setPinnedNoteIds, setPinnedNoteSyncUpdatedAt, syncPinnedNotesState])

  useEffect(() => {
    let cancelled = false
    setPinnedNotesSyncState('loading')
    setPinnedNotesSyncError(null)

    async function loadPinnedNotesState() {
      const local = pinnedNotesStateRef.current
      const synced = await loadSyncedPinnedNotesState()
      if (cancelled) return
      const merged = mergePinnedNotesState(synced, local)
      pinnedNotesStateRef.current = merged
      if (!pinnedNotesStateEqual(merged, local)) {
        setPinnedNoteIds(merged.pinnedNoteIds)
        setPinnedNoteSyncUpdatedAt(merged.updatedAt)
      }
      if (!pinnedNotesStateEqual(merged, synced)) {
        await syncPinnedNotesState(merged)
        return
      }
      setPinnedNotesSyncState('synced')
    }

    loadPinnedNotesState().catch((err) => {
      if (cancelled) return
      setPinnedNotesSyncState('error')
      setPinnedNotesSyncError(errorMessage(err))
    })

    return () => {
      cancelled = true
    }
  }, [setPinnedNoteIds, setPinnedNoteSyncUpdatedAt, syncPinnedNotesState])

  const handleRetryPinnedNotesSync = useCallback(() => {
    void syncPinnedNotesState(pinnedNotesStateRef.current)
  }, [syncPinnedNotesState])

  useEffect(() => {
    savedSearchesRef.current = normalizedSavedSearches
  }, [normalizedSavedSearches])

  const syncSavedSearches = useCallback(async (searches: NotesSavedSearch[]) => {
    const normalized = normalizeSavedSearches(searches)
    savedSearchesRef.current = normalized
    setSavedSearchSyncState('saving')
    setSavedSearchSyncError(null)
    try {
      await saveSyncedNotesSavedSearches(normalized)
      setSavedSearchSyncState('synced')
    } catch (err) {
      setSavedSearchSyncState('error')
      setSavedSearchSyncError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setSavedSearchSyncState('loading')
    setSavedSearchSyncError(null)

    async function loadSavedSearches() {
      const local = savedSearchesRef.current
      const synced = await loadSyncedNotesSavedSearches()
      if (cancelled) return
      const merged = mergeSavedSearches(synced, local)
      savedSearchesRef.current = merged
      if (!savedSearchesEqual(merged, local)) {
        setSavedSearches(merged)
      }
      if (!savedSearchesEqual(merged, synced)) {
        await syncSavedSearches(merged)
        return
      }
      setSavedSearchSyncState('synced')
    }

    loadSavedSearches().catch((err) => {
      if (cancelled) return
      setSavedSearchSyncState('error')
      setSavedSearchSyncError(errorMessage(err))
    })

    return () => {
      cancelled = true
    }
  }, [setSavedSearches, syncSavedSearches])

  const handleRetrySavedSearchSync = useCallback(() => {
    void syncSavedSearches(savedSearchesRef.current)
  }, [syncSavedSearches])

  useEffect(() => {
    const updateNetworkState = () => setNetworkOnline(navigator.onLine !== false)
    window.addEventListener('online', updateNetworkState)
    window.addEventListener('offline', updateNetworkState)
    updateNetworkState()
    return () => {
      window.removeEventListener('online', updateNetworkState)
      window.removeEventListener('offline', updateNetworkState)
    }
  }, [])

  useEffect(() => {
    const updateTopBarDensity = (observedWidth?: number) => {
      const measuredWidth = observedWidth ?? topBarRef.current?.getBoundingClientRect().width ?? 0
      setCompactTopBarActions(
        window.innerWidth < COMPACT_TOPBAR_VIEWPORT_WIDTH ||
          (measuredWidth > 0 && measuredWidth < COMPACT_TOPBAR_ACTUAL_WIDTH),
      )
    }
    updateTopBarDensity()
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(entries => {
          updateTopBarDensity(entries[0]?.contentRect.width)
        })
    const handleWindowResize = () => updateTopBarDensity()
    if (topBarRef.current) observer?.observe(topBarRef.current)
    window.addEventListener('resize', handleWindowResize)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [])

  useEffect(() => {
    selectionAnchorRef.current = null
    setSelectionAnchor(null)
    setActiveReviewId(null)
    setTopBarMenu(null)
  }, [selectedId])

  useEffect(() => {
    setTopBarMenu(null)
  }, [compactTopBarActions, viewMode])

  useEffect(() => {
    if (!topBarMenu) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTopBarMenu(null)
    }
    // TopBarMenuButton owns pointer dismissal, including its portalled menu.
    // A second listener here treated menu actions as outside clicks and removed
    // them before the browser could dispatch click.
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [topBarMenu])

  useEffect(() => {
    if (!selectedId || selected?.type === 'attachment') {
      setNoteComments([])
      setNoteSuggestions([])
      return
    }
    let cancelled = false
    Promise.allSettled([getNoteComments(selectedId), getNoteSuggestions(selectedId)]).then(
      ([commentsResult, suggestionsResult]) => {
        if (cancelled) return
        setNoteComments(commentsResult.status === 'fulfilled' ? commentsResult.value : [])
        setNoteSuggestions(suggestionsResult.status === 'fulfilled' ? suggestionsResult.value : [])
      },
    )
    return () => {
      cancelled = true
    }
  }, [selectedId, selected?.type])

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) {
      setSearchResultNotes(null)
      return
    }
    const backendQuery = noteSearchText(query)
    if (!backendQuery) {
      setSearchResultNotes(null)
      return
    }

    let cancelled = false
    const timer = setTimeout(() => {
      searchVaultNotes(backendQuery)
        .then(results => {
          if (!cancelled) setSearchResultNotes(results)
        })
        .catch(err => {
          console.warn('[notes] local vault search failed, using in-memory search:', err)
          if (!cancelled) setSearchResultNotes(null)
        })
    }, 160)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery])

  const unavailableNoteIds = useMemo(
    () => new Set(unavailableNotes.map(note => note._id)),
    [unavailableNotes],
  )
  const visibleVaultNotes = useMemo(() => {
    const byId = new Map<string, VaultNote>()
    for (const note of notes) byId.set(note._id, note)
    for (const note of unavailableNotes) {
      if (!byId.has(note._id)) byId.set(note._id, note)
    }
    return [...byId.values()]
  }, [notes, unavailableNotes])
  const fileTreeNotes = useMemo(
    () => {
      if (!searchResultNotes) return visibleVaultNotes
      const byId = new Map(searchResultNotes.map(note => [note._id, note]))
      for (const note of unavailableNotes) {
        if (matchesNoteSearch(note, searchQuery) && !byId.has(note._id)) {
          byId.set(note._id, note)
        }
      }
      return [...byId.values()]
    },
    [searchQuery, searchResultNotes, unavailableNotes, visibleVaultNotes],
  )
  const searchUsesBackend = searchResultNotes !== null

  const allNoteTitles = useMemo(
    () => visibleVaultNotes.filter(n => n.type === 'note').flatMap(n => [n.title, ...(n.aliases ?? [])]),
    [visibleVaultNotes],
  )

  const normalizedRecentLimit = Math.max(1, Math.min(10, Number(recentLimit) || 5))
  const noteById = useMemo(() => new Map(notes.map(note => [note._id, note])), [notes])
  const pinnedWorkspaceNotes = useMemo(
    () => pinnedNoteIds
      .map(id => noteById.get(id))
      .filter((note): note is VaultNote => !!note && note.type === 'note' && !isNoteInTrash(note))
      .slice(0, 5),
    [noteById, pinnedNoteIds],
  )
  const recentWorkspaceNotes = useMemo(
    () => recentNoteIds
      .map(id => noteById.get(id))
      .filter((note): note is VaultNote => !!note && note.type === 'note' && !isNoteInTrash(note))
      .filter(note => !pinnedNoteSet.has(note._id))
      .slice(0, normalizedRecentLimit),
    [noteById, normalizedRecentLimit, pinnedNoteSet, recentNoteIds],
  )
  const workspaceTabNotes = useMemo(
    () => workspaceTabIds
      .map(id => noteById.get(id))
      .filter((note): note is VaultNote => !!note && note.type === 'note' && !isNoteInTrash(note))
      .slice(0, 8),
    [noteById, workspaceTabIds],
  )
  const workspaceSidePaneNote = useMemo(() => {
    if (!workspaceSidePaneId) return null
    const note = noteById.get(workspaceSidePaneId)
    return note?.type === 'note' && !isNoteInTrash(note) ? note : null
  }, [noteById, workspaceSidePaneId])
  const workspaceSidePanePixelWidth = clampWorkspaceSidePaneWidth(
    Number(workspaceSidePaneWidth) || DEFAULT_WORKSPACE_SIDE_PANE_WIDTH,
  )
  const workspaceExpandedFolders = useMemo(
    () => [...fileTreeExpandedFolders]
      .map(path => path.trim())
      .filter(Boolean)
      .filter((path, index, paths) => paths.indexOf(path) === index)
      .sort()
      .slice(0, 32),
    [fileTreeExpandedFolders],
  )
  const dataWorkspaceContextId = useMemo(() => [
    dataWorkspaceContext.mode,
    dataWorkspaceContext.query,
    dataWorkspaceContext.dataSortKey,
    dataWorkspaceContext.taskSortKey,
    dataWorkspaceContext.sortDirection,
    dataWorkspaceContext.groupKey,
    dataWorkspaceContext.layout,
    dataWorkspaceContext.formulaKey,
    dataWorkspaceContext.customFormula,
  ].join('|').slice(0, 280), [dataWorkspaceContext])
  const currentWorkspaceSnapshotName = `${viewModeLabel(viewMode)} / ${selected?.title || 'No active note'}`
  const currentWorkspaceSnapshotId = [
    viewMode,
    focusMode ? 'focus' : 'tree',
    infoPanelOpen ? 'info' : 'no-info',
    selectedId ?? 'no-note',
    workspaceSidePaneNote?._id ?? 'no-side-pane',
    workspaceTabIds.join('|') || 'no-tabs',
    viewMode === 'data' ? dataWorkspaceContextId : 'no-data',
  ].join(':')
  const normalizedWorkspaceSnapshots = workspaceSnapshots
    .filter(snapshot => snapshot && typeof snapshot.savedAt === 'number')
    .slice()
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, 8)
  const workspaceSyncLabel =
    workspaceSyncState === 'loading'
      ? 'Workspaces syncing'
      : workspaceSyncState === 'saving'
        ? 'Workspaces saving'
        : workspaceSyncState === 'synced'
          ? 'Workspaces synced'
          : workspaceSyncState === 'error'
            ? 'Workspaces unsynced'
            : 'Workspaces local'
  const workspaceSyncDetail =
    workspaceSyncState === 'error'
      ? workspaceSyncError || 'Local presets are kept on this device.'
      : workspaceSyncState === 'local'
        ? 'Saved locally until vault sync is available.'
        : 'Synced through the local vault.'

  useEffect(() => {
    workspaceSnapshotsRef.current = normalizeNotesWorkspaceSnapshots(workspaceSnapshots)
  }, [workspaceSnapshots])

  const syncWorkspaceSnapshots = useCallback(async (snapshots: NotesWorkspaceSnapshot[]) => {
    const normalized = normalizeNotesWorkspaceSnapshots(snapshots)
    workspaceSnapshotsRef.current = normalized
    setWorkspaceSyncState('saving')
    setWorkspaceSyncError(null)
    try {
      await saveSyncedNotesWorkspaceSnapshots(normalized)
      setWorkspaceSyncState('synced')
    } catch (err) {
      setWorkspaceSyncState('error')
      setWorkspaceSyncError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setWorkspaceSyncState('loading')
    setWorkspaceSyncError(null)

    async function loadWorkspaceSnapshots() {
      const local = workspaceSnapshotsRef.current
      const synced = await loadSyncedNotesWorkspaceSnapshots()
      if (cancelled) return
      const merged = mergeNotesWorkspaceSnapshots(synced, local)
      workspaceSnapshotsRef.current = merged
      if (!notesWorkspaceSnapshotsEqual(merged, local)) {
        setWorkspaceSnapshots(merged)
      }
      setWorkspaceSnapshot(prev => prev ?? merged[0] ?? null)
      if (!notesWorkspaceSnapshotsEqual(merged, synced)) {
        await syncWorkspaceSnapshots(merged)
        return
      }
      setWorkspaceSyncState('synced')
    }

    loadWorkspaceSnapshots().catch((err) => {
      if (cancelled) return
      setWorkspaceSyncState('error')
      setWorkspaceSyncError(errorMessage(err))
    })

    return () => {
      cancelled = true
    }
  }, [setWorkspaceSnapshot, setWorkspaceSnapshots, syncWorkspaceSnapshots])

  const handleRetryWorkspaceSync = useCallback(() => {
    void syncWorkspaceSnapshots(workspaceSnapshotsRef.current)
  }, [syncWorkspaceSnapshots])

  const flushPendingSave = useCallback(
    async (id?: string) => {
      const pending = id ? pendingContentRef.current.get(id) : undefined
      const entries: Array<[string, string]> = id
        ? pending === undefined
          ? []
          : [[id, pending]]
        : [...pendingContentRef.current.entries()]

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      if (entries.length === 0) return

      if (!networkOnline) {
        setSaveState('unsaved')
        return
      }

      setSaveState('saving')
      let failed = false
      for (const [noteId, content] of entries) {
        const note = notesRef.current.find(item => item._id === noteId)
        if (!note || note.type === 'attachment') continue
        try {
          const saved = await updateNote({ ...note, content })
          notesRef.current = notesRef.current.map(item => (item._id === saved._id ? saved : item))
          pendingContentRef.current.delete(noteId)
          setSaveErrorByNoteId(prev => {
            if (!(noteId in prev)) return prev
            const next = { ...prev }
            delete next[noteId]
            return next
          })
        } catch (err) {
          failed = true
          const message = errorMessage(err)
          console.error('[notes] autosave failed:', err)
          setSaveErrorByNoteId(prev => ({ ...prev, [noteId]: message }))
        }
      }
      if (failed) {
        setSaveState('error')
      } else {
        setLastSavedAt(Date.now())
        setSaveState(pendingContentRef.current.size ? 'unsaved' : 'saved')
      }
    },
    [networkOnline, updateNote],
  )

  useEffect(() => {
    if (!networkOnline || pendingContentRef.current.size === 0) return
    void flushPendingSave()
  }, [flushPendingSave, networkOnline])

  useEffect(() => {
    if (initialSelectionRecoveredRef.current || loading || !focusMode) return
    if (selectedId && selected) {
      initialSelectionRecoveredRef.current = true
      return
    }

    const firstEditableNote = notes.find(note => note.type === 'note' && !isNoteInTrash(note))
    if (!firstEditableNote) return

    initialSelectionRecoveredRef.current = true
    setSelectedId(firstEditableNote._id)
    if (viewMode !== 'editor') setViewMode('editor')
  }, [focusMode, loading, notes, selected, selectedId, viewMode])

  useEffect(() => {
    const onBeforeUnload = () => {
      void flushPendingSave()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      void flushPendingSave()
    }
  }, [flushPendingSave])

  useEffect(() => {
    if (!selectedId) return
    setRecentNoteIds(prev => [selectedId, ...prev.filter(id => id !== selectedId)].slice(0, 24))
  }, [selectedId, setRecentNoteIds])

  useEffect(() => {
    if (!selected || selected.type !== 'note' || isNoteInTrash(selected)) return
    setWorkspaceTabIds(prev => {
      if (prev.includes(selected._id)) return prev
      return [selected._id, ...prev].slice(0, 8)
    })
  }, [selected, setWorkspaceTabIds])

  useEffect(() => {
    if (loading) return
    const liveNoteIds = new Set(
      notes
        .filter(note => note.type === 'note' && !isNoteInTrash(note))
        .map(note => note._id),
    )
    setWorkspaceTabIds(prev => {
      const next = prev
        .filter((id, index, ids) => ids.indexOf(id) === index && liveNoteIds.has(id))
        .slice(0, 8)
      if (next.length === prev.length && next.every((id, index) => id === prev[index])) return prev
      return next
    })
  }, [loading, notes, setWorkspaceTabIds])

  useEffect(() => {
    if (loading || !selectedId || selected) return
    const firstEditableNote = notes.find(note => note.type === 'note' && !isNoteInTrash(note))
    if (!firstEditableNote) return
    setSelectedId(firstEditableNote._id)
    if (viewMode !== 'editor') setViewMode('editor')
  }, [loading, notes, selected, selectedId, viewMode])

  useEffect(() => {
    if (!workspaceSidePaneId) return
    const note = noteById.get(workspaceSidePaneId)
    if (!note || note.type !== 'note' || isNoteInTrash(note)) {
      setWorkspaceSidePaneId(null)
    }
  }, [noteById, setWorkspaceSidePaneId, workspaceSidePaneId])

  useEffect(() => {
    if (!editingTitle) setTitleDraft(selected?.title ?? '')
  }, [editingTitle, selected?.title])

  const resolveTemplatePromptRequest = useCallback((values: Record<string, string> | null) => {
    templatePromptResolverRef.current?.(values)
    templatePromptResolverRef.current = null
    setTemplatePromptRequest(null)
  }, [])

  const collectTemplatePromptValues = useCallback((template: NoteTemplate): Promise<Record<string, string> | null> => {
    const prompts = extractTemplatePrompts(template.content)
    if (prompts.length === 0) return Promise.resolve({})
    templatePromptResolverRef.current?.(null)
    return new Promise(resolve => {
      templatePromptResolverRef.current = resolve
      setTemplatePromptRequest({ templateLabel: template.label, prompts })
    })
  }, [])

  const handleCreate = useCallback(
    async (folder?: string, title = 'Untitled', content = '', options: { useFolderTemplate?: boolean } = {}) => {
      const folderTemplate = content || options.useFolderTemplate === false ? null : selectFolderTemplate(vaultTemplates, folder)
      const promptValues = folderTemplate ? await collectTemplatePromptValues(folderTemplate) : {}
      if (!promptValues) return
      const nextContent = folderTemplate
        ? applyTemplate(folderTemplate, { title, folder, promptValues })
        : content
      const note = await createNote(title, folder, nextContent)
      setSelectedId(note._id)
      setViewMode('editor')
      setTitleDraft(note.title)
      setTimeout(() => {
        setEditingTitle(true)
        titleRef.current?.focus()
      }, 50)
    },
    [collectTemplatePromptValues, createNote, vaultTemplates],
  )

  const handleCreateDailyNote = useCallback(
    async (folder?: string, date: Date = new Date()) => {
      const now = date
      const targetFolder = folder ?? normalizedEditorPreferences.dailyNoteFolder
      const title = buildDailyNoteTitle(normalizedEditorPreferences, now)
      const existing = normalizedEditorPreferences.dailyNoteOpenExisting
        ? notesRef.current.find(note =>
            note.type === 'note' &&
            note.title === title &&
            normalizeFolderPath(note.folder || '') === normalizeFolderPath(targetFolder || ''),
          )
        : null
      if (existing) {
        setSelectedId(existing._id)
        setViewMode('editor')
        setTitleDraft(existing.title)
        return
      }

      if (targetFolder) await createFolder(targetFolder)
      const daily =
        allTemplates.find(template => template.id === normalizedEditorPreferences.dailyNoteTemplateId) ??
        allTemplates.find(template => template.id === 'daily')
      const promptValues = daily ? await collectTemplatePromptValues(daily) : {}
      if (!promptValues) return
      await handleCreate(
        targetFolder,
        title,
        daily ? applyTemplate(daily, { now, title, folder: targetFolder, promptValues }) : `# ${title}\n\n`,
        { useFolderTemplate: false },
      )
    },
    [allTemplates, collectTemplatePromptValues, createFolder, handleCreate, normalizedEditorPreferences],
  )

  const handleCreatePeriodicNote = useCallback(
    async (kind: NotesPeriodicKind, folder?: string, date: Date = new Date()) => {
      if (kind === 'daily') {
        await handleCreateDailyNote(folder, date)
        return
      }

      const now = date
      const targetFolder = folder ?? periodicNoteFolder(kind, normalizedEditorPreferences)
      const title = buildPeriodicNoteTitle(kind, normalizedEditorPreferences, now)
      const existing = normalizedEditorPreferences.dailyNoteOpenExisting
        ? notesRef.current.find(note =>
            note.type === 'note' &&
            note.title === title &&
            normalizeFolderPath(note.folder || '') === normalizeFolderPath(targetFolder || ''),
          )
        : null
      if (existing) {
        setSelectedId(existing._id)
        setViewMode('editor')
        setTitleDraft(existing.title)
        return
      }

      if (targetFolder) await createFolder(targetFolder)
      const preferredTemplateId = periodicNoteTemplateId(kind, normalizedEditorPreferences)
      const template =
        allTemplates.find(item => item.id === preferredTemplateId) ??
        allTemplates.find(item => item.id === kind) ??
        allTemplates.find(item => item.id === normalizedEditorPreferences.dailyNoteTemplateId) ??
        allTemplates.find(item => item.id === 'daily')
      const promptValues = template ? await collectTemplatePromptValues(template) : {}
      if (!promptValues) return
      await handleCreate(
        targetFolder,
        title,
        template ? applyTemplate(template, { now, title, folder: targetFolder, promptValues }) : `# ${title}\n\n`,
        { useFolderTemplate: false },
      )
    },
    [allTemplates, collectTemplatePromptValues, createFolder, handleCreate, handleCreateDailyNote, normalizedEditorPreferences],
  )

  const handleCreateTemplate = useCallback(
    async (folder: string | undefined, templateId: string) => {
      const template = allTemplates.find(item => item.id === templateId)
      if (!template) return
      const title =
        template.id === 'meeting' ? 'Meeting Note' : template.id === 'project' ? 'Project Brief' : template.label
      const promptValues = await collectTemplatePromptValues(template)
      if (!promptValues) return
      await handleCreate(folder, title, applyTemplate(template, { title, folder, promptValues }), { useFolderTemplate: false })
    },
    [allTemplates, collectTemplatePromptValues, handleCreate],
  )

  const handleSaveSearch = useCallback(() => {
    const query = searchQuery.trim()
    if (!query) return
    setSavedSearches(prev => {
      const next = upsertSavedSearch(prev, { query })
      void syncSavedSearches(next)
      return next
    })
  }, [searchQuery, setSavedSearches, syncSavedSearches])

  const handleRemoveSavedSearch = useCallback(
    (id: string) => {
      setSavedSearches(prev => {
        const next = removeSavedSearch(prev, id)
        void syncSavedSearches(next)
        return next
      })
    },
    [setSavedSearches, syncSavedSearches],
  )

  const handleRenameTag = useCallback(
    (tag: string) => {
      const affected = affectedNotesForTagRename(notesRef.current, tag)
      if (affected.length === 0) return
      setTagRenameRequest({ tag, affectedCount: affected.length })
    },
    [],
  )

  const handleConfirmRenameTag = useCallback(
    async (tag: string, nextTag: string) => {
      const affected = affectedNotesForTagRename(notesRef.current, tag)
      if (affected.length === 0) {
        setTagRenameRequest(null)
        return
      }
      await flushPendingSave()
      for (const note of affected) {
        const nextContent = renameTagInContent(note.content, tag, nextTag)
        if (nextContent !== note.content) {
          await updateNote({ ...note, content: nextContent, updated_at: Date.now() })
        }
      }
      setTagRenameRequest(null)
      await refresh()
    },
    [flushPendingSave, refresh, updateNote],
  )

  const handleRemoveTag = useCallback(
    (tag: string) => {
      const affected = affectedNotesForTagRename(notesRef.current, tag)
      if (affected.length === 0) return
      setTagRemoveRequest({ tag, affectedCount: affected.length })
    },
    [],
  )

  const handleConfirmRemoveTag = useCallback(
    async (tag: string) => {
      const affected = affectedNotesForTagRename(notesRef.current, tag)
      if (affected.length === 0) {
        setTagRemoveRequest(null)
        return
      }
      await flushPendingSave()
      for (const note of affected) {
        const nextContent = removeTagFromContent(note.content, tag)
        if (nextContent !== note.content) {
          await updateNote({ ...note, content: nextContent, updated_at: Date.now() })
        }
      }
      setTagRemoveRequest(null)
      await refresh()
    },
    [flushPendingSave, refresh, updateNote],
  )

  const handleSaveCurrentAsTemplate = useCallback(() => {
    if (!selected || selected.type === 'attachment') return
    setTemplateNameRequest({ defaultTitle: selected.title ? `${selected.title} Template` : 'New Template' })
  }, [selected])

  const handleSubmitSaveCurrentAsTemplate = useCallback(async (title: string) => {
    if (!selected || selected.type === 'attachment') return
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    const content = pendingContentRef.current.get(selected._id) ?? selected.content
    await flushPendingSave(selected._id)
    await createFolder(VAULT_TEMPLATES_FOLDER)
    const template = await createNote(
      trimmedTitle,
      VAULT_TEMPLATES_FOLDER,
      `---\ntemplate: true\n---\n\n${content.replace(/^---[\s\S]*?\n---\s*/, '')}`,
    )
    setTemplateNameRequest(null)
    setSelectedId(template._id)
    setViewMode('editor')
    await refresh()
  }, [createFolder, createNote, flushPendingSave, refresh, selected])

  const handleCreateFolder = useCallback(
    (parent?: string) => {
      setFolderCreateRequest({ parent })
    },
    [],
  )

  const handleConfirmCreateFolder = useCallback(
    async (parent: string | undefined, name: string) => {
      const nextPath = normalizeFolderPath(parent ? `${parent}/${name}` : name)
      if (!nextPath) return
      await createFolder(nextPath)
      setFolderCreateRequest(null)
    },
    [createFolder],
  )

  const createSafetyCheckpoints = useCallback(
    async (ids: string[], label: string) => {
      const uniqueIds = [...new Set(ids)]
      for (const id of uniqueIds) {
        const note = notesRef.current.find(item => item._id === id)
        if (!note || note.type !== 'note') continue
        try {
          await flushPendingSave(id)
          await createNoteVersionCheckpoint(id, label)
        } catch (err) {
          console.warn('[notes] safety checkpoint failed:', err)
        }
      }
    },
    [flushPendingSave],
  )

  const requestConfirmAction = useCallback((request: ConfirmActionRequest) => {
    setTopBarMenu(null)
    setConfirmActionRequest(request)
  }, [])

  const showNotice = useCallback((request: NoticeRequest) => {
    setTopBarMenu(null)
    setNoticeRequest(request)
  }, [])

  const handleDeleteNote = useCallback(
    (id?: string) => {
      const targetId = id ?? selectedId
      if (!targetId) return
      const note = notes.find(n => n._id === targetId)
      if (!note) return
      const label = note?.title || targetId
      const permanent = isNoteInTrash(note)
      const action = permanent ? 'Permanently delete' : 'Move to Trash'
      requestConfirmAction({
        title: `${action} note`,
        detail: permanent
          ? `"${label}" will be permanently deleted from the local vault. This cannot be undone.`
          : `"${label}" will move to Trash. A safety checkpoint is created first.`,
        confirmLabel: action,
        tone: permanent ? 'danger' : 'default',
        onConfirm: async () => {
          setSearchResultNotes(null)
          const idx = notes.findIndex(n => n._id === targetId)
          const next =
            notes.slice(idx + 1).find(item => item._id !== targetId && !isNoteInTrash(item)) ??
            notes
              .slice(0, idx)
              .reverse()
              .find(item => item._id !== targetId && !isNoteInTrash(item)) ??
            null
          if (selectedId === targetId) setSelectedId(next?._id ?? null)
          updatePinnedNoteIds(prev => prev.filter(noteId => noteId !== targetId))
          setRecentNoteIds(prev => prev.filter(noteId => noteId !== targetId))

          try {
            await flushPendingSave(targetId)
            await createSafetyCheckpoints([targetId], permanent ? 'Before permanent delete' : 'Before moving to Trash')
            if (permanent) {
              await deleteNote(targetId)
            } else {
              await trashNote(targetId)
            }
            await refresh()
          } catch (err) {
            showNotice({
              title: `${action} failed`,
              detail: err instanceof Error ? err.message : `${action} failed`,
              tone: 'danger',
            })
            await refresh()
          }
        }
      })
    },
    [
      createSafetyCheckpoints,
      deleteNote,
      flushPendingSave,
      notes,
      refresh,
      requestConfirmAction,
      selectedId,
      setRecentNoteIds,
      showNotice,
      trashNote,
      updatePinnedNoteIds,
    ],
  )

  const handleRestoreFromTrash = useCallback(async () => {
    if (!selected || !isNoteInTrash(selected)) return
    setSearchResultNotes(null)
    const restored = await restoreTrashedNote(selected._id)
    setSelectedId(restored._id)
    setViewMode('editor')
    await refresh()
  }, [refresh, restoreTrashedNote, selected])

  const handleEmptyTrash = useCallback(async () => {
    const trashed = notes.filter(isNoteInTrash)
    const trashedFolders = folders.filter(folder => isNotesTrashPath(folder.path))
    if (trashed.length === 0 && trashedFolders.length === 0) {
      showNotice({
        title: 'Trash is empty',
        detail: 'There are no trashed notes or folders to permanently delete.',
      })
      return
    }
    requestConfirmAction({
      title: 'Empty Trash',
      detail: `Permanently delete ${trashed.length} trashed note${trashed.length === 1 ? '' : 's'} and ${trashedFolders.length} folder${trashedFolders.length === 1 ? '' : 's'}. This cannot be undone.`,
      confirmLabel: 'Empty Trash',
      tone: 'danger',
      onConfirm: async () => {
        setSearchResultNotes(null)
        await flushPendingSave()
        await createSafetyCheckpoints(
          trashed.map(note => note._id),
          'Before emptying Trash',
        )
        await emptyTrash()
        if (selectedId && trashed.some(note => note._id === selectedId)) {
          setSelectedId(null)
        }
        updatePinnedNoteIds(prev => prev.filter(id => !trashed.some(note => note._id === id)))
        setRecentNoteIds(prev => prev.filter(id => !trashed.some(note => note._id === id)))
        await refresh()
      },
    })
  }, [
    createSafetyCheckpoints,
    emptyTrash,
    flushPendingSave,
    folders,
    notes,
    refresh,
    requestConfirmAction,
    selectedId,
    setRecentNoteIds,
    showNotice,
    updatePinnedNoteIds,
  ])

  const refreshVaultSyncLedger = useCallback(async () => {
    try {
      const syncLedger = await getVaultSyncLedger(12)
      setVaultSyncLedger(syncLedger)
    } catch (err) {
      console.warn('[notes] could not refresh sync ledger:', err)
    }
  }, [])

  const handleOpenVaultStatus = useCallback(async () => {
    setVaultStatusOpen(true)
    setVaultStatusLoading(true)
    setVaultStatusError(null)
    try {
      const [status, auditEvents, syncLedger] = await Promise.all([
        getVaultStatus(),
        getVaultAuditEvents(12),
        getVaultSyncLedger(12),
      ])
      setVaultStatus(status)
      setVaultAuditEvents(auditEvents)
      setVaultSyncLedger(syncLedger)
    } catch (err) {
      setVaultStatus(null)
      setVaultAuditEvents([])
      setVaultSyncLedger(null)
      setVaultStatusError(err instanceof Error ? err.message : 'Could not load vault status')
    } finally {
      setVaultStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshVaultSyncLedger()
  }, [refreshVaultSyncLedger])

  useEffect(() => {
    if (topBarMenu !== 'status' && topBarMenu !== 'note-tools') return
    void refreshVaultSyncLedger()
  }, [refreshVaultSyncLedger, topBarMenu])

  useEffect(() => {
    const refreshVisibleLedger = () => {
      if (document.visibilityState !== 'hidden') void refreshVaultSyncLedger()
    }
    window.addEventListener('online', refreshVisibleLedger)
    document.addEventListener('visibilitychange', refreshVisibleLedger)
    return () => {
      window.removeEventListener('online', refreshVisibleLedger)
      document.removeEventListener('visibilitychange', refreshVisibleLedger)
    }
  }, [refreshVaultSyncLedger])

  const loadRecoverableDrafts = useCallback(() => {
    setRecoverableDrafts(getRecoverableDrafts())
  }, [])

  const handleOpenDraftRecovery = useCallback(() => {
    loadRecoverableDrafts()
    setDraftRecoveryOpen(true)
  }, [loadRecoverableDrafts])

  const handleManualSaveCheckpoint = useCallback(async () => {
    if (!selectedId) return
    const note = notesRef.current.find(item => item._id === selectedId)
    if (!note || note.type !== 'note') return
    const hadPendingChange = pendingContentRef.current.has(selectedId)
    await flushPendingSave(selectedId)
    if (!hadPendingChange || pendingContentRef.current.has(selectedId)) return
    try {
      await createNoteVersionCheckpoint(selectedId, 'Manual save')
      setLastSavedAt(Date.now())
      setSaveState(pendingContentRef.current.size ? 'unsaved' : 'saved')
    } catch (err) {
      console.warn('[notes] manual save checkpoint failed:', err)
      setSaveState('error')
    }
  }, [flushPendingSave, selectedId])

  const handleRetryQueuedSave = useCallback(async () => {
    if (!networkOnline || pendingContentRef.current.size === 0) return
    await flushPendingSave()
  }, [flushPendingSave, networkOnline])

  const handleOpenQueuedEdit = useCallback((noteId: string) => {
    const note = notesRef.current.find(item => item._id === noteId)
    if (!note || note.type === 'attachment') return
    setSelectedId(noteId)
    setViewMode('editor')
    setTitleDraft(note.title)
    setQueuedEditsOpen(false)
  }, [])

  const handleOpenDiagnosticsNote = useCallback((noteId: string) => {
    const note = notesRef.current.find(item => item._id === noteId)
    if (!note || note.type === 'attachment') return
    setSelectedId(noteId)
    setViewMode('editor')
    setTitleDraft(note.title)
    setVaultStatusOpen(false)
  }, [])

  const handleRestoreDraft = useCallback(
    async (id: string) => {
      const restored = await restoreLocalDraft(id)
      setSelectedId(restored._id)
      setViewMode('editor')
      await refresh()
      loadRecoverableDrafts()
    },
    [loadRecoverableDrafts, refresh],
  )

  const handleDiscardDraft = useCallback(
    async (id: string) => {
      discardLocalDraft(id)
      await refresh()
      loadRecoverableDrafts()
    },
    [loadRecoverableDrafts, refresh],
  )

  const handleDeleteFolder = useCallback(
    (path: string) => {
      if (!path) return
      const affectedNotes = notes.filter(note => note.type === 'note' && isNoteInsideFolder(note, path))
      const affectedFolders = folders
        .filter(folder => isInsideFolder(folder.path, path))
        .sort((a, b) => b.path.length - a.path.length)
      const permanent = isNotesTrashPath(path)
      const action = permanent ? 'Permanently delete' : 'Move to Trash'
      requestConfirmAction({
        title: `${action} folder`,
        detail: permanent
          ? `Folder "${path}" and ${affectedNotes.length} note${affectedNotes.length === 1 ? '' : 's'} will be permanently deleted. This cannot be undone.`
          : `Folder "${path}" and ${affectedNotes.length} note${affectedNotes.length === 1 ? '' : 's'} will move to Trash. Safety checkpoints are created first.`,
        confirmLabel: action,
        tone: permanent ? 'danger' : 'default',
        onConfirm: async () => {
          setSearchResultNotes(null)
          await flushPendingSave()
          await createSafetyCheckpoints(
            affectedNotes.map(note => note._id),
            permanent ? 'Before permanent folder delete' : 'Before moving folder to Trash',
          )

          if (permanent) {
            for (const note of affectedNotes) {
              await deleteNote(note._id)
            }
            for (const folder of affectedFolders) {
              await deleteFolder(folder.path)
            }
            if (affectedFolders.length === 0) {
              await deleteFolder(path)
            }
          } else {
            await trashFolder(path)
          }

          if (selectedId && affectedNotes.some(note => note._id === selectedId)) {
            setSelectedId(null)
          }
          await refresh()
        }
      })
    },
    [
      createSafetyCheckpoints,
      deleteFolder,
      deleteNote,
      flushPendingSave,
      folders,
      notes,
      refresh,
      requestConfirmAction,
      selectedId,
      trashFolder,
    ],
  )

  const handleRestoreFolder = useCallback(
    (path: string) => {
      if (!isNotesTrashPath(path)) return
      const affectedNotes = notes.filter(note => note.type === 'note' && isNoteInsideFolder(note, path))
      requestConfirmAction({
        title: 'Restore folder',
        detail: `Restore folder "${path}" and ${affectedNotes.length} note${affectedNotes.length === 1 ? '' : 's'} from Trash.`,
        confirmLabel: 'Restore folder',
        onConfirm: async () => {
          setSearchResultNotes(null)
          await restoreTrashedFolder(path)
          await refresh()
        },
      })
    },
    [notes, refresh, requestConfirmAction, restoreTrashedFolder],
  )

  const handleRenameFolder = useCallback(
    (path: string) => {
      if (!path) return
      setFolderRenameRequest({
        path,
        affectedFolderCount: folders.filter(folder => folder.path === path || folder.path.startsWith(`${path}/`)).length,
        affectedNoteCount: notes.filter(note => isNoteInsideFolder(note, path)).length,
      })
    },
    [folders, notes],
  )

  const handleConfirmRenameFolder = useCallback(
    async (path: string, nextPathRaw: string) => {
      const nextPath = normalizeFolderPath(nextPathRaw)
      if (!nextPath || nextPath === path) return
      if (nextPath.startsWith(`${path}/`)) {
        showNotice({
          title: 'Folder rename blocked',
          detail: 'A folder cannot be renamed inside itself. Choose a sibling or parent path instead.',
          tone: 'warning',
        })
        return
      }
      setSearchResultNotes(null)

      const affectedFolders = folders
        .filter(folder => folder.path === path || folder.path.startsWith(`${path}/`))
        .sort((a, b) => a.path.length - b.path.length)
      const affectedNotes = notes.filter(note => isNoteInsideFolder(note, path))
      const movedByOldId = new Map<string, (typeof affectedNotes)[number]>()
      const rewrites: Array<[string, string]> = []
      await createSafetyCheckpoints(
        affectedNotes.map(note => note._id),
        'Before folder rename',
      )

      for (const folder of affectedFolders) {
        const suffix = folder.path === path ? '' : folder.path.slice(path.length)
        await createFolder(`${nextPath}${suffix}`)
      }

      for (const note of affectedNotes) {
        const currentFolder = noteFolderPath(note)
        const suffix = currentFolder === path ? '' : currentFolder.slice(path.length)
        const moved = await moveNote(note._id, `${nextPath}${suffix}`)
        movedByOldId.set(note._id, moved)
        rewrites.push([note._id, moved._id])
        updatePinnedNoteIds(prev => prev.map(noteId => (noteId === note._id ? moved._id : noteId)))
        setRecentNoteIds(prev => prev.map(noteId => (noteId === note._id ? moved._id : noteId)))
        if (selectedId === note._id) setSelectedId(moved._id)
      }

      for (const note of notes) {
        if (note.type !== 'note') continue
        const moved = movedByOldId.get(note._id)
        const target = moved ?? note
        const nextContent = applyPathRewrites(target.content, rewrites)
        if (nextContent !== target.content) {
          await updateNote({ ...target, content: nextContent })
        }
      }

      for (const folder of [...affectedFolders].sort((a, b) => b.path.length - a.path.length)) {
        await deleteFolder(folder.path)
      }
      setFolderRenameRequest(null)
      await refresh()
    },
    [
      createFolder,
      createSafetyCheckpoints,
      deleteFolder,
      folders,
      moveNote,
      notes,
      refresh,
      selectedId,
      setRecentNoteIds,
      showNotice,
      updatePinnedNoteIds,
      updateNote,
    ],
  )

  const handleRenameNote = useCallback(
    (id: string) => {
      const note = notes.find(item => item._id === id)
      setSelectedId(id)
      setViewMode('editor')
      setTitleDraft(note?.title ?? '')
      setTimeout(() => {
        setEditingTitle(true)
        titleRef.current?.focus()
      }, 50)
    },
    [notes],
  )

  const handleDuplicateNote = useCallback(
    async (id: string) => {
      const note = notes.find(n => n._id === id)
      if (!note || note.type === 'attachment') return
      const duplicate = await createNote(`${note.title || 'Untitled'} Copy`, note.folder, note.content)
      setSelectedId(duplicate._id)
      setViewMode('editor')
    },
    [createNote, notes],
  )

  const handleMoveNote = useCallback(
    (id: string) => {
      const note = notes.find(n => n._id === id)
      if (!note || note.type === 'attachment') return
      setMoveNoteRequest({
        noteId: id,
        title: note.title || 'Untitled',
        currentFolder: note.folder || '',
        folders: folders.map(folder => folder.path).filter(path => path.length > 0),
      })
    },
    [folders, notes],
  )

  const handleMoveNoteToFolder = useCallback(
    async (id: string, folder: string) => {
      setSearchResultNotes(null)
      await createSafetyCheckpoints([id], 'Before note move')
      const moved = await moveNote(id, normalizeFolderPath(folder))
      const rewrites: Array<[string, string]> = [[id, moved._id]]
      for (const candidate of notes) {
        if (candidate.type !== 'note') continue
        const target = candidate._id === id ? moved : candidate
        const nextContent = applyPathRewrites(target.content, rewrites)
        if (nextContent !== target.content) {
          await updateNote({ ...target, content: nextContent })
        }
      }
      updatePinnedNoteIds(prev => prev.map(noteId => (noteId === id ? moved._id : noteId)))
      setRecentNoteIds(prev => prev.map(noteId => (noteId === id ? moved._id : noteId)))
      if (selectedId === id) setSelectedId(moved._id)
    },
    [createSafetyCheckpoints, moveNote, notes, selectedId, setRecentNoteIds, updateNote, updatePinnedNoteIds],
  )

  const handleSubmitMoveNote = useCallback(async (folder: string) => {
    const request = moveNoteRequest
    if (!request) return
    await handleMoveNoteToFolder(request.noteId, folder)
    setMoveNoteRequest(null)
  }, [handleMoveNoteToFolder, moveNoteRequest])

  const handleRestoreNoteToFolder = useCallback(
    async (id: string, folder: string) => {
      setSearchResultNotes(null)
      const restored = await restoreTrashedNote(id, normalizeFolderPath(folder))
      if (selectedId === id) setSelectedId(restored._id)
      await refresh()
    },
    [refresh, restoreTrashedNote, selectedId],
  )

  const handleTogglePin = useCallback(
    (id: string) => {
      updatePinnedNoteIds(prev => (prev.includes(id) ? prev.filter(noteId => noteId !== id) : [id, ...prev]))
    },
    [updatePinnedNoteIds],
  )

  const handleOpenWorkspaceTools = useCallback(() => {
    setCommandOpen(false)
    setTopBarMenu('workspace')
  }, [])

  const handleCycleWorkspaceTab = useCallback((direction: 'next' | 'previous') => {
    if (workspaceTabNotes.length === 0) return
    const currentIndex = selectedId ? workspaceTabNotes.findIndex(note => note._id === selectedId) : -1
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % workspaceTabNotes.length
      : (currentIndex - 1 + workspaceTabNotes.length) % workspaceTabNotes.length
    const next = workspaceTabNotes[nextIndex]
    if (!next) return
    if (selectedId && selectedId !== next._id) void flushPendingSave(selectedId)
    setSelectedId(next._id)
    setViewMode('editor')
    setCommandOpen(false)
    setTopBarMenu(null)
  }, [flushPendingSave, selectedId, workspaceTabNotes])

  const handleReorderWorkspaceTab = useCallback((sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return
    setWorkspaceTabIds(prev => {
      const fromIndex = prev.indexOf(sourceId)
      const toIndex = prev.indexOf(targetId)
      if (fromIndex === -1 || toIndex === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      const targetIndex = next.indexOf(targetId)
      if (!moved || targetIndex === -1) return prev
      next.splice(targetIndex, 0, moved)
      return next.slice(0, 8)
    })
  }, [setWorkspaceTabIds])

  const handleMoveWorkspaceTab = useCallback((id: string, direction: 'earlier' | 'later') => {
    setWorkspaceTabIds(prev => {
      const fromIndex = prev.indexOf(id)
      if (fromIndex === -1) return prev
      const toIndex = direction === 'earlier' ? fromIndex - 1 : fromIndex + 1
      if (toIndex < 0 || toIndex >= prev.length) return prev
      const next = [...prev]
      ;[next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]]
      return next.slice(0, 8)
    })
  }, [setWorkspaceTabIds])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      const key = event.key.toLowerCase()

      if (key === '/') {
        event.preventDefault()
        setShortcutsOpen(open => !open)
        return
      }

      if ((key === 'p' && !event.altKey) || key === 'o') {
        event.preventDefault()
        setCommandOpen(true)
        setCommandQuery('')
        return
      }

      if (key === 's') {
        event.preventDefault()
        void handleManualSaveCheckpoint()
        return
      }

      if (key === 'n' && event.shiftKey) {
        event.preventDefault()
        void handleCreateFolder(selected?.folder)
        return
      }

      if (key === 'n') {
        event.preventDefault()
        void handleCreate(selected?.folder)
        return
      }

      if (key === 'd' && event.altKey) {
        event.preventDefault()
        void handleCreateDailyNote(selected?.folder)
        return
      }

      if (key === 'p' && event.altKey && selectedId) {
        event.preventDefault()
        handleTogglePin(selectedId)
        return
      }

      if (key === 'w' && event.altKey) {
        event.preventDefault()
        handleOpenWorkspaceTools()
        return
      }

      if (event.altKey && key === 'arrowright') {
        event.preventDefault()
        handleCycleWorkspaceTab('next')
        return
      }

      if (event.altKey && key === 'arrowleft') {
        event.preventDefault()
        handleCycleWorkspaceTab('previous')
        return
      }

      if (key === 'f' && event.shiftKey) {
        event.preventDefault()
        setFocusMode(prev => !prev)
        return
      }

      if (key === 'c' && event.shiftKey && selected?.type === 'note') {
        event.preventDefault()
        setWordCountOpen(open => !open)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    handleCreate,
    handleCreateDailyNote,
    handleCreateFolder,
    handleCycleWorkspaceTab,
    handleManualSaveCheckpoint,
    handleOpenWorkspaceTools,
    handleTogglePin,
    selected?.folder,
    selectedId,
    setFocusMode,
  ])

  const handleCopyMarkdown = useCallback(
    (id: string) => {
      const note = notes.find(n => n._id === id)
      if (!note || note.type === 'attachment') return
      void navigator.clipboard?.writeText(note.content)
    },
    [notes],
  )

  const handleExportMarkdown = useCallback(
    (id: string) => {
      const note = notes.find(n => n._id === id)
      if (!note || note.type === 'attachment') return
      downloadMarkdown(note)
    },
    [notes],
  )

  const handleExportDocx = useCallback(
    (id: string) => {
      const note = notes.find(n => n._id === id)
      if (!note || note.type === 'attachment') return
      void downloadDocx(note, { notes })
    },
    [notes],
  )

  const handleExportPdf = useCallback(
    (id: string) => {
      const note = notes.find(n => n._id === id)
      if (!note || note.type === 'attachment') return
      printNotePdf(note, { notes })
    },
    [notes],
  )

  const handleExportHtml = useCallback(
    (id: string) => {
      const note = notes.find(n => n._id === id)
      if (!note || note.type === 'attachment') return
      downloadHtml(note, { notes })
    },
    [notes],
  )

  const handlePublishStaticSite = useCallback(
    (id: string) => {
      const note = notes.find(n => n._id === id)
      if (!note || note.type === 'attachment') return
      void downloadPublishedNotesSite(
        notes.filter(item => item.type === 'note' && !isNoteInTrash(item)),
        { entryId: note._id, title: `${note.title || 'Untitled'} Site` },
      )
    },
    [notes],
  )

  const handleExportReviewPackage = useCallback(
    (id: string) => {
      const note = notes.find(n => n._id === id)
      if (!note || note.type === 'attachment') return
      setReviewPackageRequest({ noteId: note._id, title: note.title || 'Untitled' })
    },
    [notes],
  )

  const handleSubmitReviewPackage = useCallback(
    async (permission: ReviewPackagePermission, recipient: string) => {
      const request = reviewPackageRequest
      if (!request) return
      const note = notes.find(n => n._id === request.noteId)
      if (!note || note.type === 'attachment') {
        setReviewPackageRequest(null)
        return
      }
      try {
        const [comments, suggestions] = await Promise.all([getNoteComments(note._id), getNoteSuggestions(note._id)])
        downloadReviewPackage(
          note,
          comments,
          suggestions,
          { notes },
          {
            permission,
            recipient: recipient.trim() || undefined,
          },
        )
        setReviewPackageRequest(null)
      } catch (err) {
        showNotice({
          title: 'Private share export failed',
          detail: err instanceof Error ? err.message : 'Could not export private share package',
          tone: 'danger',
        })
      }
    },
    [notes, reviewPackageRequest, showNotice],
  )

  const handleExportVault = useCallback(async () => {
    const archivePath = '/api/vault/local/export/markdown'
    try {
      const headers: Record<string, string> = {}
      const apiKey = getRequestApiKeyForPath(archivePath)
      if (apiKey) headers['X-API-Key'] = apiKey
      const res = await fetch(`${getRequestBaseForPath(archivePath)}${archivePath}`, { headers })
      if (!res.ok) throw new Error(`Archive export failed (${res.status})`)
      const archiveBuffer = await res.arrayBuffer()
      const verification = verifyMarkdownVaultArchive(archiveBuffer)
      if (!verification.ok) throw new Error(`Archive verification failed: ${verification.errors.join('; ')}`)
      const archiveBlob = new Blob([archiveBuffer], { type: 'application/x-tar' })
      const url = URL.createObjectURL(archiveBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `clawctrl-vault-markdown-${new Date().toISOString().slice(0, 10)}.tar`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      return
    } catch (err) {
      console.warn('[notes] local Markdown archive export failed:', err)
      showNotice({
        title: 'Markdown archive export failed',
        detail: err instanceof Error ? err.message : 'Could not export Markdown vault archive',
        tone: 'danger',
      })
      return
    }
  }, [showNotice])

  const handleExportEncryptedVault = useCallback(() => {
    setEncryptedBackupRequest({ mode: 'export' })
  }, [])

  const handleSubmitEncryptedBackup = useCallback(async (password: string) => {
    const request = encryptedBackupRequest
    if (!request) return
    const backup = await exportEncryptedVault(password)
    const exportBlob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(exportBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `clawctrl-encrypted-vault-${new Date().toISOString().slice(0, 10)}.ccvault.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setEncryptedBackupRequest(null)
  }, [encryptedBackupRequest])

  const handleImportEncryptedVault = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      setEncryptedBackupRequest({ mode: 'import', file, fileName: file.name })
    },
    [],
  )

  const handleSubmitEncryptedVaultImport = useCallback(
    async (password: string) => {
      const request = encryptedBackupRequest
      const file = request?.mode === 'import' ? request.file : undefined
      if (!file) return
      try {
        const backup = JSON.parse(await file.text())
        const verification = verifyEncryptedVaultBackup(backup)
        if (!verification.ok) {
          showNotice({
            title: 'Encrypted backup is invalid',
            detail: verification.errors.join('\n'),
            tone: 'danger',
          })
          return
        }
        await importEncryptedVault(password, backup)
        setEncryptedBackupRequest(null)
        await refresh()
      } catch (err) {
        showNotice({
          title: 'Encrypted vault import failed',
          detail: err instanceof Error ? err.message : 'Encrypted vault import failed',
          tone: 'danger',
        })
      }
    },
    [encryptedBackupRequest, refresh, showNotice],
  )

  const handleImportMarkdownFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return
      const plan = planMarkdownVaultImport(Array.from(files))
      const foldersToCreate = new Set<string>()
      for (const note of plan.notes) {
        for (const folder of folderAncestors(note.folder)) foldersToCreate.add(folder)
      }
      for (const attachment of plan.attachments) {
        for (const folder of folderAncestors(attachment.folder)) foldersToCreate.add(folder)
      }
      for (const folder of foldersToCreate) {
        await createFolder(folder)
      }
      for (const note of plan.notes) {
        await createNote(
          note.title,
          note.folder,
          await readImportedNoteMarkdown(note, plan.attachments),
        )
      }
      for (const attachment of plan.attachments) {
        await uploadAttachment(attachment.file, attachment.folder, attachment.id)
      }
      await refresh()
      if (plan.skipped > 0) {
        showNotice({
          title: 'Import completed with skipped files',
          detail: `Imported ${plan.notes.length} notes and ${plan.attachments.length} attachments. Skipped ${plan.skipped} system or unsupported files.`,
          tone: 'warning',
        })
      }
    },
    [createFolder, createNote, refresh, showNotice],
  )

  const handleCreateClipboardClip = useCallback(async () => {
    try {
      const input = await readClipboardClipInput()
      if (!input.html?.trim() && !input.text?.trim()) {
        showNotice({
          title: 'Clipboard is empty',
          detail: 'Clipboard HTML and text are empty or unavailable.',
          tone: 'warning',
        })
        return
      }
      const clip = buildClipNote(input)
      await createFolder('Clips')
      const note = await createNote(clip.title, 'Clips', clip.content)
      await refresh()
      if (selectedId && selectedId !== note._id) void flushPendingSave(selectedId)
      setSelectedId(note._id)
      setViewMode('editor')
    } catch (err) {
      showNotice({
        title: 'Clipboard import failed',
        detail: err instanceof Error ? err.message : 'Could not import clipboard clip.',
        tone: 'danger',
      })
    }
  }, [createFolder, createNote, flushPendingSave, refresh, selectedId, showNotice])

  const handleOpenWorkspaceNote = useCallback((id: string) => {
    if (selectedId && selectedId !== id) void flushPendingSave(selectedId)
    setSelectedId(id)
    setViewMode('editor')
    setTopBarMenu(null)
  }, [flushPendingSave, selectedId])

  const handleOpenWorkspaceSidePane = useCallback((id: string) => {
    const note = noteById.get(id)
    if (!note || note.type !== 'note' || isNoteInTrash(note)) return
    setWorkspaceSidePaneId(id)
    setWorkspaceTabIds(prev => [id, ...prev.filter(tabId => tabId !== id)].slice(0, 8))
    setViewMode('editor')
    setTopBarMenu(null)
  }, [noteById, setWorkspaceSidePaneId, setWorkspaceTabIds])

  const handlePromoteWorkspaceSidePane = useCallback(() => {
    if (!workspaceSidePaneNote) return
    if (selectedId && selectedId !== workspaceSidePaneNote._id) void flushPendingSave(selectedId)
    if (workspaceSidePaneId) void flushPendingSave(workspaceSidePaneId)
    const previousPrimaryId = selected?.type === 'note' && !isNoteInTrash(selected) ? selected._id : null
    const nextPrimaryId = workspaceSidePaneNote._id
    setSelectedId(nextPrimaryId)
    setWorkspaceSidePaneId(previousPrimaryId)
    setWorkspaceTabIds(prev => [
      nextPrimaryId,
      ...(previousPrimaryId ? [previousPrimaryId] : []),
      ...prev.filter(tabId => tabId !== nextPrimaryId && tabId !== previousPrimaryId),
    ].slice(0, 8))
    setViewMode('editor')
    setTopBarMenu(null)
  }, [flushPendingSave, selected, selectedId, setWorkspaceSidePaneId, setWorkspaceTabIds, workspaceSidePaneId, workspaceSidePaneNote])

  const handleCloseWorkspaceSidePane = useCallback(() => {
    if (workspaceSidePaneId) void flushPendingSave(workspaceSidePaneId)
    setWorkspaceSidePaneId(null)
    setTopBarMenu(null)
  }, [flushPendingSave, setWorkspaceSidePaneId, workspaceSidePaneId])

  const handleAdjustWorkspaceSidePaneWidth = useCallback((action: 'narrow' | 'widen' | 'reset') => {
    const currentWidth = clampWorkspaceSidePaneWidth(Number(workspaceSidePaneWidth) || DEFAULT_WORKSPACE_SIDE_PANE_WIDTH)
    if (action === 'reset') {
      setWorkspaceSidePaneWidth(DEFAULT_WORKSPACE_SIDE_PANE_WIDTH)
      return
    }
    const delta = action === 'widen' ? WORKSPACE_SIDE_PANE_WIDTH_STEP : -WORKSPACE_SIDE_PANE_WIDTH_STEP
    setWorkspaceSidePaneWidth(clampWorkspaceSidePaneWidth(currentWidth + delta))
  }, [setWorkspaceSidePaneWidth, workspaceSidePaneWidth])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod || !event.altKey || event.key !== '\\') return

      if (event.shiftKey) {
        if (!workspaceSidePaneNote) return
        event.preventDefault()
        handlePromoteWorkspaceSidePane()
        return
      }

      if (selected?.type !== 'note') return
      event.preventDefault()
      handleOpenWorkspaceSidePane(selected._id)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleOpenWorkspaceSidePane, handlePromoteWorkspaceSidePane, selected, workspaceSidePaneNote])

  const handleCloseWorkspaceTab = useCallback((id: string) => {
    if (selectedId === id) {
      void flushPendingSave(id)
      const nextId = workspaceTabIds.filter(tabId => tabId !== id).find(tabId => noteById.has(tabId)) ?? null
      setSelectedId(nextId)
      if (nextId) setViewMode('editor')
    }
    if (workspaceSidePaneId === id) setWorkspaceSidePaneId(null)
    setWorkspaceTabIds(prev => prev.filter(tabId => tabId !== id))
    setTopBarMenu(null)
  }, [flushPendingSave, noteById, selectedId, setWorkspaceSidePaneId, setWorkspaceTabIds, workspaceSidePaneId, workspaceTabIds])

  const handleCloseOtherWorkspaceTabs = useCallback(() => {
    if (!selectedId || !noteById.has(selectedId)) return
    setWorkspaceTabIds([selectedId])
    if (workspaceSidePaneId && workspaceSidePaneId !== selectedId) setWorkspaceSidePaneId(null)
    setTopBarMenu(null)
  }, [noteById, selectedId, setWorkspaceSidePaneId, setWorkspaceTabIds, workspaceSidePaneId])

  const handleCloseAllWorkspaceTabs = useCallback(() => {
    if (selectedId) void flushPendingSave(selectedId)
    if (workspaceSidePaneId) void flushPendingSave(workspaceSidePaneId)
    setWorkspaceTabIds([])
    setWorkspaceSidePaneId(null)
    setSelectedId(null)
    setTopBarMenu(null)
  }, [flushPendingSave, selectedId, setWorkspaceSidePaneId, setWorkspaceTabIds, workspaceSidePaneId])

  const handleAdjustFileTreeWidth = useCallback((action: 'narrow' | 'widen' | 'reset') => {
    if (action === 'reset') {
      setTreeWidth(DEFAULT_FILE_TREE_WIDTH)
      return
    }
    const delta = action === 'widen' ? FILE_TREE_WIDTH_STEP : -FILE_TREE_WIDTH_STEP
    setTreeWidth(current => clampFileTreeWidth(current + delta))
  }, [])

  const currentWorkspaceSnapshot = useCallback((): NotesWorkspaceSnapshot => ({
    id: currentWorkspaceSnapshotId,
    name: currentWorkspaceSnapshotName,
    viewMode,
    focusMode,
    infoPanelOpen,
    treeWidth,
    sidePaneWidth: workspaceSidePanePixelWidth,
    ...(searchQuery.trim() ? { searchQuery: searchQuery.trim() } : {}),
    ...(workspaceExpandedFolders.length ? { expandedFolders: workspaceExpandedFolders } : {}),
    referencesOpen: !referencesPanelCollapsed,
    graphContext: readGraphWorkspaceContext(),
    ...(viewMode === 'data' ? { dataContext: normalizeVaultDataWorkspaceContext(dataWorkspaceContext) } : {}),
    selectedId,
    sidePaneId: workspaceSidePaneNote?._id ?? null,
    tabIds: workspaceTabIds.filter(id => noteById.has(id)).slice(0, 8),
    savedAt: Date.now(),
  }), [currentWorkspaceSnapshotId, currentWorkspaceSnapshotName, dataWorkspaceContext, focusMode, infoPanelOpen, noteById, referencesPanelCollapsed, searchQuery, selectedId, treeWidth, viewMode, workspaceExpandedFolders, workspaceSidePaneNote, workspaceSidePanePixelWidth, workspaceTabIds])

  const restoreWorkspaceSnapshot = useCallback((snapshot: NotesWorkspaceSnapshot | null) => {
    if (!snapshot) return
    if (selectedId && selectedId !== snapshot.selectedId) void flushPendingSave(selectedId)
    const nextTabIds = (snapshot.tabIds ?? [])
      .filter((id, index, ids) => ids.indexOf(id) === index && noteById.has(id))
      .slice(0, 8)
    if (nextTabIds.length > 0) setWorkspaceTabIds(nextTabIds)
    const sidePaneId = snapshot.sidePaneId && noteById.has(snapshot.sidePaneId) ? snapshot.sidePaneId : null
    const fallbackNoteId = nextTabIds[0] ?? notes.find(note => note.type === 'note' && !isNoteInTrash(note))?._id ?? null
    const selectedNoteId = snapshot.selectedId && noteById.has(snapshot.selectedId) ? snapshot.selectedId : fallbackNoteId
    setWorkspaceSidePaneId(sidePaneId)
    setViewMode(snapshot.viewMode)
    setFocusMode(snapshot.focusMode)
    setInfoPanelOpen(snapshot.infoPanelOpen)
    setSearchQuery(snapshot.searchQuery ?? '')
    setReferencesPanelCollapsed(snapshot.referencesOpen !== true)
    restoreGraphWorkspaceContext(snapshot.graphContext)
    if (snapshot.dataContext) setDataWorkspaceContext(normalizeVaultDataWorkspaceContext(snapshot.dataContext))
    setFileTreeExpandedFolders(new Set([
      '',
      ...(snapshot.expandedFolders ?? [])
        .map(path => typeof path === 'string' ? path.trim() : '')
        .filter(Boolean)
        .slice(0, 32),
    ]))
    setTreeWidth(clampFileTreeWidth(snapshot.treeWidth))
    if (snapshot.sidePaneWidth) setWorkspaceSidePaneWidth(clampWorkspaceSidePaneWidth(snapshot.sidePaneWidth))
    setSelectedId(selectedNoteId)
    setTopBarMenu(null)
  }, [flushPendingSave, noteById, notes, selectedId, setFocusMode, setInfoPanelOpen, setWorkspaceSidePaneId, setWorkspaceSidePaneWidth, setWorkspaceTabIds])

  const handleSaveWorkspaceSnapshot = useCallback(() => {
    const snapshot = currentWorkspaceSnapshot()
    setWorkspaceSnapshot(snapshot)
    setWorkspaceSnapshots(prev => {
      const next = normalizeNotesWorkspaceSnapshots([snapshot, ...prev.filter(item => item.id !== snapshot.id)])
      void syncWorkspaceSnapshots(next)
      return next
    })
    setTopBarMenu(null)
  }, [currentWorkspaceSnapshot, setWorkspaceSnapshot, setWorkspaceSnapshots, syncWorkspaceSnapshots])

  const handleRestoreWorkspaceSnapshot = useCallback(() => {
    restoreWorkspaceSnapshot(workspaceSnapshot)
  }, [restoreWorkspaceSnapshot, workspaceSnapshot])

  const handleRestoreNamedWorkspaceSnapshot = useCallback((snapshot: NotesWorkspaceSnapshot) => {
    restoreWorkspaceSnapshot(snapshot)
  }, [restoreWorkspaceSnapshot])

  const handleRenameWorkspaceSnapshot = useCallback((snapshot: NotesWorkspaceSnapshot) => {
    setWorkspaceRenameRequest({
      snapshotKey: workspaceSnapshotKey(snapshot),
      currentName: snapshot.name || `${viewModeLabel(snapshot.viewMode)} workspace`,
      viewMode: snapshot.viewMode,
    })
    setTopBarMenu(null)
  }, [])

  const handleConfirmRenameWorkspaceSnapshot = useCallback((key: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return
    const savedAt = Date.now()
    setWorkspaceSnapshots(prev => {
      const next = normalizeNotesWorkspaceSnapshots(
        prev.map(item => (workspaceSnapshotKey(item) === key ? { ...item, name: nextName, savedAt } : item)),
      )
      void syncWorkspaceSnapshots(next)
      return next
    })
    setWorkspaceSnapshot(prev => (prev && workspaceSnapshotKey(prev) === key ? { ...prev, name: nextName, savedAt } : prev))
    setWorkspaceRenameRequest(null)
  }, [setWorkspaceSnapshot, setWorkspaceSnapshots, syncWorkspaceSnapshots])

  const handleDeleteWorkspaceSnapshot = useCallback((snapshot: NotesWorkspaceSnapshot) => {
    const key = workspaceSnapshotKey(snapshot)
    setWorkspaceSnapshots(prev => {
      const next = normalizeNotesWorkspaceSnapshots(prev.filter(item => workspaceSnapshotKey(item) !== key))
      void syncWorkspaceSnapshots(next)
      return next
    })
    setWorkspaceSnapshot(prev => (prev && workspaceSnapshotKey(prev) === key ? null : prev))
    setTopBarMenu(null)
  }, [setWorkspaceSnapshot, setWorkspaceSnapshots, syncWorkspaceSnapshots])

  const handleCopyCurrentWikilink = useCallback(() => {
    if (!selected || selected.type === 'attachment') return
    void navigator.clipboard?.writeText(`[[${selected.title || selected._id.replace(/\.md$/, '')}]]`)
  }, [selected])

  const handleCopyCurrentEmbed = useCallback(() => {
    if (!selected || selected.type === 'attachment') return
    void navigator.clipboard?.writeText(noteEmbedMarkdown(selected))
  }, [selected])

  const handleCopyCurrentPath = useCallback(() => {
    if (!selected || selected.type === 'attachment') return
    void navigator.clipboard?.writeText(selected._id)
  }, [selected])

  const handleRevealCurrentInFileTree = useCallback(() => {
    if (!selected) return
    setSearchQuery('')
    setFocusMode(false)
  }, [selected, setFocusMode, setSearchQuery])

  const handleOpenReferences = useCallback(() => {
    if (!selected || selected.type !== 'note') return
    setViewMode('editor')
    setReferencesPanelCollapsed(false)
    setBacklinksOpenRequest(request => request + 1)
  }, [selected, setReferencesPanelCollapsed])

  const handleOpenLocalGraph = useCallback(() => {
    if (!selected || selected.type !== 'note') return
    try {
      localStorage.setItem('mc-notes-graph-local', JSON.stringify(true))
      localStorage.setItem('mc-notes-graph-settings-updated-at', JSON.stringify(Date.now()))
      window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_STATE_EVENT, {
        detail: { key: 'mc-notes-graph-local' },
      }))
      window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_STATE_EVENT, {
        detail: { key: 'mc-notes-graph-settings-updated-at' },
      }))
    } catch {
      // The graph still opens if storage is unavailable; the in-view Local toggle remains usable.
    }
    setViewMode('graph')
  }, [selected])

  const handleOpenVersionHistory = useCallback(async () => {
    if (!selected || selected.type === 'attachment') return
    await flushPendingSave(selected._id)
    setHistoryOpen(true)
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const revisions = await getNoteRevisions(selected._id)
      setHistoryRevisions(revisions)
      setHistoryPreview(null)
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Could not load version history')
      setHistoryRevisions([])
    } finally {
      setHistoryLoading(false)
    }
  }, [flushPendingSave, selected])

  const loadComments = useCallback(async (id: string) => {
    setCommentsLoading(true)
    setCommentsError(null)
    try {
      setNoteComments(await getNoteComments(id))
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : 'Could not load comments')
      setNoteComments([])
    } finally {
      setCommentsLoading(false)
    }
  }, [])

  const handleOpenComments = useCallback(async () => {
    if (!selected || selected.type === 'attachment') return
    setCommentsOpen(true)
    await loadComments(selected._id)
  }, [loadComments, selected])

  const handleAddComment = useCallback(async () => {
    if (!selected || selected.type === 'attachment') return
    const anchor = usableSelectionAnchor(selectionAnchor)
    setCommentComposeRequest({
      mode: 'comment',
      noteId: selected._id,
      noteTitle: selected.title || 'Untitled',
      anchor,
      quote: anchor.quote,
    })
  }, [selected, selectionAnchor])

  const handleSubmitCommentCompose = useCallback(async (body: string) => {
    const request = commentComposeRequest
    if (!request) return
    const trimmed = body.trim()
    if (!trimmed) return
    setCommentsLoading(true)
    setCommentsError(null)
    try {
      if (request.mode === 'reply') {
        if (!request.commentId) return
        await createNoteCommentReply(request.commentId, trimmed)
      } else {
        await createNoteComment(request.noteId, trimmed, request.anchor as unknown as Record<string, unknown>)
      }
      await loadComments(request.noteId)
      setCommentComposeRequest(null)
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : request.mode === 'reply' ? 'Could not add reply' : 'Could not add comment')
    } finally {
      setCommentsLoading(false)
    }
  }, [commentComposeRequest, loadComments])

  const handleResolveComment = useCallback(
    async (id: string) => {
      if (!selected || selected.type === 'attachment') return
      setCommentsLoading(true)
      setCommentsError(null)
      try {
        await resolveNoteComment(id)
        await loadComments(selected._id)
        setActiveReviewId(current => (current === id ? null : current))
      } catch (err) {
        setCommentsError(err instanceof Error ? err.message : 'Could not resolve comment')
      } finally {
        setCommentsLoading(false)
      }
    },
    [loadComments, selected],
  )

  const handleReplyToComment = useCallback(
    (id: string, defaultBody = '') => {
      if (!selected || selected.type === 'attachment') return
      const comment = noteComments.find(item => item.id === id)
      const quote = typeof comment?.anchor?.quote === 'string' ? comment.anchor.quote : undefined
      setCommentComposeRequest({
        mode: 'reply',
        noteId: selected._id,
        noteTitle: selected.title || 'Untitled',
        commentId: id,
        quote,
        defaultBody,
      })
    },
    [noteComments, selected],
  )

  const handleDraftReplyToComment = useCallback(
    (id: string) => {
      if (!selected || selected.type === 'attachment') return
      const comment = noteComments.find(item => item.id === id)
      if (!comment) return
      handleReplyToComment(id, buildCommentReplyDraft(comment, selected.title || selected._id))
    },
    [handleReplyToComment, noteComments, selected],
  )

  const handleJumpToReviewAnchor = useCallback(
    (id: string) => {
      setActiveReviewId(id)
      setViewMode('editor')
    },
    [setViewMode],
  )

  const loadSuggestions = useCallback(async (id: string) => {
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    try {
      setNoteSuggestions(await getNoteSuggestions(id))
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : 'Could not load suggestions')
      setNoteSuggestions([])
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])

  const handleOpenSuggestions = useCallback(async () => {
    if (!selected || selected.type === 'attachment') return
    setSuggestionsOpen(true)
    await Promise.all([loadSuggestions(selected._id), loadComments(selected._id)])
  }, [loadComments, loadSuggestions, selected])

  const handleAddSuggestion = useCallback(async () => {
    if (!selected || selected.type === 'attachment') return
    const anchor = usableSuggestionAnchor(selectionAnchor)
    const selectedText = anchor.scope === 'selection' ? (anchor.quote ?? '') : ''
    const cursorInsert = anchor.scope === 'cursor'
    setSuggestionComposeRequest({
      noteId: selected._id,
      noteTitle: selected.title || 'Untitled',
      anchor,
      selectedText,
      cursorInsert,
      defaultContent: cursorInsert ? '' : selectedText || selected.content,
    })
  }, [selected, selectionAnchor])

  const handleCommentOnSuggestion = useCallback((id: string) => {
    if (!selected || selected.type === 'attachment') return
    const suggestion = noteSuggestions.find(item => item.id === id)
    if (!suggestion) return
    const anchor = normalizeSelectionAnchor(suggestion.anchor)
    const patchType = typeof suggestion.patch.type === 'string' ? suggestion.patch.type : 'suggestion'
    const content = typeof suggestion.patch.content === 'string' ? suggestion.patch.content : ''
    const quote =
      anchor?.quote
        ? `Suggestion on: ${anchor.quote}`
        : patchType === 'replace_document'
          ? 'Suggestion replaces this document'
          : patchType === 'insert_at_cursor'
            ? 'Suggestion inserts at cursor'
            : 'Suggestion'
    setCommentComposeRequest({
      mode: 'comment',
      noteId: selected._id,
      noteTitle: selected.title || 'Untitled',
      suggestionId: suggestion.id,
      anchor: {
        ...(anchor ?? { scope: 'document' as const }),
        quote,
        suggestion_id: suggestion.id,
        suggestion_patch_type: patchType,
        suggestion_preview: content.slice(0, 500),
      },
      quote,
      defaultBody: '',
    })
  }, [noteSuggestions, selected])

  const handleSubmitSuggestionCompose = useCallback(async (content: string, body: string) => {
    const request = suggestionComposeRequest
    if (!request) return
    if (!request.cursorInsert && content === request.defaultContent) return
    const patch =
      request.anchor.scope === 'selection'
        ? { type: 'replace_selection', content }
        : request.cursorInsert
          ? { type: 'insert_at_cursor', content }
          : { type: 'replace_document', content }
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    try {
      await createNoteSuggestion(request.noteId, patch, body.trim(), request.anchor as unknown as Record<string, unknown>)
      await loadSuggestions(request.noteId)
      setSuggestionComposeRequest(null)
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : 'Could not add suggestion')
    } finally {
      setSuggestionsLoading(false)
    }
  }, [loadSuggestions, suggestionComposeRequest])

  const handleSuggestRemoteConflictVersion = useCallback(
    async (state: VaultSyncLedger['sync_states'][number]) => {
      const note = notesRef.current.find(item => item._id === state.local_id)
      if (!note || note.type !== 'note') return
      const remoteContent = remoteConflictContent(state.conflict)
      if (!remoteContent) return
      setSuggestionsLoading(true)
      setSuggestionsError(null)
      try {
        await createNoteSuggestion(
          note._id,
          { type: 'replace_document', content: remoteContent },
          `Remote sync conflict from ${state.provider}. Review before accepting.`,
          {
            scope: 'document',
            mode: 'markdown',
            conflict_state: state.conflict_state,
            provider: state.provider,
            remote_id: state.remote_id,
            remote_rev: state.remote_rev,
          },
        )
        await resolveVaultSyncConflict(state.provider, state.remote_id)
        await loadSuggestions(note._id)
        setVaultSyncLedger(current => current
          ? {
              ...current,
              sync_states: current.sync_states.map(item =>
                item.provider === state.provider && item.remote_id === state.remote_id
                  ? { ...item, conflict_state: 'clean', conflict: {} }
                  : item,
              ),
            }
          : current)
        setSelectedId(note._id)
        setViewMode('editor')
        setTitleDraft(note.title)
        setVaultStatusOpen(false)
        setSuggestionsOpen(true)
      } catch (err) {
        setVaultStatusError(err instanceof Error ? err.message : 'Could not create remote version suggestion')
      } finally {
        setSuggestionsLoading(false)
      }
    },
    [loadSuggestions],
  )

  const handleReviewSyncConflictMerge = useCallback((state: VaultSyncLedger['sync_states'][number]) => {
    const note = notesRef.current.find(item => item._id === state.local_id)
    if (!note || note.type !== 'note') return
    const remoteContent = remoteConflictContent(state.conflict)
    if (!remoteContent) return
    const baseContent = baseConflictContent(state.conflict)
    const autoMergedContent = mergedSyncConflictContent(state, note.content)
    setMergeConflictReviewRequest({
      state,
      noteId: note._id,
      noteTitle: note.title || note._id,
      localContent: note.content,
      remoteContent,
      baseContent,
      initialContent: autoMergedContent ?? conflictMarkedMergeContent(note.content, remoteContent, state.provider),
      autoMerged: !!autoMergedContent,
    })
  }, [])

  const handleSubmitSyncConflictMergeReview = useCallback(async (content: string) => {
    const request = mergeConflictReviewRequest
    if (!request) return
    const nextContent = content.trimEnd()
    if (!nextContent.trim()) {
      setVaultStatusError('Merge suggestion content cannot be empty')
      return
    }
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    setVaultStatusError(null)
    try {
      await createNoteSuggestion(
        request.noteId,
        { type: 'replace_document', content: nextContent },
        `Reviewed sync merge from ${request.state.provider}. Review before accepting.`,
        {
          scope: 'document',
          mode: 'markdown',
          conflict_state: request.state.conflict_state,
          merge_strategy: request.autoMerged ? 'reviewed_non_overlapping_lines' : 'reviewed_manual_merge',
          provider: request.state.provider,
          remote_id: request.state.remote_id,
          remote_rev: request.state.remote_rev,
        },
      )
      await resolveVaultSyncConflict(request.state.provider, request.state.remote_id)
      await loadSuggestions(request.noteId)
      setVaultSyncLedger(current => current
        ? {
            ...current,
            sync_states: current.sync_states.map(item =>
              item.provider === request.state.provider && item.remote_id === request.state.remote_id
                ? { ...item, conflict_state: 'clean', conflict: {} }
                : item,
            ),
          }
        : current)
      setSelectedId(request.noteId)
      setViewMode('editor')
      setTitleDraft(request.noteTitle)
      setMergeConflictReviewRequest(null)
      setVaultStatusOpen(false)
      setSuggestionsOpen(true)
    } catch (err) {
      setVaultStatusError(err instanceof Error ? err.message : 'Could not create reviewed merge suggestion')
    } finally {
      setSuggestionsLoading(false)
    }
  }, [loadSuggestions, mergeConflictReviewRequest])

  const handleKeepLocalSyncConflictVersion = useCallback(async (state: VaultSyncLedger['sync_states'][number]) => {
    setVaultStatusError(null)
    try {
      await resolveVaultSyncConflict(state.provider, state.remote_id)
      const note = notesRef.current.find(item => item._id === state.local_id)
      if (note && note.type === 'note') {
        setSelectedId(note._id)
        setViewMode('editor')
        setTitleDraft(note.title)
      }
      setVaultSyncLedger(current => current
        ? {
            ...current,
            sync_states: current.sync_states.map(item =>
              item.provider === state.provider && item.remote_id === state.remote_id
                ? { ...item, conflict_state: 'clean', conflict: {} }
                : item,
            ),
          }
        : current)
    } catch (err) {
      setVaultStatusError(err instanceof Error ? err.message : 'Could not keep local version')
    }
  }, [])

  const handleOpenWritingAssist = useCallback(() => {
    if (!selected || selected.type !== 'note') return
    const current = pendingContentRef.current.get(selected._id) ?? selected.content
    const draft = buildWritingAssistDraft(selected, selectionAnchor, current)
    setWritingAssistRequest({
      noteId: selected._id,
      noteTitle: selected.title || 'Untitled',
      draft,
    })
    setViewMode('editor')
  }, [selected, selectionAnchor])

  const handleCreateWritingAssistSuggestion = useCallback(async (option: WritingAssistOption) => {
    const request = writingAssistRequest
    if (!request) return
    const patch = writingAssistPatchForDraft(request.draft, option)
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    try {
      await createNoteSuggestion(
        request.noteId,
        patch,
        `Assistive writing: ${option.label}. ${option.note}`,
        request.draft.anchor as unknown as Record<string, unknown>,
      )
      await loadSuggestions(request.noteId)
      setWritingAssistRequest(null)
      setSuggestionsOpen(true)
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : 'Could not create writing suggestion')
    } finally {
      setSuggestionsLoading(false)
    }
  }, [loadSuggestions, writingAssistRequest])

  const handleApplySuggestion = useCallback(
    async (id: string) => {
      if (!selected || selected.type === 'attachment') return
      const suggestion = noteSuggestions.find(item => item.id === id)
      const result = applySuggestionPatch(
        selected.content,
        suggestion?.patch,
        suggestion?.anchor as NoteSelectionAnchor | undefined,
      )
      if (result.error === 'missing_content') {
        setSuggestionsError('Suggestion has no replacement content')
        return
      }
      if (result.error === 'unsupported') {
        setSuggestionsError('This suggestion type cannot be applied yet')
        return
      }
      if (result.error === 'anchor_mismatch' || result.content === null) {
        setSuggestionsError('Selected text or cursor position no longer matches this suggestion')
        return
      }
      setSuggestionsLoading(true)
      setSuggestionsError(null)
      try {
        await flushPendingSave(selected._id)
        await updateNote({ ...selected, content: result.content })
        await applyNoteSuggestion(id)
        await refresh()
        await loadSuggestions(selected._id)
        setActiveReviewId(current => (current === id ? null : current))
        setSaveState('saved')
        setLastSavedAt(Date.now())
      } catch (err) {
        setSuggestionsError(err instanceof Error ? err.message : 'Could not apply suggestion')
      } finally {
        setSuggestionsLoading(false)
      }
    },
    [flushPendingSave, loadSuggestions, noteSuggestions, refresh, selected, updateNote],
  )

  const handleRejectSuggestion = useCallback(
    async (id: string) => {
      if (!selected || selected.type === 'attachment') return
      setSuggestionsLoading(true)
      setSuggestionsError(null)
      try {
        await rejectNoteSuggestion(id)
        await loadSuggestions(selected._id)
        setActiveReviewId(current => (current === id ? null : current))
      } catch (err) {
        setSuggestionsError(err instanceof Error ? err.message : 'Could not reject suggestion')
      } finally {
        setSuggestionsLoading(false)
      }
    },
    [loadSuggestions, selected],
  )

  const handleApplyAllSuggestions = useCallback(async () => {
    if (!selected || selected.type === 'attachment') return
    const openSuggestions = noteSuggestions.filter(suggestion => suggestion.status === 'open')
    if (openSuggestions.length === 0) return

    let nextContent = pendingContentRef.current.get(selected._id) ?? selected.content
    for (const suggestion of openSuggestions) {
      const result = applySuggestionPatch(
        nextContent,
        suggestion.patch,
        suggestion.anchor as NoteSelectionAnchor | undefined,
      )
      if (result.error === 'missing_content') {
        setSuggestionsError(`Suggestion ${suggestion.id} has no replacement content`)
        return
      }
      if (result.error === 'unsupported') {
        setSuggestionsError(`Suggestion ${suggestion.id} cannot be applied yet`)
        return
      }
      if (result.error === 'anchor_mismatch' || result.content === null) {
        setSuggestionsError(`Suggestion ${suggestion.id} no longer matches this note`)
        return
      }
      nextContent = result.content
    }

    setSuggestionsLoading(true)
    setSuggestionsError(null)
    try {
      await flushPendingSave(selected._id)
      await updateNote({ ...selected, content: nextContent })
      for (const suggestion of openSuggestions) {
        await applyNoteSuggestion(suggestion.id)
      }
      await refresh()
      await loadSuggestions(selected._id)
      setActiveReviewId(current => (openSuggestions.some(suggestion => suggestion.id === current) ? null : current))
      setSaveState('saved')
      setLastSavedAt(Date.now())
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : 'Could not apply all suggestions')
    } finally {
      setSuggestionsLoading(false)
    }
  }, [flushPendingSave, loadSuggestions, noteSuggestions, refresh, selected, updateNote])

  const handleRejectAllSuggestions = useCallback(async () => {
    if (!selected || selected.type === 'attachment') return
    const openSuggestions = noteSuggestions.filter(suggestion => suggestion.status === 'open')
    if (openSuggestions.length === 0) return
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    try {
      for (const suggestion of openSuggestions) {
        await rejectNoteSuggestion(suggestion.id)
      }
      await loadSuggestions(selected._id)
      setActiveReviewId(current => (openSuggestions.some(suggestion => suggestion.id === current) ? null : current))
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : 'Could not reject all suggestions')
    } finally {
      setSuggestionsLoading(false)
    }
  }, [loadSuggestions, noteSuggestions, selected])

  const handleRestoreRevision = useCallback(
    (rev: string) => {
      if (!selected || selected.type === 'attachment') return
      const label = historyRevisions.find(revision => revision.rev === rev)?.label
      requestConfirmAction({
        title: 'Restore version',
        detail: restoreRevisionConfirmMessage(rev, label),
        confirmLabel: 'Restore version',
        tone: 'danger',
        onConfirm: async () => {
          setHistoryLoading(true)
          setHistoryError(null)
          try {
            const note = await restoreNoteRevision(selected._id, rev)
            setSelectedId(note._id)
            await refresh()
            const revisions = await getNoteRevisions(note._id)
            setHistoryRevisions(revisions)
            setHistoryPreview(null)
            setSaveState('saved')
            setLastSavedAt(Date.now())
          } catch (err) {
            setHistoryError(err instanceof Error ? err.message : 'Could not restore revision')
          } finally {
            setHistoryLoading(false)
          }
        },
      })
    },
    [getNoteRevisions, historyRevisions, refresh, requestConfirmAction, restoreNoteRevision, selected],
  )

  const handlePreviewRevision = useCallback(
    async (rev: string) => {
      if (!selected || selected.type === 'attachment') return
      setHistoryLoading(true)
      setHistoryError(null)
      try {
        setHistoryPreview(await getNoteRevision(selected._id, rev))
      } catch (err) {
        setHistoryError(err instanceof Error ? err.message : 'Could not preview revision')
      } finally {
        setHistoryLoading(false)
      }
    },
    [selected],
  )

  const handleCreateVersionCheckpoint = useCallback(async () => {
    if (!selected || selected.type === 'attachment') return
    setVersionNameRequest({ mode: 'create' })
  }, [selected])

  const handleRenameRevision = useCallback(
    (rev: string, currentLabel?: string | null) => {
      if (!selected || selected.type === 'attachment') return
      setVersionNameRequest({ mode: 'rename', rev, currentLabel })
    },
    [selected],
  )

  const handleSubmitVersionName = useCallback(async (label: string) => {
    const request = versionNameRequest
    if (!selected || selected.type === 'attachment' || !request) return
    const nextLabel = label.trim()
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      if (request.mode === 'create') {
        await flushPendingSave(selected._id)
        const rev = await createNoteVersionCheckpoint(selected._id, nextLabel)
        const revisions = await getNoteRevisions(selected._id)
        setHistoryRevisions(revisions)
        setHistoryPreview(await getNoteRevision(selected._id, rev))
      } else if (request.rev) {
        const rev = request.rev
        await labelNoteRevision(selected._id, rev, nextLabel)
        const revisions = await getNoteRevisions(selected._id)
        setHistoryRevisions(revisions)
        setHistoryPreview(prev => (prev?.rev === rev ? { ...prev, label: nextLabel || null } : prev))
      }
      setVersionNameRequest(null)
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : request.mode === 'create' ? 'Could not create version' : 'Could not rename version')
    } finally {
      setHistoryLoading(false)
    }
  }, [flushPendingSave, selected, versionNameRequest])

  const queueNoteContentChange = useCallback(
    (note: VaultNote, content: string, options: { broadcast?: boolean } = {}) => {
      if (note.type === 'attachment') return
      const noteId = note._id
      const baseContent = pendingContentRef.current.get(noteId) ?? note.content
      pendingContentRef.current.set(noteId, content)
      saveLocalDraft(noteId, content)
      if (options.broadcast !== false) broadcastLocalOperation(content, baseContent)
      setSaveState('unsaved')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (!networkOnline) {
        saveTimerRef.current = null
        return
      }
      saveTimerRef.current = setTimeout(async () => {
        await flushPendingSave(noteId)
      }, SAVE_DEBOUNCE_MS)
    },
    [broadcastLocalOperation, flushPendingSave, networkOnline],
  )

  const handleContentChange = useCallback(
    (content: string, options: { broadcast?: boolean } = {}) => {
      if (!selected || selected.type === 'attachment') return
      queueNoteContentChange(selected, content, options)
    },
    [queueNoteContentChange, selected],
  )

  const handleCopyRevisionToCurrent = useCallback(
    async (rev: string) => {
      if (!selected || selected.type === 'attachment') return
      setHistoryLoading(true)
      setHistoryError(null)
      try {
        const detail = historyPreview?.rev === rev
          ? historyPreview
          : await getNoteRevision(selected._id, rev)
        const label = historyRevisions.find(revision => revision.rev === rev)?.label || detail.label || rev
        await flushPendingSave(selected._id)
        await createNoteVersionCheckpoint(selected._id, `Before copying from ${label}`)
        const updated = await updateNote({ ...selected, content: detail.content })
        setSelectedId(updated._id)
        await refresh()
        setHistoryOpen(false)
        setHistoryPreview(null)
        setViewMode('editor')
        setSaveState('saved')
        setLastSavedAt(Date.now())
      } catch (err) {
        setHistoryError(err instanceof Error ? err.message : 'Could not copy version into current note')
      } finally {
        setHistoryLoading(false)
      }
    },
    [flushPendingSave, historyPreview, historyRevisions, refresh, selected, updateNote],
  )

  const handleSidePaneContentChange = useCallback(
    (content: string) => {
      if (!workspaceSidePaneNote) return
      queueNoteContentChange(workspaceSidePaneNote, content, { broadcast: false })
    },
    [queueNoteContentChange, workspaceSidePaneNote],
  )

  const handleInsertTemplateIntoCurrent = useCallback(
    async (templateId: string) => {
      if (!selected || selected.type === 'attachment') return
      const template = allTemplates.find(item => item.id === templateId)
      if (!template) return
      const promptValues = await collectTemplatePromptValues(template)
      if (!promptValues) return
      const current = pendingContentRef.current.get(selected._id) ?? selected.content
      const insertion = applyTemplate(template, {
        title: selected.title,
        folder: selected.folder,
        promptValues,
      })
      handleContentChange(appendTemplateToContent(current, insertion))
      setViewMode('editor')
    },
    [allTemplates, collectTemplatePromptValues, handleContentChange, selected],
  )

  const handleInsertNoteEmbedIntoCurrent = useCallback(
    (target: VaultNote) => {
      if (!selected || selected.type !== 'note' || target.type !== 'note') return
      const current = pendingContentRef.current.get(selected._id) ?? selected.content
      handleContentChange(insertMarkdownBlockAtAnchor(current, noteEmbedMarkdown(target), selectionAnchorRef.current))
      setViewMode('editor')
    },
    [handleContentChange, selected],
  )

  const handleInsertBlockIdIntoCurrent = useCallback(
    () => {
      if (!selected || selected.type !== 'note') return
      const current = pendingContentRef.current.get(selected._id) ?? selected.content
      const anchor = markdownAnchorOrHeadingFallback(current, selectionAnchorRef.current, selected)
      handleContentChange(insertBlockIdAtAnchor(current, createBlockId(selected), anchor))
      setViewMode('editor')
    },
    [handleContentChange, selected],
  )

  const handleCopyBlockReference = useCallback(
    () => {
      if (!selected || selected.type !== 'note') return
      const current = pendingContentRef.current.get(selected._id) ?? selected.content
      const anchor = markdownAnchorOrHeadingFallback(current, selectionAnchorRef.current, selected)
      const blockId = blockIdAtAnchorLine(current, anchor) ?? createBlockId(selected)
      const nextContent = insertBlockIdAtAnchor(current, blockId, anchor)
      if (nextContent !== current) handleContentChange(nextContent)
      void navigator.clipboard?.writeText(blockReferenceMarkdown(selected, blockId))
      setViewMode('editor')
    },
    [handleContentChange, selected],
  )

  const handleCopyHeadingReference = useCallback(
    () => {
      if (!selected || selected.type !== 'note') return
      const current = pendingContentRef.current.get(selected._id) ?? selected.content
      const heading = headingForReference(current, selectionAnchorRef.current, selected)
      if (!heading) {
        handleCopyCurrentWikilink()
        return
      }
      void navigator.clipboard?.writeText(headingReferenceMarkdown(selected, heading))
      setViewMode('editor')
    },
    [handleCopyCurrentWikilink, selected],
  )

  const handleOpenActiveOutline = useCallback(() => {
    if (!selected || selected.type !== 'note') return
    setActiveOutlineOpen(true)
    setViewMode('editor')
  }, [selected])

  const handleJumpToOutlineHeading = useCallback(
    (heading: MarkdownOutlineHeading) => {
      if (!selected || selected.type !== 'note') return
      setViewMode('editor')
      setActiveOutlineOpen(false)
      setEditorJumpRequest(previous => ({
        noteId: selected._id,
        lineNumber: heading.lineNumber,
        requestId: (previous?.requestId ?? 0) + 1,
      }))
    },
    [selected],
  )

  const handleSelectionAnchorChange = useCallback(
    (anchor: NoteSelectionAnchor) => {
      selectionAnchorRef.current = anchor
      setSelectionAnchor(anchor)
      if (typeof anchor.start === 'number') {
        broadcastLocalCursor(anchor.start, typeof anchor.end === 'number' ? anchor.end : anchor.start)
      }
    },
    [broadcastLocalCursor],
  )

  useEffect(() => {
    if (!selected || selected.type === 'attachment') return
    for (const draft of localCollabDrafts) {
      const localContent = pendingContentRef.current.get(selected._id) ?? selected.content
      const result = autoMergeLocalCollabOperation(localContent, selected.content, draft)
      if (!result) continue
      if (result.status === 'apply-remote' || result.status === 'merge-remote') {
        handleContentChange(result.content, { broadcast: false })
      }
      dismissLocalCollabDraft(draft.id)
    }
  }, [dismissLocalCollabDraft, handleContentChange, localCollabDrafts, selected])

  const handleApplyLocalCollabDraft = useCallback(
    (draft: LocalCollabDraft) => {
      if (!selected || selected.type === 'attachment') return
      const localContent = pendingContentRef.current.get(selected._id) ?? selected.content
      const result = mergeLocalCollabDraft(localContent, selected.content, draft)
      if (result.status === 'same' || result.status === 'keep-local') {
        dismissLocalCollabDraft(draft.id)
        return
      }
      handleContentChange(result.status === 'conflict' ? result.remoteContent : result.content)
      dismissLocalCollabDraft(draft.id)
      if (localCollabDrafts.length <= 1) setCollabReviewOpen(false)
    },
    [dismissLocalCollabDraft, handleContentChange, localCollabDrafts.length, selected],
  )

  const handleDismissLocalCollabDraft = useCallback(
    (draftId: string) => {
      dismissLocalCollabDraft(draftId)
      if (localCollabDrafts.length <= 1) setCollabReviewOpen(false)
    },
    [dismissLocalCollabDraft, localCollabDrafts.length],
  )

  const handleInsertVaultPluginBlock = useCallback(
    (plugin: string, title: string, options: Record<string, unknown> = {}) => {
      if (!selected || selected.type === 'attachment') return
      const current = pendingContentRef.current.get(selected._id) ?? selected.content
      const block = ['```claw-plugin', JSON.stringify({ ...options, plugin, title }, null, 2), '```'].join('\n')
      handleContentChange(`${current.trimEnd()}\n\n${block}\n`)
      setViewMode('editor')
    },
    [handleContentChange, selected],
  )

  const handleInsertVaultPluginManifest = useCallback(() => {
    if (!selected || selected.type === 'attachment') return
    const current = pendingContentRef.current.get(selected._id) ?? selected.content
    const manifest = {
      id: 'local.dashboard',
      label: 'Dashboard',
      description: 'Local template plugin stored in this vault.',
      enabled: true,
      version: '0.1.0',
      author: 'Local vault',
      apiVersion: 'notes-plugin-v1',
      minAppVersion: '0.1.0',
      license: 'private',
      keywords: ['dashboard', 'local-first'],
      permissions: ['read:vault-stats', 'read:recent-notes'],
      template: '### {{title}}\n\nNotes: {{noteCount}}\nTasks: {{taskDone}}/{{taskTotal}}\n\n{{recentList}}',
    }
    const block = ['```claw-plugin-manifest', JSON.stringify(manifest, null, 2), '```'].join('\n')
    handleContentChange(`${current.trimEnd()}\n\n${block}\n`)
    setViewMode('editor')
  }, [handleContentChange, selected])

  const handleInsertVaultPluginTrustedPublisher = useCallback(() => {
    if (!selected || selected.type === 'attachment') return
    const current = pendingContentRef.current.get(selected._id) ?? selected.content
    const trust = {
      signer: 'Publisher name',
      publicKey: {
        kty: 'EC',
        crv: 'P-256',
        x: 'base64url-x-coordinate',
        y: 'base64url-y-coordinate',
      },
      revoked: false,
      rotatedToKeyId: '',
      expiresAt: '',
    }
    const block = ['```claw-plugin-trust', JSON.stringify(trust, null, 2), '```'].join('\n')
    handleContentChange(`${current.trimEnd()}\n\n${block}\n`)
    setViewMode('editor')
  }, [handleContentChange, selected])

  const handleImportPluginMarketplaceFeed = useCallback(() => {
    setPluginMarketplaceFeedRequest({ defaultUrl: '' })
  }, [])

  const handleSubmitPluginMarketplaceFeed = useCallback(async (rawUrl: string) => {
    const url = rawUrl.trim()
    if (!url) return
    try {
      const packages = await fetchVaultPluginMarketplaceFeed(url, fetch, buildVaultPluginTrustedPublishers(notes))
      if (packages.length === 0) {
        showNotice({
          title: 'No plugin packages found',
          detail: 'No installable plugin packages were found in that marketplace feed.',
          tone: 'warning',
        })
        return
      }
      const host = new URL(url).hostname || 'remote'
      const title = `Plugin Marketplace ${host}`
      const content = [
        `# ${title}`,
        '',
        `Imported from ${url}`,
        '',
        vaultPluginMarketplacePackagesMarkdown(packages),
        '',
        '```claw-plugin',
        JSON.stringify({ plugin: 'vault.marketplace', title: 'Plugin marketplace', includeDisabled: true }, null, 2),
        '```',
      ].join('\n')
      if (!folders.some(folder => folder.path === 'Plugins')) {
        await createFolder('Plugins')
      }
      const note = await createNote(title, 'Plugins', content)
      setSelectedId(note._id)
      setViewMode('editor')
      setPluginMarketplaceFeedRequest(null)
    } catch (err) {
      showNotice({
        title: 'Plugin marketplace import failed',
        detail: err instanceof Error ? err.message : 'Could not import plugin marketplace feed',
        tone: 'danger',
      })
    }
  }, [createFolder, createNote, folders, notes, showNotice])

  const ensurePluginWriteFolder = useCallback(
    async (folder: string, folderSet: Set<string>) => {
      const normalized = normalizeFolderPath(folder)
      if (!normalized) return
      const parts = normalized.split('/').filter(Boolean)
      for (let i = 1; i <= parts.length; i += 1) {
        const path = parts.slice(0, i).join('/')
        if (folderSet.has(path)) continue
        await createFolder(path)
        folderSet.add(path)
      }
    },
    [createFolder],
  )

  const handleApplyVaultPluginWrites = useCallback(async () => {
    await flushPendingSave()
    const records = buildVaultPluginWriteRecords(notesRef.current)
    if (records.length === 0) {
      showNotice({
        title: 'No plugin writes',
        detail: 'There are no pending plugin write requests in this vault.',
      })
      return
    }

    const plan = planVaultPluginWriteApply(notesRef.current, records)
    if (plan.applied.length === 0) {
      showNotice({
        title: 'No plugin writes applied',
        detail: `No plugin writes can be applied. ${plan.skipped.length} request${plan.skipped.length === 1 ? '' : 's'} skipped because of conflicts or unsafe paths.`,
        tone: 'warning',
      })
      return
    }

    const skipped = plan.skipped.length
      ? ` ${plan.skipped.length} request${plan.skipped.length === 1 ? '' : 's'} will be skipped because of conflicts or unsafe paths.`
      : ''
    requestConfirmAction({
      title: 'Apply plugin writes',
      detail: `Apply ${plan.applied.length} plugin write request${plan.applied.length === 1 ? '' : 's'}. Safety checkpoints will be created for ${plan.checkpointNoteIds.length} existing note${plan.checkpointNoteIds.length === 1 ? '' : 's'}.${skipped}`,
      confirmLabel: 'Apply plugin writes',
      tone: 'danger',
      onConfirm: async () => {
        const sourceCleanupIds = [
          ...new Set(
            plan.applied
              .map(change => change.record.sourceNoteId)
              .filter((id): id is string => Boolean(id)),
          ),
        ]

        setSearchResultNotes(null)
        await createSafetyCheckpoints(
          [...plan.checkpointNoteIds, ...sourceCleanupIds],
          'Before applying plugin writes',
        )

        const folderSet = new Set(folders.map(folder => folder.path))
        const finalById = new Map(plan.notes.map(note => [note._id, note]))
        const changedFinalIds = new Set(plan.applied.map(change => change.nextNoteId))
        const renamePairs = plan.applied
          .filter(change => change.record.action === 'rename' && change.noteId !== change.nextNoteId)
          .map(change => [change.noteId, change.nextNoteId] as const)

        for (const id of changedFinalIds) {
          const finalNote = finalById.get(id)
          if (!finalNote || finalNote.type !== 'note') continue
          const shouldTrash = isNoteInTrash(finalNote)
          const liveFolder = normalizeFolderPath(
            shouldTrash
              ? finalNote.trash_origin_path || finalNote.folder.replace(/^Trash\/?/, '')
              : finalNote.folder,
          )
          await ensurePluginWriteFolder(liveFolder, folderSet)
          await updateNote({
            ...finalNote,
            folder: liveFolder,
            trashed_at: shouldTrash ? null : finalNote.trashed_at,
            trash_origin_path: shouldTrash ? null : finalNote.trash_origin_path,
          })
          if (shouldTrash) {
            await trashNote(id)
          }
        }

        for (const [fromId, toId] of renamePairs) {
          if (fromId !== toId) await deleteNote(fromId)
        }

        const changedFinalIdSet = new Set(changedFinalIds)
        const renamedFromIds = new Set(renamePairs.map(([fromId]) => fromId))
        const appliedChecksums = plan.applied.map(change => change.record.checksum)
        for (const sourceId of sourceCleanupIds) {
          if (changedFinalIdSet.has(sourceId) || renamedFromIds.has(sourceId)) continue
          const source = notesRef.current.find(note => note._id === sourceId)
          if (!source || source.type !== 'note' || isNoteInTrash(source)) continue
          const nextContent = removeAppliedVaultPluginWriteBlocks(source.content, appliedChecksums)
          if (nextContent !== source.content) {
            await updateNote({ ...source, content: nextContent })
          }
        }

        if (renamePairs.length > 0) {
          const renamed = new Map(renamePairs)
          updatePinnedNoteIds(prev => prev.map(id => renamed.get(id) ?? id))
          setRecentNoteIds(prev => prev.map(id => renamed.get(id) ?? id))
          if (selectedId && renamed.has(selectedId)) setSelectedId(renamed.get(selectedId) ?? selectedId)
        }

        await refresh()
        if (plan.skipped.length > 0) {
          showNotice({
            title: 'Plugin writes applied',
            detail: `Applied ${plan.applied.length} plugin writes. Skipped ${plan.skipped.length} conflicted request${plan.skipped.length === 1 ? '' : 's'}.`,
            tone: 'warning',
          })
        }
      },
    })
  }, [
    createSafetyCheckpoints,
    deleteNote,
    ensurePluginWriteFolder,
    flushPendingSave,
    folders,
    refresh,
    requestConfirmAction,
    selectedId,
    setRecentNoteIds,
    showNotice,
    updatePinnedNoteIds,
    trashNote,
    updateNote,
  ])

  const handleTitleCommit = useCallback(async () => {
    if (!selected || selected.type === 'attachment') {
      setEditingTitle(false)
      return
    }
    const nextTitle = titleDraft.trim() || 'Untitled'
    const previousTitle = selected.title
    setEditingTitle(false)
    if (nextTitle === previousTitle) return

    await createSafetyCheckpoints([selected._id], 'Before title rename')
    await updateNote({ ...selected, title: nextTitle })

    const changedNotes = notes.filter(note => {
      if (note.type !== 'note' || note._id === selected._id) return false
      return rewriteWikilinks(note.content, previousTitle, nextTitle) !== note.content
    })

    for (const note of changedNotes) {
      await updateNote({
        ...note,
        content: rewriteWikilinks(note.content, previousTitle, nextTitle),
      })
    }
  }, [createSafetyCheckpoints, notes, selected, titleDraft, updateNote])

  const handleLinkUnlinkedMention = useCallback(
    async (sourceNoteId: string, mentionText?: string) => {
      if (!selected) return
      const source = notes.find(note => note._id === sourceNoteId)
      if (!source || source.type !== 'note') return
      const linked = linkFirstPlainMention(source.content, mentionText || selected.title, selected.title)
      if (linked === source.content) return
      await updateNote({ ...source, content: linked })
    },
    [notes, selected, updateNote],
  )

  const handleLinkAllUnlinkedMentions = useCallback(
    async (references: BacklinkReference[]) => {
      if (!selected || selected.type !== 'note') return
      for (const reference of references) {
        const source = notes.find(note => note._id === reference.note._id)
        if (!source || source.type !== 'note') continue
        const linked = linkFirstPlainMention(source.content, reference.matchedText || selected.title, selected.title)
        if (linked === source.content) continue
        const updated = await updateNote({ ...source, content: linked })
        notesRef.current = notesRef.current.map(note => (note._id === updated._id ? updated : note))
      }
    },
    [notes, selected, updateNote],
  )

  const handleWikilinkClick = useCallback(
    async (link: string) => {
      if (selectedId) await flushPendingSave(selectedId)
      const targetId = noteIdFromTitle(link, notes)
      if (targetId) {
        setSelectedId(targetId)
        setViewMode('editor')
      } else {
        const note = await createNote(link)
        setSelectedId(note._id)
        setViewMode('editor')
      }
    },
    [notes, createNote, flushPendingSave, selectedId],
  )

  const handleGraphSelect = useCallback(
    (id: string) => {
      if (selectedId && selectedId !== id) void flushPendingSave(selectedId)
      setSelectedId(id)
      setViewMode('editor')
    },
    [flushPendingSave, selectedId],
  )

  const handleToggleTaskDone = useCallback(
    async (row: VaultTaskRow, done: boolean) => {
      const note = notesRef.current.find(item => item._id === row.noteId)
      if (!note || note.type !== 'note') return
      const nextContent = setTaskLineDone(note.content, row.line, done)
      if (nextContent === null) return
      try {
        await flushPendingSave(row.noteId)
        await createSafetyCheckpoints([row.noteId], 'Before task toggle')
        const updated = await updateNote({ ...note, content: nextContent, updated_at: Date.now() })
        notesRef.current = notesRef.current.map(item => (item._id === updated._id ? updated : item))
        setLastSavedAt(Date.now())
        setSaveState('saved')
        await refresh()
      } catch (err) {
        console.warn('[notes] task toggle failed:', err)
        setSaveState('error')
      }
    },
    [createSafetyCheckpoints, flushPendingSave, refresh, updateNote],
  )

  const handleUpsertTableOfContents = useCallback(async () => {
    if (!selected || selected.type === 'attachment') return
    const currentContent = pendingContentRef.current.get(selected._id) ?? selected.content
    const nextContent = upsertMarkdownTableOfContents(currentContent)
    if (nextContent === currentContent) return
    try {
      await createSafetyCheckpoints([selected._id], 'Before table of contents update')
      const source = notesRef.current.find(item => item._id === selected._id && item.type === 'note') ?? selected
      const updated = await updateNote({ ...source, content: nextContent, updated_at: Date.now() })
      notesRef.current = notesRef.current.map(item => (item._id === updated._id ? updated : item))
      pendingContentRef.current.delete(selected._id)
      discardLocalDraft(selected._id)
      setLastSavedAt(Date.now())
      setSaveState(pendingContentRef.current.size ? 'unsaved' : 'saved')
      await refresh()
    } catch (err) {
      console.warn('[notes] table of contents update failed:', err)
      setSaveState('error')
    }
  }, [createSafetyCheckpoints, refresh, selected, updateNote])

  const saveSelectedContentNow = useCallback(
    async (nextContent: string, checkpointLabel: string, failureLabel: string) => {
      if (!selected || selected.type === 'attachment') return
      try {
        await createSafetyCheckpoints([selected._id], checkpointLabel)
        const source = notesRef.current.find(item => item._id === selected._id && item.type === 'note') ?? selected
        const updated = await updateNote({ ...source, content: nextContent, updated_at: Date.now() })
        notesRef.current = notesRef.current.map(item => (item._id === updated._id ? updated : item))
        pendingContentRef.current.delete(selected._id)
        discardLocalDraft(selected._id)
        setLastSavedAt(Date.now())
        setSaveState(pendingContentRef.current.size ? 'unsaved' : 'saved')
        await refresh()
      } catch (err) {
        console.warn(`[notes] ${failureLabel} failed:`, err)
        setSaveState('error')
      }
    },
    [createSafetyCheckpoints, refresh, selected, updateNote],
  )

  const saveDocumentProperty = useCallback(
    async (key: string, value: string, mode: DocumentPropertyRequest['mode'] = 'set', sourceKey?: string) => {
      if (!selected || selected.type === 'attachment') return
      const currentContent = pendingContentRef.current.get(selected._id) ?? selected.content
      const nextContent = mode === 'rename'
        ? renameDocumentProperty(currentContent, sourceKey || key, key)
        : mode === 'remove'
          ? removeDocumentProperty(currentContent, key)
          : upsertDocumentProperty(currentContent, key, value)
      if (nextContent === currentContent) return
      const checkpointLabel = mode === 'rename'
        ? 'Before document property rename'
        : mode === 'remove'
          ? 'Before document property removal'
          : 'Before document property update'
      const failureLabel = mode === 'rename'
        ? 'document property rename'
        : mode === 'remove'
          ? 'document property removal'
          : 'document property update'
      await saveSelectedContentNow(
        nextContent,
        checkpointLabel,
        failureLabel,
      )
    },
    [saveSelectedContentNow, selected],
  )

  const handleApplyTagToCurrentNote = useCallback(
    async (tag: string) => {
      if (!selected || selected.type !== 'note') return
      const nextContent = applyTagToContent(selected.content, tag)
      setTagsIndexOpen(false)
      if (nextContent === selected.content) return
      await saveSelectedContentNow(nextContent, 'Before tag apply', 'tag apply')
      await refresh()
    },
    [refresh, saveSelectedContentNow, selected],
  )

  const handleSetDocumentProperty = useCallback(() => {
    if (!selected || selected.type === 'attachment') return
    setDocumentPropertyRequest({ mode: 'set', properties: selected.properties ?? {} })
  }, [selected])

  const handleRemoveDocumentProperty = useCallback(() => {
    if (!selected || selected.type === 'attachment') return
    setDocumentPropertyRequest({ mode: 'remove', properties: selected.properties ?? {} })
  }, [selected])

  const handleRenameDocumentProperty = useCallback((sourceKey?: string) => {
    if (!selected || selected.type === 'attachment') return
    setDocumentPropertyRequest({ mode: 'rename', properties: selected.properties ?? {}, sourceKey })
  }, [selected])

  const handleOpenIndexedDocumentProperty = useCallback((
    noteId: string,
    key: string,
    mode: DocumentPropertyRequest['mode'],
  ) => {
    const target = notesRef.current.find(note => note._id === noteId)
    if (!target || target.type === 'attachment') return
    setPropertiesIndexOpen(false)
    if (selectedId && selectedId !== noteId) void flushPendingSave(selectedId)
    setSelectedId(noteId)
    setViewMode('editor')
    const rawValue = target.properties?.[key]
    setDocumentPropertyRequest({
      mode,
      properties: target.properties ?? {},
      sourceKey: mode === 'rename' ? key : undefined,
      defaultKey: key,
      defaultValue: rawValue === undefined ? '' : formatDocumentPropertyInputValue(inferDocumentPropertyValueKind(rawValue), Array.isArray(rawValue) ? rawValue.join(', ') : rawValue),
      defaultKind: rawValue === undefined ? 'text' : inferDocumentPropertyValueKind(rawValue),
    })
  }, [flushPendingSave, selectedId])

  const handleSubmitDocumentProperty = useCallback(async (key: string, value: string, sourceKey?: string) => {
    const request = documentPropertyRequest
    if (!request) return
    await saveDocumentProperty(key, value, request.mode, sourceKey || request.sourceKey)
    setDocumentPropertyRequest(null)
  }, [documentPropertyRequest, saveDocumentProperty])

  const handleCreateCanvasBoard = useCallback(async () => {
    const existing = notesRef.current.find(note => note.type === 'note' && isCanvasBoardNote(note))
    if (existing) return existing
    await createFolder(CANVAS_FOLDER)
    const note = await createNote(
      CANVAS_TITLE,
      CANVAS_FOLDER,
      serializeCanvasNote(buildInitialCanvasData(notesRef.current)),
    )
    await refresh()
    return note
  }, [createFolder, createNote, refresh])

  const handleOpenCanvasView = useCallback(async () => {
    await handleCreateCanvasBoard()
    setViewMode('canvas')
  }, [handleCreateCanvasBoard])

  const handleSaveCanvasBoard = useCallback(
    async (data: ReturnType<typeof buildInitialCanvasData>) => {
      const board =
        notesRef.current.find(note => note.type === 'note' && isCanvasBoardNote(note)) ??
        (await handleCreateCanvasBoard())
      const updated = await updateNote({
        ...board,
        content: serializeCanvasNote(data),
        updated_at: Date.now(),
      })
      notesRef.current = notesRef.current.map(note => (note._id === updated._id ? updated : note))
    },
    [handleCreateCanvasBoard, updateNote],
  )

  const handleManualCollabSync = useCallback(async () => {
    if (!selected || selected.type !== 'note') return
    await syncLocalCollabNow()
    setLocalCollabProviderStatuses(localCollabTransport.status())
  }, [localCollabTransport, selected, syncLocalCollabNow])

  const commandItems = useMemo<CommandAction[]>(() => {
    const baseActions: CommandAction[] = [
      {
        id: 'new-note',
        label: 'New note',
        detail: selectedFolderTemplate
          ? `Create in ${selected?.folder || 'vault root'} with ${selectedFolderTemplate.label}`
          : selected?.folder ? `Create in ${selected.folder}` : 'Create in vault root',
        icon: NotePencil,
        keywords: ['create note', 'quick note', 'new file'],
        category: 'Create',
        rank: 20,
        onRun: () => {
          void handleCreate(selected?.folder)
        },
      },
      {
        id: 'new-daily-note',
        label: 'Open today daily note',
        detail: selected?.folder ? `Open or create in ${selected.folder}` : 'Open or create in vault root',
        icon: NotePencil,
        keywords: ['today', 'journal', 'daily'],
        category: 'Create',
        rank: 18,
        onRun: () => {
          void handleCreateDailyNote(selected?.folder)
        },
      },
      {
        id: 'open-yesterday-daily-note',
        label: 'Open yesterday daily note',
        detail: buildDailyNoteTitle(normalizedEditorPreferences, dailyNoteDateWithOffset(new Date(), -1)),
        icon: NotePencil,
        keywords: ['yesterday', 'journal', 'daily', 'previous day'],
        category: 'Create',
        rank: 11,
        onRun: () => {
          void handleCreateDailyNote(selected?.folder, dailyNoteDateWithOffset(new Date(), -1))
        },
      },
      {
        id: 'open-tomorrow-daily-note',
        label: 'Open tomorrow daily note',
        detail: buildDailyNoteTitle(normalizedEditorPreferences, dailyNoteDateWithOffset(new Date(), 1)),
        icon: NotePencil,
        keywords: ['tomorrow', 'journal', 'daily', 'next day'],
        category: 'Create',
        rank: 10,
        onRun: () => {
          void handleCreateDailyNote(selected?.folder, dailyNoteDateWithOffset(new Date(), 1))
        },
      },
      {
        id: 'open-daily-note-by-date',
        label: 'Open daily note by date',
        detail: buildDailyNoteTitle(normalizedEditorPreferences, new Date()),
        icon: NotePencil,
        keywords: ['calendar', 'date', 'journal', 'daily'],
        category: 'Create',
        rank: 9,
        onRun: () => setDailyDatePickerOpen(true),
      },
      {
        id: 'open-weekly-note',
        label: 'Open this week note',
        detail: buildPeriodicNoteTitle('weekly', normalizedEditorPreferences, new Date()),
        icon: NotePencil,
        keywords: ['weekly', 'week', 'periodic', 'journal', 'review'],
        category: 'Create',
        rank: 10,
        onRun: () => {
          void handleCreatePeriodicNote('weekly', selected?.folder)
        },
      },
      {
        id: 'open-monthly-note',
        label: 'Open this month note',
        detail: buildPeriodicNoteTitle('monthly', normalizedEditorPreferences, new Date()),
        icon: NotePencil,
        keywords: ['monthly', 'month', 'periodic', 'journal', 'review'],
        category: 'Create',
        rank: 10,
        onRun: () => {
          void handleCreatePeriodicNote('monthly', selected?.folder)
        },
      },
      ...vaultTemplates.slice(0, 20).map<CommandAction>(template => ({
        id: `vault-template:${template.id}`,
        label: `New from ${template.label}`,
        detail: template.noteId || 'Vault template',
        icon: FileText,
        category: 'Create',
        onRun: () => {
          void handleCreateTemplate(selected?.folder, template.id)
        },
      })),
      ...(selected?.type === 'note'
        ? allTemplates
            .filter(template => template.id !== 'blank' && template.content.trim())
            .slice(0, 24)
            .map<CommandAction>(template => ({
              id: `insert-template:${template.id}`,
              label: `Insert template: ${template.label}`,
              detail: template.source === 'vault' ? template.noteId || 'Vault template' : 'Built-in template',
              icon: FileText,
              keywords: ['template insert', 'append template', template.label],
              category: 'Insert',
              onRun: () => {
                void handleInsertTemplateIntoCurrent(template.id)
              },
            }))
        : []),
      {
        id: 'new-folder',
        label: 'New folder',
        detail: selected?.folder ? `Create in ${selected.folder}` : 'Create in vault root',
        icon: FolderPlus,
        keywords: ['create folder', 'directory'],
        category: 'Create',
        rank: 16,
        onRun: () => {
          void handleCreateFolder(selected?.folder)
        },
      },
      ...folders
        .filter(folder => folder.path && !isNotesTrashPath(folder.path))
        .slice(0, 24)
        .map<CommandAction>(folder => ({
          id: `rename-folder:${folder.path}`,
          label: `Rename folder: ${folder.path}`,
          detail: 'Rename folder and update moved note paths',
          icon: FolderPlus,
          keywords: ['rename folder', 'move folder', folder.name, folder.path],
          category: 'Folders',
          onRun: () => handleRenameFolder(folder.path),
        })),
      {
        id: 'graph-view',
        label: 'Open graph view',
        detail: 'Knowledge graph',
        icon: GitBranch,
        keywords: ['graph', 'local graph', 'connections', 'map'],
        category: 'Views',
        rank: 14,
        onRun: () => setViewMode('graph'),
      },
      {
        id: 'data-view',
        label: 'Open data view',
        detail: 'Local vault metadata table',
        icon: Table,
        keywords: ['properties', 'metadata', 'table', 'bases'],
        category: 'Views',
        rank: 12,
        onRun: () => setViewMode('data'),
      },
      {
        id: 'canvas-view',
        label: 'Open canvas view',
        detail: 'Local visual board stored as a vault note',
        icon: SquaresFour,
        keywords: ['canvas', 'board', 'visual map'],
        category: 'Views',
        rank: 12,
        onRun: () => {
          void handleOpenCanvasView()
        },
      },
      {
        id: 'toggle-focus-mode',
        label: focusMode ? 'Exit focus mode' : 'Enter focus mode',
        detail: 'Hide or show the notes sidebar',
        icon: PenNib,
        keywords: ['zen', 'focus', 'hide sidebar'],
        category: 'Workspace',
        rank: 10,
        onRun: () => setFocusMode(prev => !prev),
      },
      {
        id: 'open-workspace-tools',
        label: 'Open workspace tools',
        detail: 'Manage sidebars, layout presets, pinned notes, and recent notes',
        icon: ListBullets,
        keywords: ['workspace', 'layout', 'workspaces', 'sidebars', 'pinned', 'recent'],
        category: 'Workspace',
        rank: 13,
        onRun: handleOpenWorkspaceTools,
      },
      {
        id: 'close-workspace-sidebars',
        label: 'Close workspace sidebars',
        detail: 'Hide the file tree and document info sidebars',
        icon: PenNib,
        keywords: ['workspace', 'sidebars', 'hide sidebars', 'focus'],
        category: 'Workspace',
        rank: 10,
        onRun: () => {
          setFocusMode(true)
          setInfoPanelOpen(false)
        },
      },
      {
        id: 'save-workspace-preset',
        label: 'Save current workspace',
        detail: currentWorkspaceSnapshotName,
        icon: ShieldCheck,
        keywords: ['workspace', 'layout', 'save workspace', 'preset'],
        category: 'Workspace',
        rank: 11,
        onRun: handleSaveWorkspaceSnapshot,
      },
      ...(workspaceSnapshot
        ? [{
            id: 'restore-last-workspace-preset',
            label: 'Restore saved workspace',
            detail: workspaceSnapshot.name || `${viewModeLabel(workspaceSnapshot.viewMode)} workspace`,
            icon: UploadSimple,
            keywords: ['workspace', 'layout', 'restore workspace', 'preset'],
            category: 'Workspace',
            rank: 9,
            onRun: handleRestoreWorkspaceSnapshot,
          } satisfies CommandAction]
        : []),
      ...normalizedWorkspaceSnapshots.map<CommandAction>(snapshot => {
        const snapshotName = snapshot.name || `${viewModeLabel(snapshot.viewMode)} workspace`
        return {
          id: `restore-workspace:${workspaceSnapshotKey(snapshot)}`,
          label: `Restore workspace: ${snapshotName}`,
          detail: `${viewModeLabel(snapshot.viewMode)} view, saved ${new Date(snapshot.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
          icon: UploadSimple,
          keywords: ['workspace', 'layout', 'restore workspace', 'preset', snapshotName],
          category: 'Workspace',
          rank: 7,
          onRun: () => handleRestoreNamedWorkspaceSnapshot(snapshot),
        }
      }),
      ...normalizedWorkspaceSnapshots.map<CommandAction>(snapshot => {
        const snapshotName = snapshot.name || `${viewModeLabel(snapshot.viewMode)} workspace`
        return {
          id: `rename-workspace:${workspaceSnapshotKey(snapshot)}`,
          label: `Rename workspace: ${snapshotName}`,
          detail: 'Rename this local layout preset',
          icon: NotePencil,
          keywords: ['workspace', 'layout', 'rename workspace', 'preset', snapshotName],
          category: 'Workspace',
          rank: 6,
          onRun: () => handleRenameWorkspaceSnapshot(snapshot),
        }
      }),
      ...(workspaceSidePaneNote
        ? [{
            id: 'swap-workspace-side-pane',
            label: 'Swap primary and side pane',
            detail: workspaceSidePaneNote.title || workspaceSidePaneNote._id,
            icon: SquaresFour,
            keywords: ['workspace', 'pane', 'split pane', 'swap panes', 'make side pane primary'],
            category: 'Workspace',
            rank: 8,
            onRun: handlePromoteWorkspaceSidePane,
          } satisfies CommandAction, {
            id: 'close-workspace-side-pane',
            label: 'Close workspace side pane',
            detail: workspaceSidePaneNote.title || workspaceSidePaneNote._id,
            icon: X,
            keywords: ['workspace', 'pane', 'split pane', 'close side pane'],
            category: 'Workspace',
            rank: 7,
            onRun: handleCloseWorkspaceSidePane,
          } satisfies CommandAction, {
            id: 'narrow-workspace-side-pane',
            label: 'Narrow side pane',
            detail: `${workspaceSidePanePixelWidth}px wide`,
            icon: SquaresFour,
            keywords: ['workspace', 'pane', 'split pane', 'narrow side pane', 'resize side pane'],
            category: 'Workspace',
            rank: 6,
            onRun: () => handleAdjustWorkspaceSidePaneWidth('narrow'),
          } satisfies CommandAction, {
            id: 'widen-workspace-side-pane',
            label: 'Widen side pane',
            detail: `${workspaceSidePanePixelWidth}px wide`,
            icon: SquaresFour,
            keywords: ['workspace', 'pane', 'split pane', 'widen side pane', 'resize side pane'],
            category: 'Workspace',
            rank: 6,
            onRun: () => handleAdjustWorkspaceSidePaneWidth('widen'),
          } satisfies CommandAction, {
            id: 'reset-workspace-side-pane-width',
            label: 'Reset side pane width',
            detail: `${DEFAULT_WORKSPACE_SIDE_PANE_WIDTH}px default`,
            icon: SquaresFour,
            keywords: ['workspace', 'pane', 'split pane', 'reset side pane width', 'resize side pane'],
            category: 'Workspace',
            rank: 5,
            onRun: () => handleAdjustWorkspaceSidePaneWidth('reset'),
          } satisfies CommandAction]
        : []),
      ...workspaceTabNotes.map<CommandAction>(note => ({
        id: `switch-workspace-tab:${note._id}`,
        label: `Switch tab: ${note.title || 'Untitled'}`,
        detail: note.folder || 'Vault root',
        icon: FileText,
        keywords: ['workspace', 'tab', 'tabs', note._id, note.title],
        category: 'Workspace',
        rank: selectedId === note._id ? 6 : 5,
        onRun: () => handleOpenWorkspaceNote(note._id),
      })),
      ...workspaceTabNotes
        .map<CommandAction>(note => ({
          id: `open-workspace-side-pane:${note._id}`,
          label: `Open in side pane: ${note.title || 'Untitled'}`,
          detail: note.folder || 'Vault root',
          icon: SquaresFour,
          keywords: ['workspace', 'pane', 'split pane', 'side pane', note._id, note.title],
          category: 'Workspace',
          rank: workspaceSidePaneNote?._id === note._id ? 5 : 4,
          onRun: () => handleOpenWorkspaceSidePane(note._id),
        })),
      ...(workspaceTabNotes.length > 1
        ? [
            {
              id: 'next-workspace-tab',
              label: 'Next workspace tab',
              detail: 'Cycle forward through open note tabs',
              icon: FileText,
              keywords: ['workspace', 'tab', 'next tab', 'cycle tab'],
              category: 'Workspace',
              rank: 8,
              onRun: () => handleCycleWorkspaceTab('next'),
            },
            {
              id: 'previous-workspace-tab',
              label: 'Previous workspace tab',
              detail: 'Cycle backward through open note tabs',
              icon: FileText,
              keywords: ['workspace', 'tab', 'previous tab', 'cycle tab'],
              category: 'Workspace',
              rank: 8,
              onRun: () => handleCycleWorkspaceTab('previous'),
            },
            ...(selectedId && workspaceTabNotes.some(note => note._id === selectedId)
              ? [
                  {
                    id: 'move-current-workspace-tab-earlier',
                    label: 'Move current tab earlier',
                    detail: 'Reorder the active workspace tab toward the top',
                    icon: DotsThree,
                    keywords: ['workspace', 'tab', 'reorder tab', 'move tab earlier', 'move tab left'],
                    category: 'Workspace',
                    rank: 7,
                    onRun: () => handleMoveWorkspaceTab(selectedId, 'earlier'),
                  },
                  {
                    id: 'move-current-workspace-tab-later',
                    label: 'Move current tab later',
                    detail: 'Reorder the active workspace tab toward the bottom',
                    icon: DotsThree,
                    keywords: ['workspace', 'tab', 'reorder tab', 'move tab later', 'move tab right'],
                    category: 'Workspace',
                    rank: 7,
                    onRun: () => handleMoveWorkspaceTab(selectedId, 'later'),
                  },
                ] satisfies CommandAction[]
              : []),
            {
              id: 'close-other-workspace-tabs',
              label: 'Close other workspace tabs',
              detail: selected?.title || 'Keep the active note tab',
              icon: DotsThree,
              keywords: ['workspace', 'tab', 'close other tabs'],
              category: 'Workspace',
              rank: 6,
              onRun: handleCloseOtherWorkspaceTabs,
            },
          ] satisfies CommandAction[]
        : []),
      ...(selectedId && workspaceTabNotes.some(note => note._id === selectedId)
        ? [{
            id: 'close-current-workspace-tab',
            label: 'Close current tab',
            detail: selected?.title || selectedId,
            icon: DotsThree,
            keywords: ['workspace', 'tab', 'close tab'],
            category: 'Workspace',
            rank: 5,
            onRun: () => handleCloseWorkspaceTab(selectedId),
          } satisfies CommandAction]
        : []),
      ...(workspaceTabNotes.length > 0
        ? [{
            id: 'close-all-workspace-tabs',
            label: 'Close all workspace tabs',
            detail: `${workspaceTabNotes.length} open note tab${workspaceTabNotes.length === 1 ? '' : 's'}`,
            icon: DotsThree,
            keywords: ['workspace', 'tab', 'close all tabs'],
            category: 'Workspace',
            rank: 4,
            onRun: handleCloseAllWorkspaceTabs,
          } satisfies CommandAction]
        : []),
      {
        id: 'export-vault',
        label: 'Export Markdown vault',
        detail: 'Download .tar with .md files and attachments',
        icon: ShareNetwork,
        onRun: () => {
          void handleExportVault()
        },
      },
      {
        id: 'export-encrypted-vault',
        label: 'Export encrypted vault backup',
        detail: 'Password-protected local backup',
        icon: ShareNetwork,
        onRun: () => {
          void handleExportEncryptedVault()
        },
      },
      {
        id: 'vault-status',
        label: 'Vault privacy status',
        detail: 'Local storage, counts, backup readiness',
        icon: ShieldCheck,
        onRun: () => {
          void handleOpenVaultStatus()
        },
      },
      {
        id: 'notes-keyboard-shortcuts',
        label: 'Keyboard shortcuts',
        detail: 'Notes, editor, and review shortcuts',
        icon: FileText,
        onRun: () => setShortcutsOpen(true),
      },
      {
        id: 'notes-editor-preferences',
        label: 'Editor preferences',
        detail: `${normalizedEditorPreferences.defaultMode}, ${normalizedEditorPreferences.markdownWidth} width`,
        icon: PenNib,
        onRun: () => setPreferencesOpen(true),
      },
      {
        id: 'recovered-drafts',
        label: 'Recovered drafts',
        detail: `${getRecoverableDrafts().length} unsynced local drafts`,
        icon: FileText,
        onRun: handleOpenDraftRecovery,
      },
      {
        id: 'save-current-checkpoint',
        label: 'Save current note',
        detail: 'Flush local save and create a manual version when changed',
        icon: FileText,
        onRun: () => {
          void handleManualSaveCheckpoint()
        },
      },
      {
        id: 'import-markdown',
        label: 'Import notes',
        detail: 'Create vault notes from Markdown, HTML, or text files',
        icon: UploadSimple,
        onRun: () => fileInputRef.current?.click(),
      },
      {
        id: 'import-clipboard-clip',
        label: 'Import clipboard clip',
        detail: 'Create a local Clips note from copied web text or HTML',
        icon: UploadSimple,
        onRun: () => {
          void handleCreateClipboardClip()
        },
      },
      {
        id: 'import-plugin-marketplace-feed',
        label: 'Import plugin marketplace feed',
        detail: 'Fetch signed package metadata into a local vault note',
        icon: UploadSimple,
        onRun: () => {
          void handleImportPluginMarketplaceFeed()
        },
      },
      {
        id: 'import-markdown-folder',
        label: 'Import notes folder',
        detail: 'Preserve vault folders for Markdown, HTML, text, and attachments',
        icon: UploadSimple,
        onRun: () => folderInputRef.current?.click(),
      },
      {
        id: 'import-encrypted-vault',
        label: 'Import encrypted vault backup',
        detail: 'Restore a .ccvault.json backup',
        icon: UploadSimple,
        onRun: () => encryptedBackupInputRef.current?.click(),
      },
      {
        id: 'empty-trash',
        label: 'Empty Trash',
        detail: `${notes.filter(note => note.type === 'note' && isNoteInTrash(note)).length} notes, ${notes.filter(note => note.type === 'attachment' && isNoteInTrash(note)).length} attachments, ${folders.filter(folder => isNotesTrashPath(folder.path)).length} folders`,
        icon: Trash,
        onRun: () => {
          void handleEmptyTrash()
        },
      },
    ]

    if (!focusMode) {
      baseActions.push(
        {
          id: 'narrow-file-tree',
          label: 'Narrow file tree',
          detail: `${treeWidth}px wide`,
          icon: FolderOpen,
          keywords: ['workspace', 'sidebar', 'file tree', 'narrow file tree', 'resize file tree'],
          category: 'Workspace',
          rank: 7,
          onRun: () => handleAdjustFileTreeWidth('narrow'),
        },
        {
          id: 'widen-file-tree',
          label: 'Widen file tree',
          detail: `${treeWidth}px wide`,
          icon: FolderOpen,
          keywords: ['workspace', 'sidebar', 'file tree', 'widen file tree', 'resize file tree'],
          category: 'Workspace',
          rank: 7,
          onRun: () => handleAdjustFileTreeWidth('widen'),
        },
        {
          id: 'reset-file-tree-width',
          label: 'Reset file tree width',
          detail: `${DEFAULT_FILE_TREE_WIDTH}px default`,
          icon: FolderOpen,
          keywords: ['workspace', 'sidebar', 'file tree', 'reset file tree width', 'resize file tree'],
          category: 'Workspace',
          rank: 6,
          onRun: () => handleAdjustFileTreeWidth('reset'),
        },
      )
    }

    if (selectedId) {
      baseActions.push({
        id: 'toggle-pin',
        label: pinnedNoteSet.has(selectedId) ? 'Unpin current note' : 'Pin current note',
        detail: selected?.title || selectedId,
        icon: Star,
        onRun: () => handleTogglePin(selectedId),
      })
      baseActions.push({
        id: 'reveal-current-note',
        label: 'Reveal current note in file tree',
        detail: selected?.folder || 'Vault root',
        icon: FolderOpen,
        keywords: ['reveal active file', 'show in file tree', 'file explorer', 'navigation', 'obsidian'],
        category: 'Workspace',
        rank: 8,
        onRun: handleRevealCurrentInFileTree,
      })
      baseActions.push({
        id: 'copy-current-wikilink',
        label: 'Copy current wikilink',
        detail: selected?.title || selectedId,
        icon: Copy,
        onRun: handleCopyCurrentWikilink,
      })
      baseActions.push({
        id: 'copy-current-embed',
        label: 'Copy current embed',
        detail: selected?.title || selectedId,
        icon: Copy,
        keywords: ['embed', 'transclusion', 'obsidian', 'copy embed', 'note embed'],
        category: 'Links',
        rank: 8,
        onRun: handleCopyCurrentEmbed,
      })
      if (selected?.type === 'note') {
        baseActions.push({
          id: 'open-current-references',
          label: 'Open references',
          detail: selected.title || selectedId,
          icon: GitBranch,
          keywords: ['backlinks', 'references', 'linked mentions', 'unlinked mentions', 'obsidian'],
          category: 'Links',
          rank: 8,
          onRun: handleOpenReferences,
        })
        baseActions.push({
          id: 'open-current-local-graph',
          label: 'Open local graph',
          detail: selected.title || selectedId,
          icon: GitBranch,
          keywords: ['graph', 'local graph', 'connections', 'obsidian', 'map'],
          category: 'Links',
          rank: 8,
          onRun: handleOpenLocalGraph,
        })
      }
      if (selected?.type === 'note' && localCollabSupported) {
        baseActions.push({
          id: 'sync-local-collaboration',
          label: 'Sync collaboration now',
          detail: localCollabLastSyncError
            ? `Last sync failed: ${localCollabLastSyncError}`
            : localCollabProviderSummary.state === 'degraded' || localCollabProviderSummary.state === 'offline'
              ? localCollabProviderSummary.detail
              : localCollabLastSyncedAt
                ? `Last checked ${new Date(localCollabLastSyncedAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}`
                : 'Poll paired providers for this note',
          icon: Cloud,
          onRun: () => {
            void handleManualCollabSync()
          },
        })
      }
      if (localCollabDrafts.length > 0) {
        baseActions.push({
          id: 'review-local-collab-drafts',
          label: 'Review incoming local drafts',
          detail: `${localCollabDrafts.length} pending local edit${localCollabDrafts.length === 1 ? '' : 's'}`,
          icon: ChatCircleText,
          onRun: () => setCollabReviewOpen(true),
        })
      }
      baseActions.push({
        id: 'document-info',
        label: infoPanelOpen ? 'Close document info' : 'Open document info',
        detail: selected?.title || selectedId,
        icon: FileText,
        keywords: ['workspace', 'sidebar', 'document info', 'properties', 'metadata'],
        category: 'Workspace',
        rank: 9,
        onRun: () => setInfoPanelOpen(open => !open),
      })
      baseActions.push({
        id: 'open-all-properties',
        label: 'Open all properties',
        detail: 'Browse and filter vault frontmatter metadata',
        icon: Table,
        keywords: ['properties', 'metadata', 'frontmatter', 'all properties', 'obsidian'],
        category: 'Workspace',
        rank: 8,
        onRun: () => setPropertiesIndexOpen(true),
      })
      baseActions.push({
        id: 'open-all-tags',
        label: 'Open all tags',
        detail: 'Browse nested vault tags and affected notes',
        icon: ListBullets,
        keywords: ['tags', 'tag pane', 'all tags', 'nested tags', 'obsidian'],
        category: 'Workspace',
        rank: 8,
        onRun: () => setTagsIndexOpen(true),
      })
      if (selected?.type === 'note') {
        baseActions.push({
          id: 'word-count',
          label: 'Open word count',
          detail: selected.title || selectedId,
          icon: FileText,
          keywords: ['word count', 'statistics', 'stats', 'characters', 'pages'],
          category: 'Review',
          rank: 9,
          onRun: () => setWordCountOpen(true),
        })
        baseActions.push({
          id: 'assist-writing',
          label: 'Assist writing',
          detail: selectionAnchor?.scope === 'selection' && selectionAnchor.quote?.trim()
            ? 'Draft edits for the current selection'
            : 'Draft local writing suggestions',
          icon: PenNib,
          keywords: ['smart compose', 'assistive writing', 'rewrite', 'polish', 'concise', 'suggestion'],
          category: 'Review',
          rank: 8,
          onRun: handleOpenWritingAssist,
        })
        baseActions.push({
          id: 'open-active-outline',
          label: 'Open outline',
          detail: selectedOutlineHeadings.length > 0
            ? `${selectedOutlineHeadings.length} heading${selectedOutlineHeadings.length === 1 ? '' : 's'}`
            : 'No headings in this note',
          icon: ListBullets,
          keywords: ['outline', 'headings', 'table of contents', 'jump heading', 'obsidian'],
          category: 'Navigation',
          rank: 9,
          onRun: handleOpenActiveOutline,
        })
        selectedOutlineHeadings.slice(0, 24).forEach((heading, index) => {
          baseActions.push({
            id: `jump-heading:${heading.lineNumber}:${index}`,
            label: `Go to heading: ${heading.text}`,
            detail: `H${heading.level} · line ${heading.lineNumber}`,
            icon: ListBullets,
            keywords: ['outline', 'heading', 'jump', 'navigate', heading.text],
            category: 'Navigation',
            rank: 6,
            onRun: () => handleJumpToOutlineHeading(heading),
          })
        })
        baseActions.push({
          id: 'comments',
          label: 'Open comments',
          detail: selected.title || selectedId,
          icon: ChatCircleText,
          keywords: ['comments', 'review', 'annotations', 'discussion', 'notes'],
          category: 'Review',
          rank: 8,
          onRun: () => {
            void handleOpenComments()
          },
        })
      }
      baseActions.push({
        id: 'version-history',
        label: 'Open version history',
        detail: selected?.title || selectedId,
        icon: GitBranch,
        onRun: () => {
          void handleOpenVersionHistory()
        },
      })
      baseActions.push({
        id: 'insert-table-of-contents',
        label: 'Insert or update table of contents',
        detail: selected?.title || selectedId,
        icon: ListBullets,
        onRun: () => {
          void handleUpsertTableOfContents()
        },
      })
      baseActions.push({
        id: 'insert-block-id',
        label: 'Insert block ID',
        detail: 'Add an Obsidian block reference to the current Markdown line',
        icon: GitBranch,
        keywords: ['block id', 'block reference', 'obsidian', 'anchor', 'embed'],
        category: 'Insert',
        rank: 7,
        onRun: handleInsertBlockIdIntoCurrent,
      })
      baseActions.push({
        id: 'copy-block-reference',
        label: 'Copy block reference',
        detail: 'Create or reuse a block ID and copy a link to it',
        icon: Copy,
        keywords: ['block reference', 'copy block', 'block id', 'obsidian', 'anchor', 'wikilink'],
        category: 'Links',
        rank: 7,
        onRun: handleCopyBlockReference,
      })
      baseActions.push({
        id: 'copy-heading-reference',
        label: 'Copy heading reference',
        detail: 'Copy a link to the nearest Markdown heading',
        icon: Copy,
        keywords: ['heading reference', 'copy heading', 'heading link', 'obsidian', 'wikilink'],
        category: 'Links',
        rank: 7,
        onRun: handleCopyHeadingReference,
      })
      baseActions.push({
        id: 'set-document-property',
        label: 'Set document property',
        detail: 'Write local frontmatter metadata',
        icon: NotePencil,
        onRun: () => {
          void handleSetDocumentProperty()
        },
      })
      baseActions.push({
        id: 'save-current-as-template',
        label: 'Save current note as template',
        detail: VAULT_TEMPLATES_FOLDER,
        icon: FileText,
        onRun: () => {
          void handleSaveCurrentAsTemplate()
        },
      })
      baseActions.push({
        id: 'remove-document-property',
        label: 'Remove document property',
        detail: selected?.properties ? Object.keys(selected.properties).join(', ') || 'No properties' : 'No properties',
        icon: NotePencil,
        onRun: () => {
          void handleRemoveDocumentProperty()
        },
      })
      baseActions.push({
        id: 'rename-document-property',
        label: 'Rename document property',
        detail: selected?.properties ? Object.keys(selected.properties).join(', ') || 'No properties' : 'No properties',
        icon: NotePencil,
        keywords: ['frontmatter', 'metadata', 'property rename', 'obsidian'],
        onRun: () => {
          void handleRenameDocumentProperty()
        },
      })
      baseActions.push({
        id: 'suggestions',
        label: 'Open suggestions',
        detail: selected?.title || selectedId,
        icon: NotePencil,
        keywords: ['suggestions', 'review', 'edits', 'tracked changes'],
        category: 'Review',
        rank: 8,
        onRun: () => {
          void handleOpenSuggestions()
        },
      })
      baseActions.push({
        id: 'insert-vault-stats-plugin',
        label: 'Insert vault stats plugin',
        detail: 'Local plugin block, no remote execution',
        icon: SquaresFour,
        onRun: () => handleInsertVaultPluginBlock('vault.stats', 'Vault stats'),
      })
      baseActions.push({
        id: 'insert-recent-notes-plugin',
        label: 'Insert recent notes plugin',
        detail: 'Local plugin block, no remote execution',
        icon: ListBullets,
        onRun: () => handleInsertVaultPluginBlock('vault.recent', 'Recent notes'),
      })
      baseActions.push({
        id: 'insert-plugin-registry',
        label: 'Insert plugin registry',
        detail: 'Audit local plugin sources and permissions',
        icon: SquaresFour,
        onRun: () => handleInsertVaultPluginBlock('vault.plugins', 'Plugin registry'),
      })
      baseActions.push({
        id: 'insert-plugin-marketplace',
        label: 'Insert plugin marketplace',
        detail: 'Browse vault-local plugin packages and install snippets',
        icon: SquaresFour,
        onRun: () => handleInsertVaultPluginBlock('vault.marketplace', 'Plugin marketplace'),
      })
      const pendingPluginWriteCount = buildVaultPluginWriteRecords(notes).length
      baseActions.push({
        id: 'insert-plugin-write-review',
        label: 'Insert plugin write review',
        detail: 'Audit pending plugin changes before approval',
        icon: ShieldCheck,
        onRun: () => handleInsertVaultPluginBlock('vault.plugin-writes', 'Plugin write review'),
      })
      baseActions.push({
        id: 'apply-plugin-write-requests',
        label: 'Apply plugin write requests',
        detail: `${pendingPluginWriteCount} pending reviewed request${pendingPluginWriteCount === 1 ? '' : 's'}`,
        icon: ShieldCheck,
        onRun: () => {
          void handleApplyVaultPluginWrites()
        },
      })
      baseActions.push({
        id: 'insert-plugin-manifest',
        label: 'Insert local plugin manifest',
        detail: 'Install a safe vault-local template plugin',
        icon: SquaresFour,
        onRun: handleInsertVaultPluginManifest,
      })
      baseActions.push({
        id: 'insert-plugin-trusted-publisher',
        label: 'Insert plugin trusted publisher',
        detail: 'Trust a marketplace signing key from this vault',
        icon: ShieldCheck,
        onRun: handleInsertVaultPluginTrustedPublisher,
      })
      for (const command of vaultPluginCommands) {
        baseActions.push({
          id: command.id,
          label: command.label,
          detail: command.detail,
          icon: SquaresFour,
          onRun: () =>
            handleInsertVaultPluginBlock(
              command.pluginId,
              command.config.title ?? command.pluginLabel,
              command.config as Record<string, unknown>,
            ),
        })
      }
      for (const plugin of vaultPlugins.filter(plugin => plugin.id.startsWith('local.')).slice(0, 20)) {
        baseActions.push({
          id: `insert-local-plugin:${plugin.id}`,
          label: `Insert ${plugin.label}`,
          detail: plugin.description || plugin.id,
          icon: SquaresFour,
          onRun: () => handleInsertVaultPluginBlock(plugin.id, plugin.label),
        })
      }
      baseActions.push({
        id: 'export-current-docx',
        label: 'Export current note as DOCX',
        detail: selected?.title || selectedId,
        icon: FileDoc,
        onRun: () => handleExportDocx(selectedId),
      })
      baseActions.push({
        id: 'export-current-pdf',
        label: 'Export current note as PDF',
        detail: 'Opens print dialog',
        icon: FilePdf,
        onRun: () => handleExportPdf(selectedId),
      })
      baseActions.push({
        id: 'export-current-markdown',
        label: 'Export current note as Markdown',
        detail: selected?.title || selectedId,
        icon: FileText,
        onRun: () => handleExportMarkdown(selectedId),
      })
      baseActions.push({
        id: 'export-current-html',
        label: 'Export current note as HTML',
        detail: selected?.title || selectedId,
        icon: FileHtml,
        onRun: () => handleExportHtml(selectedId),
      })
      baseActions.push({
        id: 'publish-static-site',
        label: 'Publish static notes site',
        detail: 'Download a local static HTML site for this vault',
        icon: ShareNetwork,
        onRun: () => handlePublishStaticSite(selectedId),
      })
      baseActions.push({
        id: 'export-current-review',
        label: 'Export private share package',
        detail: 'Offline review with view/comment/suggest permission',
        icon: ShareNetwork,
        onRun: () => {
          void handleExportReviewPackage(selectedId)
        },
      })
    }

    const recentRank = new Map(recentNoteIds.map((id, index) => [id, Math.max(0, 30 - index)]))
    const noteActions = notes
      .filter(note => note.type === 'note')
      .map<CommandAction>(note => ({
        id: `note:${note._id}`,
        label: note.title || 'Untitled',
        detail: [note.folder || 'Vault root', ...(note.aliases?.map(alias => `@${alias}`) ?? [])].join(' '),
        icon: NotePencil,
        keywords: [note._id, note.folder, ...(note.aliases ?? []), ...note.tags].filter(Boolean),
        category: 'Notes',
        rank: (recentRank.get(note._id) ?? 0) + (pinnedNoteSet.has(note._id) ? 8 : 0),
        onRun: () => {
          if (selectedId && selectedId !== note._id) void flushPendingSave(selectedId)
          setSelectedId(note._id)
          setViewMode('editor')
        },
      }))

    const noteEmbedActions = selected?.type === 'note'
      ? notes
          .filter(note => note.type === 'note' && note._id !== selected._id)
          .slice(0, 40)
          .map<CommandAction>(note => ({
            id: `insert-note-embed:${note._id}`,
            label: `Insert embed: ${note.title || 'Untitled'}`,
            detail: note.folder || 'Vault root',
            icon: Copy,
            keywords: ['embed', 'transclusion', 'insert embed', 'note embed', 'obsidian', note._id, note.title, ...(note.aliases ?? [])].filter(Boolean),
            category: 'Insert',
            rank: (recentRank.get(note._id) ?? 0) + (pinnedNoteSet.has(note._id) ? 6 : 0),
            onRun: () => handleInsertNoteEmbedIntoCurrent(note),
          }))
      : []

    const tagActions = buildTagRows(notes, 64)
      .filter(row => row.directCount > 0)
      .map<CommandAction>(row => ({
        id: `rename-tag:${row.tag}`,
        label: `Rename tag #${row.tag}`,
        detail: `${row.directCount} direct, ${row.count} total note${row.count === 1 ? '' : 's'}`,
        icon: NotePencil,
        keywords: ['tag', 'tags', 'rename tag', `#${row.tag}`, row.label],
        category: 'Tags',
        onRun: () => handleRenameTag(row.tag),
      }))

    return [...baseActions, ...noteEmbedActions, ...tagActions, ...noteActions]
  }, [
    allTemplates,
    currentWorkspaceSnapshotName,
    flushPendingSave,
    focusMode,
    folders,
    handleCopyCurrentEmbed,
    handleCopyCurrentWikilink,
    handleCreate,
    handleCreateClipboardClip,
    handleCreateDailyNote,
    handleCreateFolder,
    handleCreatePeriodicNote,
    handleCreateTemplate,
    handleCloseAllWorkspaceTabs,
    handleCloseOtherWorkspaceTabs,
    handleCycleWorkspaceTab,
    handleCloseWorkspaceTab,
    handleEmptyTrash,
    handleExportDocx,
    handleExportEncryptedVault,
    handleExportHtml,
    handleExportMarkdown,
    handleExportPdf,
    handleExportReviewPackage,
    handleExportVault,
    handlePublishStaticSite,
    handleApplyVaultPluginWrites,
    handleCopyBlockReference,
    handleCopyHeadingReference,
    handleInsertVaultPluginBlock,
    handleInsertBlockIdIntoCurrent,
    handleInsertTemplateIntoCurrent,
    handleInsertNoteEmbedIntoCurrent,
    handleInsertVaultPluginManifest,
    handleInsertVaultPluginTrustedPublisher,
    handleImportPluginMarketplaceFeed,
    handleManualSaveCheckpoint,
    handleManualCollabSync,
    handleAdjustFileTreeWidth,
    handleAdjustWorkspaceSidePaneWidth,
    handleCloseWorkspaceSidePane,
    handleOpenWorkspaceSidePane,
    handleOpenWorkspaceNote,
    handleMoveWorkspaceTab,
    handleOpenCanvasView,
    handleOpenComments,
    handleOpenActiveOutline,
    handleOpenDraftRecovery,
    handleJumpToOutlineHeading,
    handleOpenLocalGraph,
    handleOpenReferences,
    handlePromoteWorkspaceSidePane,
    handleRevealCurrentInFileTree,
    handleOpenSuggestions,
    handleOpenVaultStatus,
    handleOpenVersionHistory,
    handleOpenWritingAssist,
    handleOpenWorkspaceTools,
    handleRenameFolder,
    handleRenameTag,
    handleRenameDocumentProperty,
    handleRenameWorkspaceSnapshot,
    handleRemoveDocumentProperty,
    handleRestoreNamedWorkspaceSnapshot,
    handleRestoreWorkspaceSnapshot,
    handleSaveCurrentAsTemplate,
    handleSaveWorkspaceSnapshot,
    handleSetDocumentProperty,
    handleTogglePin,
    handleUpsertTableOfContents,
    treeWidth,
    infoPanelOpen,
    focusMode,
    localCollabDrafts.length,
    localCollabLastSyncError,
    localCollabLastSyncedAt,
    localCollabProviderSummary,
    localCollabSupported,
    normalizedWorkspaceSnapshots,
    normalizedEditorPreferences.defaultMode,
    normalizedEditorPreferences.dailyNoteTitleFormat,
    normalizedEditorPreferences.markdownWidth,
    notes,
    pinnedNoteSet,
    recentNoteIds,
    selected?.folder,
    selectedFolderTemplate,
    selected?.properties,
    selected?.title,
    selectionAnchor,
    selectedOutlineHeadings,
    selectedId,
    setFocusMode,
    setInfoPanelOpen,
    vaultPluginCommands,
    vaultPlugins,
    vaultTemplates,
    workspaceTabNotes,
    workspaceSidePaneNote,
    workspaceSidePanePixelWidth,
    workspaceSnapshot,
  ])

  const handleResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = treeWidth
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX
        setTreeWidth(clampFileTreeWidth(startWidth + delta))
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [treeWidth],
  )

  const handleSidePaneResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = clampWorkspaceSidePaneWidth(Number(workspaceSidePaneWidth) || DEFAULT_WORKSPACE_SIDE_PANE_WIDTH)
      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX
        setWorkspaceSidePaneWidth(clampWorkspaceSidePaneWidth(startWidth + delta))
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [setWorkspaceSidePaneWidth, workspaceSidePaneWidth],
  )

  const handleSidePaneResizeKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentWidth = clampWorkspaceSidePaneWidth(Number(workspaceSidePaneWidth) || DEFAULT_WORKSPACE_SIDE_PANE_WIDTH)
      const step = event.shiftKey ? 40 : 20
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setWorkspaceSidePaneWidth(clampWorkspaceSidePaneWidth(currentWidth + step))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setWorkspaceSidePaneWidth(clampWorkspaceSidePaneWidth(currentWidth - step))
      } else if (event.key === 'Home') {
        event.preventDefault()
        setWorkspaceSidePaneWidth(MIN_WORKSPACE_SIDE_PANE_WIDTH)
      } else if (event.key === 'End') {
        event.preventDefault()
        setWorkspaceSidePaneWidth(MAX_WORKSPACE_SIDE_PANE_WIDTH)
      }
    },
    [setWorkspaceSidePaneWidth, workspaceSidePaneWidth],
  )

  const handleFileTreeResizeKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const step = event.shiftKey ? FILE_TREE_WIDTH_STEP : FILE_TREE_WIDTH_STEP / 2
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setTreeWidth(current => clampFileTreeWidth(current - step))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setTreeWidth(current => clampFileTreeWidth(current + step))
      } else if (event.key === 'Home') {
        event.preventDefault()
        setTreeWidth(MIN_FILE_TREE_WIDTH)
      } else if (event.key === 'End') {
        event.preventDefault()
        setTreeWidth(MAX_FILE_TREE_WIDTH)
      }
    },
    [],
  )

  const pendingLocalEditCount = pendingContentRef.current.size
  const pendingLocalEdits: QueuedLocalEdit[] = [...pendingContentRef.current.entries()].map(([noteId, content]) => {
    const note = notesRef.current.find(item => item._id === noteId)
    const title = note?.type === 'note' ? note.title || noteId.split('/').pop()?.replace(/\.md$/, '') || noteId : noteId
    const folder = note?.type === 'note'
      ? note.folder || 'Vault root'
      : normalizeFolderPath(noteId.split('/').slice(0, -1).join('/')) || 'Vault root'
    return {
      noteId,
      title,
      folder,
      content,
      error: saveErrorByNoteId[noteId],
    }
  })

  const saveLabel =
    saveState === 'saving'
      ? 'Saving...'
      : saveState === 'unsaved'
        ? 'Unsaved'
        : saveState === 'error'
          ? 'Save failed'
          : lastSavedAt
          ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
          : 'Saved'

  const saveDetail = selected?.type !== 'note'
    ? 'Select a note to save edits.'
    : saveState === 'error'
      ? `Queued edits are still local. ${saveErrorByNoteId[selected._id] || 'Retry the queued save when the backend is available.'}`
      : 'Autosaves after edits; manual save also creates a checkpoint when changed.'

  const queuedEditDetail = !networkOnline
    ? 'Saved locally and waiting for reconnect.'
    : saveState === 'error'
      ? 'Last save failed; retry queued save keeps the edit local until it succeeds.'
      : 'Waiting for the next save flush.'
  const knownSyncConflicts = (vaultSyncLedger?.sync_states ?? []).filter(state => isSyncConflictState(state))
  const knownSyncConflictCount = knownSyncConflicts.length
  const knownSyncConflictLabel = `${knownSyncConflictCount} sync conflict${knownSyncConflictCount === 1 ? '' : 's'}`
  const knownSyncConflictActionLabel = `${knownSyncConflictLabel} ${knownSyncConflictCount === 1 ? 'needs' : 'need'} review`

  const noteStatusLabel = saveState === 'error'
    ? 'Save failed'
    : localCollabLastSyncError
      ? 'Sync issue'
      : knownSyncConflictCount > 0
        ? knownSyncConflictLabel
      : !networkOnline
        ? 'Offline'
      : localCollabDrafts.length > 0
        ? `${localCollabDrafts.length} draft${localCollabDrafts.length === 1 ? '' : 's'}`
        : localCollabSyncing
          ? 'Collab sync'
          : syncing
            ? 'Syncing'
            : pendingLocalEditCount > 0
              ? `Queued ${pendingLocalEditCount}`
            : saveState === 'saving'
              ? 'Saving...'
              : saveState === 'unsaved'
                ? 'Unsaved'
                : 'Saved'

  const noteStatusTone =
    saveState === 'error' || localCollabLastSyncError || knownSyncConflictCount > 0
      ? 'danger'
      : !networkOnline || syncing || saveState === 'saving' || localCollabSyncing || localCollabDrafts.length > 0 || pendingLocalEditCount > 0
        ? 'accent'
        : 'muted'
  const noteStatusTriggerLabel = noteStatusTone === 'muted' && noteStatusLabel === 'Saved' ? '' : noteStatusLabel
  const compactHiddenSyncIssueLabels = [
    workspaceSyncState === 'error' ? 'Workspace sync issue' : null,
    pinnedNotesSyncState === 'error' ? 'Pinned-note sync issue' : null,
    savedSearchSyncState === 'error' ? 'Saved-search sync issue' : null,
    editorPreferencesSyncState === 'error' ? 'Editor preferences sync issue' : null,
  ].filter((label): label is string => Boolean(label))
  const compactHiddenSyncIssueLabel =
    compactHiddenSyncIssueLabels.length === 1
      ? compactHiddenSyncIssueLabels[0]
      : `${compactHiddenSyncIssueLabels.length} sync settings need retry`
  const compactNoteToolsTone =
    noteStatusTone === 'danger' || compactHiddenSyncIssueLabels.length > 0
      ? 'danger'
      : noteStatusTone === 'accent'
        ? 'accent'
        : 'default'
  const compactNoteToolsStatusLabel =
    noteStatusTone === 'danger'
      ? noteStatusLabel
      : compactHiddenSyncIssueLabels.length > 0
        ? compactHiddenSyncIssueLabel
        : noteStatusLabel
  const compactNoteToolsTitle = compactNoteToolsTone === 'default' ? 'Note tools' : `Note tools - ${compactNoteToolsStatusLabel}`
  const compactNoteToolsDescription = compactNoteToolsTone === 'default'
    ? undefined
    : compactHiddenSyncIssueLabels.length > 0
      ? `Hidden sync status: ${compactHiddenSyncIssueLabels.join('; ')}. Open Note tools for Status and sync.`
      : `Hidden note status: ${noteStatusLabel}. Open Note tools for Status and sync.`
  const noteStatusIcon = !networkOnline ? <CloudSlash size={14} /> : <Cloud size={14} />

  const viewModeIcon =
    viewMode === 'editor'
      ? <FileText size={14} />
      : viewMode === 'graph'
        ? <GitBranch size={14} />
        : viewMode === 'data'
          ? <Table size={14} />
          : <SquaresFour size={14} />
  const selectedFolderLabel = selected?.folder || 'Vault root'
  const selectedContextLabel = selected?.type === 'attachment' ? `${selectedFolderLabel} / Attachment` : selectedFolderLabel
  const recoverableDraftCount = getRecoverableDrafts().length

  const closeTopBarMenu = () => setTopBarMenu(null)

  const runStatusAction = (action: string) => {
    closeTopBarMenu()
    if (action === 'sync') void handleManualCollabSync()
    if (action === 'drafts') setCollabReviewOpen(true)
    if (action === 'queued-edits') setQueuedEditsOpen(true)
    if (action === 'retry-save') void handleRetryQueuedSave()
    if (action === 'manual-save') void handleManualSaveCheckpoint()
    if (action === 'refresh-vault') void refresh()
    if (action === 'vault-status') void handleOpenVaultStatus()
    if (action === 'recovered-drafts') handleOpenDraftRecovery()
  }

  const runViewAction = (next: ViewMode) => {
    closeTopBarMenu()
    if (next === 'canvas') {
      void handleOpenCanvasView()
      return
    }
    setViewMode(next)
  }

  const runMoreAction = (action: string) => {
    closeTopBarMenu()
    if (action === 'new-note') void handleCreate(selected?.folder)
    if (action === 'daily') void handleCreateDailyNote(selected?.folder)
    if (action === 'daily-yesterday') void handleCreateDailyNote(selected?.folder, dailyNoteDateWithOffset(new Date(), -1))
    if (action === 'daily-tomorrow') void handleCreateDailyNote(selected?.folder, dailyNoteDateWithOffset(new Date(), 1))
    if (action === 'daily-date') setDailyDatePickerOpen(true)
    if (action === 'weekly') void handleCreatePeriodicNote('weekly', selected?.folder)
    if (action === 'monthly') void handleCreatePeriodicNote('monthly', selected?.folder)
    if (action === 'folder') void handleCreateFolder(selected?.folder)
    if (action === 'clip') void handleCreateClipboardClip()
    if (action === 'versions') void handleOpenVersionHistory()
    if (action === 'comments') void handleOpenComments()
    if (action === 'suggest') void handleOpenSuggestions()
    if (action === 'assist-writing') handleOpenWritingAssist()
    if (action === 'references') handleOpenReferences()
    if (action === 'local-graph') handleOpenLocalGraph()
    if (action === 'info') setInfoPanelOpen(open => !open)
    if (action === 'outline') handleOpenActiveOutline()
    if (action === 'word-count') setWordCountOpen(true)
    if (action === 'pin' && selected) handleTogglePin(selected._id)
    if (action === 'reveal-file-tree') handleRevealCurrentInFileTree()
    if (action === 'open-current-side-pane' && selected?.type === 'note') handleOpenWorkspaceSidePane(selected._id)
    if (action === 'copy-wikilink') handleCopyCurrentWikilink()
    if (action === 'copy-embed') handleCopyCurrentEmbed()
    if (action === 'copy-path') handleCopyCurrentPath()
    if (action === 'insert-block-id') handleInsertBlockIdIntoCurrent()
    if (action === 'copy-block-reference') handleCopyBlockReference()
    if (action === 'copy-heading-reference') handleCopyHeadingReference()
    if (action === 'docx' && selected?.type === 'note') handleExportDocx(selected._id)
    if (action === 'pdf' && selected?.type === 'note') handleExportPdf(selected._id)
    if (action === 'markdown' && selected?.type === 'note') handleExportMarkdown(selected._id)
    if (action === 'html' && selected?.type === 'note') handleExportHtml(selected._id)
    if (action === 'publish-site' && selected?.type === 'note') handlePublishStaticSite(selected._id)
    if (action === 'share' && selected?.type === 'note') void handleExportReviewPackage(selected._id)
    if (action === 'restore') void handleRestoreFromTrash()
    if (action === 'trash') void handleDeleteNote()
  }
  return {
    loading,
    notes,
    unavailableNotes,
    folders,
    syncing,
    error,
    refresh,
    selectedId,
    setSelectedId,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    treeWidth,
    editingTitle,
    setEditingTitle,
    titleDraft,
    setTitleDraft,
    focusMode,
    setFocusMode,
    infoPanelOpen,
    setInfoPanelOpen,
    commandOpen,
    setCommandOpen,
    commandQuery,
    setCommandQuery,
    topBarMenu,
    setTopBarMenu,
    compactTopBarActions,
    shortcutsOpen,
    setShortcutsOpen,
    wordCountOpen,
    setWordCountOpen,
    propertiesIndexOpen,
    setPropertiesIndexOpen,
    tagsIndexOpen,
    setTagsIndexOpen,
    activeOutlineOpen,
    setActiveOutlineOpen,
    editorJumpRequest,
    backlinksOpenRequest,
    referencesPanelCollapsed,
    setReferencesPanelCollapsed,
    preferencesOpen,
    setPreferencesOpen,
    dailyDatePickerOpen,
    setDailyDatePickerOpen,
    templatePromptRequest,
    templateNameRequest,
    setTemplateNameRequest,
    tagRenameRequest,
    setTagRenameRequest,
    tagRemoveRequest,
    setTagRemoveRequest,
    folderCreateRequest,
    setFolderCreateRequest,
    folderRenameRequest,
    setFolderRenameRequest,
    moveNoteRequest,
    setMoveNoteRequest,
    workspaceRenameRequest,
    setWorkspaceRenameRequest,
    recentNoteIds,
    setRecentLimit,
    workspaceSnapshot,
    fileTreeExpandedFolders,
    setFileTreeExpandedFolders,
    dataWorkspaceContext,
    setDataWorkspaceContext,
    workspaceSyncState,
    savedSearchSyncState,
    pinnedNotesSyncState,
    editorPreferencesSyncState,
    titleRef,
    topBarRef,
    fileInputRef,
    folderInputRef,
    encryptedBackupInputRef,
    pendingContentRef,
    saveState,
    networkOnline,
    historyOpen,
    setHistoryOpen,
    historyLoading,
    historyRevisions,
    historyPreview,
    historyError,
    versionNameRequest,
    setVersionNameRequest,
    documentPropertyRequest,
    setDocumentPropertyRequest,
    reviewPackageRequest,
    setReviewPackageRequest,
    pluginMarketplaceFeedRequest,
    setPluginMarketplaceFeedRequest,
    encryptedBackupRequest,
    setEncryptedBackupRequest,
    confirmActionRequest,
    setConfirmActionRequest,
    noticeRequest,
    setNoticeRequest,
    commentsOpen,
    setCommentsOpen,
    commentsLoading,
    commentsError,
    noteComments,
    commentComposeRequest,
    setCommentComposeRequest,
    suggestionsOpen,
    setSuggestionsOpen,
    suggestionsLoading,
    suggestionsError,
    noteSuggestions,
    suggestionComposeRequest,
    setSuggestionComposeRequest,
    writingAssistRequest,
    setWritingAssistRequest,
    mergeConflictReviewRequest,
    setMergeConflictReviewRequest,
    activeReviewId,
    setActiveReviewId,
    vaultStatusOpen,
    setVaultStatusOpen,
    vaultStatusLoading,
    vaultStatusError,
    vaultStatus,
    vaultAuditEvents,
    vaultSyncLedger,
    draftRecoveryOpen,
    setDraftRecoveryOpen,
    recoverableDrafts,
    collabReviewOpen,
    setCollabReviewOpen,
    queuedEditsOpen,
    setQueuedEditsOpen,
    selected,
    selectedWordStats,
    selectedOutlineHeadings,
    selectedWordSelectionStats,
    normalizedEditorPreferences,
    writingAssistDefaults,
    notesCssSnippet,
    notesVaultAppearanceStyle,
    editorPreferencesSyncLabel,
    editorPreferencesSyncDetail,
    localCollabProviderStatuses,
    localCollabProviderSummary,
    localCollabSupported,
    localCollabPeers,
    localCollabDrafts,
    localCollabSyncing,
    localCollabLastSyncError,
    vaultTemplates,
    allTemplates,
    pinnedNoteSet,
    pinnedNotesSyncLabel,
    pinnedNotesSyncDetail,
    normalizedSavedSearches,
    savedSearchSyncLabel,
    savedSearchSyncDetail,
    canvasBoardNote,
    reviewMarkers,
    updateEditorPreferences,
    updateWritingAssistDefaults,
    handleRetryEditorPreferencesSync,
    handleRetryPinnedNotesSync,
    handleRetrySavedSearchSync,
    unavailableNoteIds,
    fileTreeNotes,
    searchUsesBackend,
    allNoteTitles,
    normalizedRecentLimit,
    pinnedWorkspaceNotes,
    recentWorkspaceNotes,
    workspaceTabNotes,
    workspaceSidePaneNote,
    workspaceSidePanePixelWidth,
    normalizedWorkspaceSnapshots,
    workspaceSyncLabel,
    workspaceSyncDetail,
    handleRetryWorkspaceSync,
    flushPendingSave,
    resolveTemplatePromptRequest,
    handleCreate,
    handleCreateDailyNote,
    handleCreateTemplate,
    handleSaveSearch,
    handleRemoveSavedSearch,
    handleRenameTag,
    handleConfirmRenameTag,
    handleRemoveTag,
    handleConfirmRemoveTag,
    handleSubmitSaveCurrentAsTemplate,
    handleCreateFolder,
    handleConfirmCreateFolder,
    requestConfirmAction,
    showNotice,
    handleDeleteNote,
    handleOpenVaultStatus,
    loadRecoverableDrafts,
    handleRetryQueuedSave,
    handleOpenQueuedEdit,
    handleOpenDiagnosticsNote,
    handleRestoreDraft,
    handleDiscardDraft,
    handleDeleteFolder,
    handleRestoreFolder,
    handleRenameFolder,
    handleConfirmRenameFolder,
    handleRenameNote,
    handleDuplicateNote,
    handleMoveNote,
    handleMoveNoteToFolder,
    handleSubmitMoveNote,
    handleRestoreNoteToFolder,
    handleTogglePin,
    handleReorderWorkspaceTab,
    handleMoveWorkspaceTab,
    handleCopyMarkdown,
    handleExportMarkdown,
    handleSubmitReviewPackage,
    handleSubmitEncryptedBackup,
    handleImportEncryptedVault,
    handleSubmitEncryptedVaultImport,
    handleImportMarkdownFiles,
    handleOpenWorkspaceNote,
    handleOpenWorkspaceSidePane,
    handlePromoteWorkspaceSidePane,
    handleCloseWorkspaceSidePane,
    handleAdjustWorkspaceSidePaneWidth,
    handleCloseWorkspaceTab,
    handleCloseOtherWorkspaceTabs,
    handleCloseAllWorkspaceTabs,
    handleAdjustFileTreeWidth,
    handleSaveWorkspaceSnapshot,
    handleRestoreWorkspaceSnapshot,
    handleRestoreNamedWorkspaceSnapshot,
    handleRenameWorkspaceSnapshot,
    handleConfirmRenameWorkspaceSnapshot,
    handleDeleteWorkspaceSnapshot,
    handleAddComment,
    handleSubmitCommentCompose,
    handleResolveComment,
    handleReplyToComment,
    handleDraftReplyToComment,
    handleJumpToReviewAnchor,
    handleAddSuggestion,
    handleCommentOnSuggestion,
    handleSubmitSuggestionCompose,
    handleSuggestRemoteConflictVersion,
    handleReviewSyncConflictMerge,
    handleSubmitSyncConflictMergeReview,
    handleKeepLocalSyncConflictVersion,
    handleCreateWritingAssistSuggestion,
    handleApplySuggestion,
    handleRejectSuggestion,
    handleApplyAllSuggestions,
    handleRejectAllSuggestions,
    handleRestoreRevision,
    handlePreviewRevision,
    handleCreateVersionCheckpoint,
    handleRenameRevision,
    handleSubmitVersionName,
    handleContentChange,
    handleCopyRevisionToCurrent,
    handleSidePaneContentChange,
    handleJumpToOutlineHeading,
    handleSelectionAnchorChange,
    handleApplyLocalCollabDraft,
    handleDismissLocalCollabDraft,
    handleSubmitPluginMarketplaceFeed,
    handleTitleCommit,
    handleLinkUnlinkedMention,
    handleLinkAllUnlinkedMentions,
    handleWikilinkClick,
    handleGraphSelect,
    handleToggleTaskDone,
    saveDocumentProperty,
    handleApplyTagToCurrentNote,
    handleRenameDocumentProperty,
    handleOpenIndexedDocumentProperty,
    handleSubmitDocumentProperty,
    handleCreateCanvasBoard,
    handleSaveCanvasBoard,
    commandItems,
    handleResize,
    handleSidePaneResize,
    handleSidePaneResizeKeyDown,
    handleFileTreeResizeKeyDown,
    pendingLocalEditCount,
    pendingLocalEdits,
    saveLabel,
    saveDetail,
    queuedEditDetail,
    knownSyncConflictCount,
    knownSyncConflictActionLabel,
    noteStatusTone,
    noteStatusTriggerLabel,
    compactNoteToolsTone,
    compactNoteToolsTitle,
    compactNoteToolsDescription,
    noteStatusIcon,
    viewModeIcon,
    selectedFolderLabel,
    selectedContextLabel,
    recoverableDraftCount,
    runStatusAction,
    runViewAction,
    runMoreAction,
  } as const
}
