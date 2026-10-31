import { lazy, Fragment, Suspense } from 'react'
import FileTree from '@/features/notes/components/FileTree'
import {
  FolderOpen,
  FileText,
  NotePencil,
  Star,
  SquaresFour,
  Copy,
  GitBranch,
  ListBullets,
  PenNib,
  X,
  DotsThree,
  ShieldCheck,
  UploadSimple,
  CloudSlash,
  Cloud,
  ArrowClockwise,
  Trash,
  ChatCircleText,
  FolderPlus,
  Table,
  FileDoc,
  FilePdf,
  FileHtml,
  ShareNetwork,
  Plus,
} from '@phosphor-icons/react'
import { isNoteInTrash } from '@/features/notes/trash'
import NoteEditor from '@/features/notes/components/NoteEditor'
import BacklinksPanel from '@/features/notes/components/BacklinksPanel'
import { VaultDataView } from '@/features/notes/VaultDataView'
import { DocumentInfoPanel } from '@/features/notes/DocumentInfoPanel'
import { NotesCommandPalette } from '@/features/notes/NotesCommandPalette'
import {
  MIN_FILE_TREE_WIDTH,
  MAX_FILE_TREE_WIDTH,
  DEFAULT_FILE_TREE_WIDTH,
  DEFAULT_WORKSPACE_SIDE_PANE_WIDTH,
  WORKSPACE_TAB_DRAG_TYPE,
  viewModeLabel,
  workspaceSnapshotKey,
  MIN_WORKSPACE_SIDE_PANE_WIDTH,
  MAX_WORKSPACE_SIDE_PANE_WIDTH,
} from '@/features/notes/workspaceHelpers'
import {
  TopBarMenuButton,
  TopBarMenuSection,
  TopBarMenuItem,
} from '@/features/notes/components/NotesToolbar'
import {
  UnavailableNotesState,
  AttachmentPreview,
  EmptyState,
} from '@/features/notes/components/WorkspaceStates'
import { VersionHistoryDialog, VersionNameDialog } from '@/features/notes/dialogs/VersionHistoryDialogs'
import {
  DocumentPropertyDialog,
  AllPropertiesDialog,
  AllTagsDialog,
  TagRenameDialog,
  TagRemoveDialog,
} from '@/features/notes/dialogs/PropertyDialogs'
import {
  ReviewPackageDialog,
  PluginMarketplaceFeedDialog,
  EncryptedBackupPasswordDialog,
} from '@/features/notes/dialogs/ExportDialogs'
import {
  ConfirmActionDialog,
  NoticeDialog,
  TemplatePromptDialog,
  TemplateNameDialog,
  FolderNameDialog,
  MoveNoteDialog,
  WorkspaceRenameDialog,
} from '@/features/notes/dialogs/PromptDialogs'
import {
  CommentsDialog,
  CommentComposeDialog,
  SuggestionsDialog,
  SuggestionComposeDialog,
  WritingAssistDialog,
} from '@/features/notes/dialogs/ReviewDialogs'
import {
  VaultStatusDialog,
  SyncConflictMergeDialog,
  QueuedEditsDialog,
  LocalCollabDraftDialog,
  DraftRecoveryDialog,
} from '@/features/notes/dialogs/SyncDialogs'
import {
  NotesShortcutsDialog,
  TopBarWordCountDialog,
  ActiveNoteOutlineDialog,
  DailyDatePickerDialog,
} from '@/features/notes/dialogs/NavigationDialogs'
import { NotesPreferencesDialog } from '@/features/notes/dialogs/PreferencesDialog'
import { useNotesWorkspace } from '@/features/notes/useNotesWorkspace'

const GraphView = lazy(() => import('@/features/notes/components/GraphView'))
const CanvasView = lazy(() => import('@/features/notes/components/CanvasView'))
export default function NotesWorkspace() {
  const {
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
  } = useNotesWorkspace()


  if (loading) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        Loading vault...
      </div>
    )
  }

  if (error && notes.length === 0 && unavailableNotes.length === 0) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Notes sync unavailable</div>
        <div style={{ maxWidth: 420, textAlign: 'center', lineHeight: 1.5 }}>{error}</div>
        <button
          type="button"
          onClick={refresh}
          style={{
            background: 'var(--bg-white-04)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '7px 14px',
            fontSize: 12,
          }}
        >
          Retry
        </button>
      </div>
    )
  }



  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.mdown,.html,.htm,.txt,text/markdown,text/html,text/plain"
        multiple
        style={{ display: 'none' }}
        onChange={event => {
          void handleImportMarkdownFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <input
        ref={node => {
          folderInputRef.current = node
          node?.setAttribute('webkitdirectory', '')
          node?.setAttribute('directory', '')
        }}
        type="file"
        accept=".md,.markdown,.mdown,.html,.htm,.txt,text/markdown,text/html,text/plain"
        multiple
        style={{ display: 'none' }}
        onChange={event => {
          void handleImportMarkdownFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <input
        ref={encryptedBackupInputRef}
        type="file"
        accept=".ccvault.json,application/json"
        style={{ display: 'none' }}
        onChange={event => {
          void handleImportEncryptedVault(event.target.files)
          event.target.value = ''
        }}
      />
      {notesCssSnippet && (
        <style data-testid="notes-css-snippet">{notesCssSnippet}</style>
      )}
      <div
        data-notes-vault-scope="true"
        data-notes-appearance={normalizedEditorPreferences.appearanceMode}
        style={{
          flex: 1,
          minHeight: 0,
          margin: '-20px -28px',
          display: 'flex',
          overflow: 'hidden',
          ...notesVaultAppearanceStyle,
        }}
      >
        {!focusMode && (
          <>
            {/* File tree */}
            <div
              style={{
                width: treeWidth,
                minWidth: treeWidth,
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <FileTree
                notes={fileTreeNotes}
                folders={folders}
                templates={vaultTemplates}
                pinnedNoteIds={pinnedNoteSet}
                recentNoteIds={recentNoteIds}
                recentLimit={normalizedRecentLimit}
                onRecentLimitChange={setRecentLimit}
                selectedId={selectedId}
                unavailableNoteIds={unavailableNoteIds}
                onUnavailableNoteSelect={() => {
                  void refresh()
                }}
                onSelect={id => {
                  if (unavailableNoteIds.has(id)) {
                    void refresh()
                    return
                  }
                  if (selectedId && selectedId !== id) void flushPendingSave(selectedId)
                  setSelectedId(id)
                  setViewMode('editor')
                }}
                onOpenInSidePane={handleOpenWorkspaceSidePane}
                onCreate={handleCreate}
                onCreateFolder={handleCreateFolder}
                onDelete={handleDeleteNote}
                onDeleteFolder={handleDeleteFolder}
                onRestoreFolder={handleRestoreFolder}
                onRename={handleRenameNote}
                onRenameFolder={handleRenameFolder}
                onDuplicate={handleDuplicateNote}
                onMove={handleMoveNote}
                onMoveToFolder={handleMoveNoteToFolder}
                onRestoreNoteToFolder={handleRestoreNoteToFolder}
                onCreateDailyNote={handleCreateDailyNote}
                onCreateTemplate={handleCreateTemplate}
                onCopyMarkdown={handleCopyMarkdown}
                onExportMarkdown={handleExportMarkdown}
                onTogglePin={handleTogglePin}
                onRenameTag={handleRenameTag}
                expandedFolders={fileTreeExpandedFolders}
                onExpandedFoldersChange={paths => setFileTreeExpandedFolders(new Set([
                  '',
                  ...paths
                    .map(path => path.trim())
                    .filter(Boolean)
                    .slice(0, 32),
                ]))}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchUsesBackend={searchUsesBackend}
                savedSearches={normalizedSavedSearches}
                savedSearchSyncLabel={savedSearchSyncLabel}
                savedSearchSyncDetail={savedSearchSyncDetail}
                savedSearchSyncError={savedSearchSyncState === 'error'}
                onSaveSearch={handleSaveSearch}
                onRemoveSavedSearch={handleRemoveSavedSearch}
                onRetrySavedSearchSync={handleRetrySavedSearchSync}
              />
            </div>

            {/* Resize handle */}
            <div
              onMouseDown={handleResize}
              style={{
                width: 4,
                cursor: 'col-resize',
                background: 'transparent',
                flexShrink: 0,
                marginLeft: -2,
                marginRight: -2,
                zIndex: 10,
                position: 'relative',
              }}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize file tree"
              aria-valuemin={MIN_FILE_TREE_WIDTH}
              aria-valuemax={MAX_FILE_TREE_WIDTH}
              aria-valuenow={treeWidth}
              aria-valuetext={`${treeWidth} pixels wide`}
              tabIndex={0}
              onKeyDown={handleFileTreeResizeKeyDown}
            />
          </>
        )}

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div
            ref={topBarRef}
            data-testid="notes-topbar"
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'nowrap',
              gap: 6,
              height: 36,
              maxHeight: 36,
              padding: '4px 8px',
              flexShrink: 0,
              position: 'relative',
              zIndex: 80,
              borderBottom: '1px solid var(--border)',
              background: 'color-mix(in srgb, var(--bg-base) 94%, black)',
              boxShadow: '0 1px 0 var(--bg-white-03)',
              overflow: 'visible',
              whiteSpace: 'nowrap',
            }}
          >
            <div data-testid="notes-topbar-primary" style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 6, minWidth: 0, flex: '1 1 0', overflow: 'visible', height: 28 }}>
              <div style={{ minWidth: compactTopBarActions ? 48 : 84, maxWidth: compactTopBarActions ? 'none' : 'clamp(120px, 34vw, 360px)', display: 'flex', alignItems: 'center', flex: compactTopBarActions ? '1 1 96px' : '1 1 180px', height: 28 }}>
                {selected ? (
                  editingTitle ? (
                    <input
                      ref={titleRef}
                      value={titleDraft}
                      onChange={e => setTitleDraft(e.target.value)}
                      onBlur={() => {
                        void handleTitleCommit()
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void handleTitleCommit()
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          setTitleDraft(selected.title)
                          setEditingTitle(false)
                        }
                      }}
                      aria-label="Note title"
                      autoFocus
                      style={{
                        width: '100%',
                        minWidth: 0,
                        height: 28,
                        background: 'var(--bg-white-03)',
                        border: '1px solid var(--accent-a30)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: 14,
                        fontWeight: 650,
                        fontFamily: 'inherit',
                        padding: '0 7px',
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      aria-label="Rename note"
                      onClick={() => {
                        setTitleDraft(selected.title)
                        setEditingTitle(true)
                        setTimeout(() => titleRef.current?.focus(), 20)
                      }}
                      style={{
                        width: '100%',
                        minWidth: 0,
                        height: 28,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        cursor: 'text',
                        padding: '0 5px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        textAlign: 'left',
                      }}
                      title={`${selectedContextLabel} / ${selected.title || 'Untitled'}`}
                    >
                      <span
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: 14,
                          fontWeight: 650,
                          minWidth: 32,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: '1 1 auto',
                        }}
                      >
                        {selected.title || 'Untitled'}
                      </span>
                    </button>
                  )
                ) : (
                  <div
                    style={{
                      width: '100%',
                      minWidth: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '0 5px',
                      overflow: 'hidden',
                    }}
                  >
                    {!compactTopBarActions && (
                      <>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 550, whiteSpace: 'nowrap' }}>Vault workspace</span>
                        <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>/</span>
                      </>
                    )}
                    <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Select a note</span>
                  </div>
                )}
              </div>

              {selected && !editingTitle && !compactTopBarActions && (
                <TopBarMenuButton
                  label="Note details"
                  icon={<FolderOpen size={14} />}
                  menuAlign="left"
                  searchable
                  searchLabel="Filter note details"
                  searchPlaceholder="Filter details..."
                  open={topBarMenu === 'note-identity'}
                  onToggle={() => setTopBarMenu(topBarMenu === 'note-identity' ? null : 'note-identity')}
                >
                  <TopBarMenuSection label="Current note" />
                  <TopBarMenuItem
                    label={selected.title || 'Untitled'}
                    icon={<FileText size={14} />}
                    detail={selected._id}
                    disabled
                  />
                  <TopBarMenuItem
                    label={selectedFolderLabel}
                    icon={<FolderOpen size={14} />}
                    detail={selected.type === 'attachment' ? 'Attachment folder' : 'Folder'}
                    disabled
                  />
                  {selected.type === 'note' && (
                    <>
                      <TopBarMenuSection label="Identity" />
                      <TopBarMenuItem
                        label="Rename note"
                        icon={<NotePencil size={14} />}
                        onClick={() => {
                          setTopBarMenu(null)
                          setTitleDraft(selected.title)
                          setEditingTitle(true)
                          setTimeout(() => titleRef.current?.focus(), 20)
                        }}
                      />
                      <TopBarMenuItem label={pinnedNoteSet.has(selected._id) ? 'Unpin current note' : 'Pin current note'} icon={<Star size={14} />} onClick={() => runMoreAction('pin')} />
                      <TopBarMenuItem
                        label="Reveal in file tree"
                        icon={<FolderOpen size={14} />}
                        detail={focusMode ? 'Show the file tree with this note selected.' : selected.folder || 'Vault root'}
                        onClick={() => runMoreAction('reveal-file-tree')}
                      />
                      <TopBarMenuItem
                        label="Open in side pane"
                        icon={<SquaresFour size={14} />}
                        detail="Split this note beside the editor."
                        onClick={() => runMoreAction('open-current-side-pane')}
                      />
                      <TopBarMenuSection label="Copy links" />
                      <TopBarMenuItem label="Copy wikilink" icon={<Copy size={14} />} onClick={() => runMoreAction('copy-wikilink')} />
                      <TopBarMenuItem label="Copy note embed" icon={<Copy size={14} />} onClick={() => runMoreAction('copy-embed')} />
                      <TopBarMenuItem label="Copy note path" icon={<Copy size={14} />} onClick={() => runMoreAction('copy-path')} />
                      <TopBarMenuSection label="References" />
                      <TopBarMenuItem label="Open references" icon={<GitBranch size={14} />} onClick={() => runMoreAction('references')} />
                      <TopBarMenuItem label="Open local graph" icon={<GitBranch size={14} />} onClick={() => runMoreAction('local-graph')} />
                      <TopBarMenuItem label="Insert block ID" icon={<GitBranch size={14} />} onClick={() => runMoreAction('insert-block-id')} />
                      <TopBarMenuItem label="Copy block reference" icon={<Copy size={14} />} onClick={() => runMoreAction('copy-block-reference')} />
                      <TopBarMenuItem label="Copy heading reference" icon={<Copy size={14} />} onClick={() => runMoreAction('copy-heading-reference')} />
                    </>
                  )}
                </TopBarMenuButton>
              )}

              {!compactTopBarActions && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 3, flexWrap: 'nowrap', flex: '0 1 auto', minWidth: 0 }}>
	                  <TopBarMenuButton
	                    label="Workspace tools"
	                    icon={<ListBullets size={14} />}
	                    menuAlign="left"
	                    searchable
	                    searchLabel="Filter workspace tools"
	                    searchPlaceholder="Filter workspace..."
	                    open={topBarMenu === 'workspace'}
	                    onToggle={() => setTopBarMenu(topBarMenu === 'workspace' ? null : 'workspace')}
	                  >
                    <TopBarMenuItem
                      label="Open command palette"
                      icon={<ListBullets size={14} />}
                      detail="Search notes, run commands, and jump across the vault."
                      onClick={() => {
                        setCommandOpen(true)
                        setCommandQuery('')
                        setTopBarMenu(null)
                      }}
                    />
                    <TopBarMenuItem
                      label="Keyboard shortcuts"
                      icon={<FileText size={14} />}
                      detail="Open the Notes shortcut reference."
                      onClick={() => {
                        setShortcutsOpen(true)
                        setTopBarMenu(null)
                      }}
                    />
                    <TopBarMenuSection label="Sidebars" />
                    <TopBarMenuItem
                      label={focusMode ? 'Show file tree' : 'Hide file tree'}
                      icon={<PenNib size={14} />}
                      detail={focusMode ? 'Bring back the file tree sidebar.' : 'Enter a cleaner writing layout.'}
                      onClick={() => {
                        setFocusMode(prev => !prev)
                        setTopBarMenu(null)
                      }}
                    />
                    {!focusMode && (
                      <>
                        <TopBarMenuItem
                          label="Narrow file tree"
                          icon={<FolderOpen size={14} />}
                          detail={`${treeWidth}px wide`}
                          onClick={() => handleAdjustFileTreeWidth('narrow')}
                        />
                        <TopBarMenuItem
                          label="Widen file tree"
                          icon={<FolderOpen size={14} />}
                          detail={`${treeWidth}px wide`}
                          onClick={() => handleAdjustFileTreeWidth('widen')}
                        />
                        <TopBarMenuItem
                          label="Reset file tree width"
                          icon={<FolderOpen size={14} />}
                          detail={`${DEFAULT_FILE_TREE_WIDTH}px default`}
                          onClick={() => handleAdjustFileTreeWidth('reset')}
                        />
                      </>
                    )}
                    <TopBarMenuItem
                      label={infoPanelOpen ? 'Hide document info' : 'Show document info'}
                      icon={<FileText size={14} />}
                      detail={selected ? 'Toggle the right document metadata sidebar.' : 'Select a note to inspect metadata.'}
                      disabled={!selected}
                      onClick={() => {
                        setInfoPanelOpen(prev => !prev)
                        setTopBarMenu(null)
                      }}
                    />
                    <TopBarMenuItem
                      label="Close sidebars"
                      icon={<PenNib size={14} />}
                      detail="Hide the file tree and document info sidebars."
                      onClick={() => {
                        setFocusMode(true)
                        setInfoPanelOpen(false)
                        setTopBarMenu(null)
                      }}
                    />
                    {workspaceSidePaneNote && (
                      <>
                        <TopBarMenuItem
                          label="Swap primary and side pane"
                          icon={<SquaresFour size={14} />}
                          detail={workspaceSidePaneNote.title || workspaceSidePaneNote._id}
                          onClick={handlePromoteWorkspaceSidePane}
                        />
                        <TopBarMenuItem
                          label="Close side pane"
                          icon={<X size={14} />}
                          detail={workspaceSidePaneNote.title || workspaceSidePaneNote._id}
                          onClick={handleCloseWorkspaceSidePane}
                        />
                        <TopBarMenuItem
                          label="Narrow side pane"
                          icon={<SquaresFour size={14} />}
                          detail={`${workspaceSidePanePixelWidth}px wide`}
                          onClick={() => handleAdjustWorkspaceSidePaneWidth('narrow')}
                        />
                        <TopBarMenuItem
                          label="Widen side pane"
                          icon={<SquaresFour size={14} />}
                          detail={`${workspaceSidePanePixelWidth}px wide`}
                          onClick={() => handleAdjustWorkspaceSidePaneWidth('widen')}
                        />
                        <TopBarMenuItem
                          label="Reset side pane width"
                          icon={<SquaresFour size={14} />}
                          detail={`${DEFAULT_WORKSPACE_SIDE_PANE_WIDTH}px default`}
                          onClick={() => handleAdjustWorkspaceSidePaneWidth('reset')}
                        />
                      </>
                    )}
                    {workspaceTabNotes.length > 0 && (
                      <>
                        <TopBarMenuSection label="Open tabs" />
                        {workspaceTabNotes.map(note => {
                          const isActivePrimaryNote = selectedId === note._id
                          return (
                            <Fragment key={`workspace-tab-${note._id}`}>
                              <TopBarMenuItem
                                label={`Switch tab: ${note.title || 'Untitled'}`}
                                icon={<FileText size={14} />}
                                detail={workspaceTabNotes.length > 1 ? `${note.folder || 'Vault root'} · Drag or Alt+Up/Down to reorder` : note.folder || 'Vault root'}
                                active={isActivePrimaryNote}
                                draggable={workspaceTabNotes.length > 1}
                                onDragStart={event => {
                                  event.dataTransfer.setData(WORKSPACE_TAB_DRAG_TYPE, note._id)
                                  event.dataTransfer.effectAllowed = 'move'
                                }}
                                onDragOver={event => {
                                  if (workspaceTabNotes.length <= 1) return
                                  event.preventDefault()
                                  event.dataTransfer.dropEffect = 'move'
                                }}
                                onDrop={event => {
                                  event.preventDefault()
                                  handleReorderWorkspaceTab(event.dataTransfer.getData(WORKSPACE_TAB_DRAG_TYPE), note._id)
                                }}
                                onKeyDown={event => {
                                  if (!event.altKey || workspaceTabNotes.length <= 1) return
                                  if (event.key === 'ArrowUp') {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    handleMoveWorkspaceTab(note._id, 'earlier')
                                  }
                                  if (event.key === 'ArrowDown') {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    handleMoveWorkspaceTab(note._id, 'later')
                                  }
                                }}
                                onClick={() => handleOpenWorkspaceNote(note._id)}
                              />
                              <TopBarMenuItem
                                label={`Open in side pane: ${note.title || 'Untitled'}`}
                                icon={<SquaresFour size={14} />}
                                detail={isActivePrimaryNote ? 'Split the current note to the side.' : note.folder || 'Vault root'}
                                active={workspaceSidePaneNote?._id === note._id}
                                onClick={() => handleOpenWorkspaceSidePane(note._id)}
                              />
                              <TopBarMenuItem
                                label={`Close tab: ${note.title || 'Untitled'}`}
                                icon={<DotsThree size={14} />}
                                detail="Remove from this local workspace stack."
                                onClick={() => handleCloseWorkspaceTab(note._id)}
                              />
                            </Fragment>
                          )
                        })}
                        {selectedId && workspaceTabNotes.length > 1 && (
                          <>
                            <TopBarMenuItem
                              label="Move current tab earlier"
                              icon={<DotsThree size={14} />}
                              detail="Reorder the active tab toward the top."
                              onClick={() => handleMoveWorkspaceTab(selectedId, 'earlier')}
                            />
                            <TopBarMenuItem
                              label="Move current tab later"
                              icon={<DotsThree size={14} />}
                              detail="Reorder the active tab toward the bottom."
                              onClick={() => handleMoveWorkspaceTab(selectedId, 'later')}
                            />
                            <TopBarMenuItem
                              label="Close other tabs"
                              icon={<DotsThree size={14} />}
                              detail="Keep the active note tab in this workspace."
                              onClick={handleCloseOtherWorkspaceTabs}
                            />
                          </>
                        )}
                        <TopBarMenuItem
                          label="Close all tabs"
                          icon={<DotsThree size={14} />}
                          detail="Clear this local workspace tab stack."
                          tone="danger"
                          onClick={handleCloseAllWorkspaceTabs}
                        />
                      </>
                    )}
                    <TopBarMenuSection label="Workspace snapshot" />
                    <TopBarMenuItem
                      label="Save current workspace"
                      icon={<ShieldCheck size={14} />}
                      detail="Capture view, sidebar, info panel, width, and active note."
                      onClick={handleSaveWorkspaceSnapshot}
                    />
                    <TopBarMenuItem
                      label="Restore saved workspace"
                      icon={<UploadSimple size={14} />}
                      detail={workspaceSnapshot ? `Saved ${new Date(workspaceSnapshot.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'No saved workspace yet.'}
                      disabled={!workspaceSnapshot}
                      onClick={handleRestoreWorkspaceSnapshot}
                    />
                    <TopBarMenuItem
                      label={workspaceSyncLabel}
                      icon={workspaceSyncState === 'error' ? <CloudSlash size={14} /> : <Cloud size={14} />}
                      detail={workspaceSyncDetail}
                      disabled
                    />
                    {workspaceSyncState === 'error' && (
                      <TopBarMenuItem
                        label="Retry workspace sync"
                        icon={<ArrowClockwise size={14} />}
                        detail="Write local workspace presets to the hidden vault sync note."
                        onClick={handleRetryWorkspaceSync}
                      />
                    )}
                    {normalizedWorkspaceSnapshots.length > 0 && (
                      <>
                        <TopBarMenuSection label="Saved workspaces" />
                        {normalizedWorkspaceSnapshots.map(snapshot => {
                          const snapshotName = snapshot.name || `${viewModeLabel(snapshot.viewMode)} workspace`
                          const snapshotKey = workspaceSnapshotKey(snapshot)
                          return (
                            <Fragment key={snapshotKey}>
                              <TopBarMenuItem
                                label={`Restore workspace: ${snapshotName}`}
                                icon={<UploadSimple size={14} />}
                                detail={`${viewModeLabel(snapshot.viewMode)} view, saved ${new Date(snapshot.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                                active={!!workspaceSnapshot && workspaceSnapshotKey(workspaceSnapshot) === snapshotKey}
                                onClick={() => handleRestoreNamedWorkspaceSnapshot(snapshot)}
                              />
                              <TopBarMenuItem
                                label={`Rename workspace: ${snapshotName}`}
                                icon={<NotePencil size={14} />}
                                detail="Rename this local layout preset."
                                onClick={() => handleRenameWorkspaceSnapshot(snapshot)}
                              />
                              <TopBarMenuItem
                                label={`Delete workspace: ${snapshotName}`}
                                icon={<Trash size={14} />}
                                detail="Remove this local workspace preset."
                                tone="danger"
                                onClick={() => handleDeleteWorkspaceSnapshot(snapshot)}
                              />
                            </Fragment>
                          )
                        })}
                      </>
                    )}
                    <TopBarMenuSection label="Pinned sync" />
                    <TopBarMenuItem
                      label={pinnedNotesSyncLabel}
                      icon={pinnedNotesSyncState === 'error' ? <CloudSlash size={14} /> : <Cloud size={14} />}
                      detail={pinnedNotesSyncDetail}
                      disabled
                    />
                    {pinnedNotesSyncState === 'error' && (
                      <TopBarMenuItem
                        label="Retry pinned-note sync"
                        icon={<ArrowClockwise size={14} />}
                        detail="Write local pinned notes to the hidden vault sync note."
                        onClick={handleRetryPinnedNotesSync}
                      />
                    )}
                    {pinnedWorkspaceNotes.length > 0 && (
                      <>
                        <TopBarMenuSection label="Pinned notes" />
                        {pinnedWorkspaceNotes.map(note => (
                          <TopBarMenuItem
                            key={`workspace-pinned-${note._id}`}
                            label={note.title || 'Untitled'}
                            icon={<Star size={14} />}
                            detail={note.folder || 'Vault root'}
                            active={selectedId === note._id}
                            onClick={() => handleOpenWorkspaceNote(note._id)}
                          />
                        ))}
                      </>
                    )}
                    {recentWorkspaceNotes.length > 0 && (
                      <>
                        <TopBarMenuSection label="Recent notes" />
                        {recentWorkspaceNotes.map(note => (
                          <TopBarMenuItem
                            key={`workspace-recent-${note._id}`}
                            label={note.title || 'Untitled'}
                            icon={<NotePencil size={14} />}
                            detail={note.folder || 'Vault root'}
                            active={selectedId === note._id}
                            onClick={() => handleOpenWorkspaceNote(note._id)}
                          />
                        ))}
                      </>
                    )}
                  </TopBarMenuButton>
                  <TopBarMenuButton
                    label="Note status"
                    icon={noteStatusIcon}
                    text={noteStatusTriggerLabel}
                    tone={noteStatusTone}
                    menuAlign="left"
                    searchable
                    searchLabel="Filter note status"
                    searchPlaceholder="Filter status..."
                    open={topBarMenu === 'status'}
                    onToggle={() => setTopBarMenu(topBarMenu === 'status' ? null : 'status')}
                  >
                    <TopBarMenuSection label="Local save" />
                    <TopBarMenuItem
                      label={saveLabel}
                      icon={<Cloud size={14} />}
                      detail={saveDetail}
                      disabled
                    />
                    {pendingLocalEditCount > 0 && (
                      <TopBarMenuItem
                        label={`${pendingLocalEditCount} queued local edit${pendingLocalEditCount === 1 ? '' : 's'}`}
                        icon={<FileText size={14} />}
                        detail={queuedEditDetail}
                        disabled
                      />
                    )}
                    {pendingLocalEditCount > 0 && (
                      <TopBarMenuItem
                        label="Review queued edits"
                        icon={<FileText size={14} />}
                        detail="Inspect local-only notes, save errors, and retry paths."
                        onClick={() => runStatusAction('queued-edits')}
                      />
                    )}
                    {networkOnline && pendingLocalEditCount > 0 && (
                      <TopBarMenuItem
                        label="Retry queued save"
                        icon={<Cloud size={14} />}
                        detail="Flush queued local edits without naming a version checkpoint."
                        onClick={() => runStatusAction('retry-save')}
                      />
                    )}
                    {selected?.type === 'note' && (
                      <TopBarMenuItem
                        label="Save current note"
                        icon={<Cloud size={14} />}
                        detail={networkOnline ? 'Flush pending edits and name a version checkpoint.' : 'Reconnect before flushing queued edits or naming a version checkpoint.'}
                        disabled={!networkOnline}
                        onClick={() => runStatusAction('manual-save')}
                      />
                    )}
                    <TopBarMenuSection label="Vault sync" />
                    {knownSyncConflictCount > 0 && (
                      <TopBarMenuItem
                        label={knownSyncConflictActionLabel}
                        icon={<ShieldCheck size={14} />}
                        detail="Open diagnostics to compare remote changes, keep local, or create a reviewed merge suggestion."
                        tone="danger"
                        onClick={() => runStatusAction('vault-status')}
                      />
                    )}
                    <TopBarMenuItem
                      label={!networkOnline ? 'Offline mode' : syncing ? 'Vault sync running' : error ? 'Vault sync unavailable' : 'Vault sync ready'}
                      icon={!networkOnline ? <CloudSlash size={14} /> : <Cloud size={14} />}
                      detail={!networkOnline ? 'Edits stay local and sync resumes when the device is online.' : error || 'Local vault cache and remote state are available.'}
                      disabled
                    />
                    <TopBarMenuItem
                      label="Refresh notes from vault"
                      icon={<ArrowClockwise size={14} />}
                      detail="Reload local vault documents now, including note bodies and folders."
                      onClick={() => runStatusAction('refresh-vault')}
                    />
                    <TopBarMenuItem label="Sync diagnostics" icon={<ShieldCheck size={14} />} detail="Inspect local save queue, sync ledger, and vault privacy status." onClick={() => runStatusAction('vault-status')} />
                    <TopBarMenuItem label="Recovered drafts" icon={<FileText size={14} />} detail={`${recoverableDraftCount} unsynced local draft${recoverableDraftCount === 1 ? '' : 's'}`} onClick={() => runStatusAction('recovered-drafts')} />
                    {selected?.type === 'note' && localCollabSupported && (
                      <>
                        <TopBarMenuSection label="Collaboration" />
                        <TopBarMenuItem
                          label={localCollabSyncing ? 'Collab syncing...' : `Sync local collab (${localCollabProviderSummary.label})`}
                          icon={<Cloud size={14} />}
                          detail={localCollabLastSyncError || localCollabProviderSummary.detail || 'Layered local and remote collaboration transports.'}
                          disabled={localCollabSyncing}
                          onClick={() => runStatusAction('sync')}
                        />
                        {localCollabPeers.length > 0 && (
                          <TopBarMenuItem
                            label={`${localCollabPeers.length} local editor${localCollabPeers.length === 1 ? '' : 's'}`}
                            icon={<ChatCircleText size={14} />}
                            detail={localCollabPeers.map(peer => peer.name).join(', ')}
                            disabled
                          />
                        )}
                        {localCollabDrafts.length > 0 && (
                          <TopBarMenuItem
                            label={`Review ${localCollabDrafts.length} incoming draft${localCollabDrafts.length === 1 ? '' : 's'}`}
                            icon={<FileText size={14} />}
                            onClick={() => runStatusAction('drafts')}
                          />
                        )}
                      </>
                    )}
                  </TopBarMenuButton>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: '0 0 auto', minWidth: 0, marginLeft: 'auto' }}>
              {compactTopBarActions ? (
	                <TopBarMenuButton
	                  label="Note tools"
	                  icon={<DotsThree size={16} weight="bold" />}
	                  tone={compactNoteToolsTone}
	                  title={compactNoteToolsTitle}
	                  description={compactNoteToolsDescription}
	                  indicatorTone={compactNoteToolsTone === 'default' ? undefined : compactNoteToolsTone}
	                  searchable
	                  quickFilters={[
	                    { label: 'Status', query: 'Status and sync' },
	                    { label: 'Current', query: 'Current note' },
	                    { label: 'Workspace', query: 'Workspace' },
	                    { label: 'Create', query: 'Create' },
	                    { label: 'View', query: 'View' },
	                    { label: 'Export', query: 'Export and share' },
	                  ]}
	                  searchLabel="Filter note tools"
	                  searchPlaceholder="Filter actions..."
	                  open={topBarMenu === 'note-tools'}
	                  onToggle={() => setTopBarMenu(topBarMenu === 'note-tools' ? null : 'note-tools')}
	                >
                  <TopBarMenuSection label="Status and sync" />
                  <TopBarMenuItem
                    label={saveLabel}
                    icon={<Cloud size={14} />}
                    detail={saveDetail}
                    disabled
                  />
                  {pendingLocalEditCount > 0 && (
                    <TopBarMenuItem
                      label={`${pendingLocalEditCount} queued local edit${pendingLocalEditCount === 1 ? '' : 's'}`}
                      icon={<FileText size={14} />}
                      detail={queuedEditDetail}
                      disabled
                    />
                  )}
                  {pendingLocalEditCount > 0 && (
                    <TopBarMenuItem
                      label="Review queued edits"
                      icon={<FileText size={14} />}
                      detail="Inspect local-only notes, save errors, and retry paths."
                      onClick={() => runStatusAction('queued-edits')}
                    />
                  )}
                  {networkOnline && pendingLocalEditCount > 0 && (
                    <TopBarMenuItem
                      label="Retry queued save"
                      icon={<Cloud size={14} />}
                      detail="Flush queued local edits without naming a version checkpoint."
                      onClick={() => runStatusAction('retry-save')}
                    />
                  )}
                  {selected?.type === 'note' && (
                    <TopBarMenuItem
                      label="Save current note"
                      icon={<Cloud size={14} />}
                      detail={networkOnline ? 'Flush pending edits and name a version checkpoint.' : 'Reconnect before flushing queued edits or naming a version checkpoint.'}
                      disabled={!networkOnline}
                      onClick={() => runStatusAction('manual-save')}
                    />
                  )}
                  {knownSyncConflictCount > 0 && (
                    <TopBarMenuItem
                      label={knownSyncConflictActionLabel}
                      icon={<ShieldCheck size={14} />}
                      detail="Open diagnostics to compare remote changes, keep local, or create a reviewed merge suggestion."
                      tone="danger"
                      onClick={() => runStatusAction('vault-status')}
                    />
                  )}
                  <TopBarMenuItem
                    label={!networkOnline ? 'Offline mode' : syncing ? 'Vault sync running' : error ? 'Vault sync unavailable' : 'Vault sync ready'}
                    icon={!networkOnline ? <CloudSlash size={14} /> : <Cloud size={14} />}
                    detail={!networkOnline ? 'Edits stay local and sync resumes when the device is online.' : error || 'Local vault cache and remote state are available.'}
                    disabled
                  />
                  {workspaceSyncState === 'error' && (
                    <>
                      <TopBarMenuItem
                        label="Workspace sync issue"
                        icon={<CloudSlash size={14} />}
                        detail={workspaceSyncDetail}
                        tone="danger"
                        disabled
                      />
                      <TopBarMenuItem
                        label="Retry workspace sync"
                        icon={<ArrowClockwise size={14} />}
                        detail="Write local workspace presets to the hidden vault sync note."
                        onClick={handleRetryWorkspaceSync}
                      />
                    </>
                  )}
                  {pinnedNotesSyncState === 'error' && (
                    <>
                      <TopBarMenuItem
                        label="Pinned-note sync issue"
                        icon={<CloudSlash size={14} />}
                        detail={pinnedNotesSyncDetail}
                        tone="danger"
                        disabled
                      />
                      <TopBarMenuItem
                        label="Retry pinned-note sync"
                        icon={<ArrowClockwise size={14} />}
                        detail="Write local pinned notes to the hidden vault sync note."
                        onClick={handleRetryPinnedNotesSync}
                      />
                    </>
                  )}
                  {savedSearchSyncState === 'error' && (
                    <>
                      <TopBarMenuItem
                        label="Saved-search sync issue"
                        icon={<CloudSlash size={14} />}
                        detail={savedSearchSyncDetail}
                        tone="danger"
                        disabled
                      />
                      <TopBarMenuItem
                        label="Retry saved-search sync"
                        icon={<ArrowClockwise size={14} />}
                        detail="Write local saved searches to the hidden vault sync note."
                        onClick={handleRetrySavedSearchSync}
                      />
                    </>
                  )}
                  {editorPreferencesSyncState === 'error' && (
                    <>
                      <TopBarMenuItem
                        label="Editor preferences sync issue"
                        icon={<CloudSlash size={14} />}
                        detail={editorPreferencesSyncDetail}
                        tone="danger"
                        disabled
                      />
                      <TopBarMenuItem
                        label="Retry editor preferences sync"
                        icon={<ArrowClockwise size={14} />}
                        detail="Write local editor preferences to the hidden vault sync note."
                        onClick={handleRetryEditorPreferencesSync}
                      />
                    </>
                  )}
                  <TopBarMenuItem
                    label="Refresh notes from vault"
                    icon={<ArrowClockwise size={14} />}
                    detail="Reload local vault documents now, including note bodies and folders."
                    onClick={() => runStatusAction('refresh-vault')}
                  />
                  <TopBarMenuItem label="Sync diagnostics" icon={<ShieldCheck size={14} />} detail="Inspect local save queue, sync ledger, and vault privacy status." onClick={() => runStatusAction('vault-status')} />
                  <TopBarMenuItem label="Recovered drafts" icon={<FileText size={14} />} detail={`${recoverableDraftCount} unsynced local draft${recoverableDraftCount === 1 ? '' : 's'}`} onClick={() => runStatusAction('recovered-drafts')} />
                  {selected?.type === 'note' && localCollabSupported && (
                    <>
                      <TopBarMenuSection label="Collaboration" />
                      <TopBarMenuItem
                        label={localCollabSyncing ? 'Collab syncing...' : `Sync local collab (${localCollabProviderSummary.label})`}
                        icon={<Cloud size={14} />}
                        detail={localCollabLastSyncError || localCollabProviderSummary.detail || 'Layered local and remote collaboration transports.'}
                        disabled={localCollabSyncing}
                        onClick={() => runStatusAction('sync')}
                      />
                      {localCollabPeers.length > 0 && (
                        <TopBarMenuItem
                          label={`${localCollabPeers.length} local editor${localCollabPeers.length === 1 ? '' : 's'}`}
                          icon={<ChatCircleText size={14} />}
                          detail={localCollabPeers.map(peer => peer.name).join(', ')}
                          disabled
                        />
                      )}
                      {localCollabDrafts.length > 0 && (
                        <TopBarMenuItem
                          label={`Review ${localCollabDrafts.length} incoming draft${localCollabDrafts.length === 1 ? '' : 's'}`}
                          icon={<FileText size={14} />}
                          onClick={() => runStatusAction('drafts')}
                        />
                      )}
                    </>
                  )}
                  {selected && (
                    <>
                      <TopBarMenuSection label="Current note" />
                      <TopBarMenuItem
                        label={selected.title || 'Untitled'}
                        icon={<FileText size={14} />}
                        detail={selected._id}
                        disabled
                      />
                      <TopBarMenuItem
                        label={selectedFolderLabel}
                        icon={<FolderOpen size={14} />}
                        detail={selected.type === 'attachment' ? 'Attachment folder' : 'Folder'}
                        disabled
                      />
                      {selected.type === 'note' && (
                        <>
                          <TopBarMenuItem
                            label="Rename note"
                            icon={<NotePencil size={14} />}
                            onClick={() => {
                              setTopBarMenu(null)
                              setTitleDraft(selected.title)
                              setEditingTitle(true)
                              setTimeout(() => titleRef.current?.focus(), 20)
                            }}
                          />
                          <TopBarMenuItem label={pinnedNoteSet.has(selected._id) ? 'Unpin current note' : 'Pin current note'} icon={<Star size={14} />} onClick={() => runMoreAction('pin')} />
                          <TopBarMenuItem
                            label="Reveal in file tree"
                            icon={<FolderOpen size={14} />}
                            detail={focusMode ? 'Show the file tree with this note selected.' : selected.folder || 'Vault root'}
                            onClick={() => runMoreAction('reveal-file-tree')}
                          />
                          <TopBarMenuItem
                            label="Open in side pane"
                            icon={<SquaresFour size={14} />}
                            detail="Split this note beside the editor."
                            onClick={() => runMoreAction('open-current-side-pane')}
                          />
                          <TopBarMenuSection label="Copy links" />
                          <TopBarMenuItem label="Copy wikilink" icon={<Copy size={14} />} onClick={() => runMoreAction('copy-wikilink')} />
                          <TopBarMenuItem label="Copy note embed" icon={<Copy size={14} />} onClick={() => runMoreAction('copy-embed')} />
                          <TopBarMenuItem label="Copy note path" icon={<Copy size={14} />} onClick={() => runMoreAction('copy-path')} />
                          <TopBarMenuSection label="References" />
                          <TopBarMenuItem label="Open references" icon={<GitBranch size={14} />} onClick={() => runMoreAction('references')} />
                          <TopBarMenuItem label="Open local graph" icon={<GitBranch size={14} />} onClick={() => runMoreAction('local-graph')} />
                          <TopBarMenuItem label="Insert block ID" icon={<GitBranch size={14} />} onClick={() => runMoreAction('insert-block-id')} />
                          <TopBarMenuItem label="Copy block reference" icon={<Copy size={14} />} onClick={() => runMoreAction('copy-block-reference')} />
                          <TopBarMenuItem label="Copy heading reference" icon={<Copy size={14} />} onClick={() => runMoreAction('copy-heading-reference')} />
                        </>
                      )}
                    </>
                  )}
                  <TopBarMenuSection label="Workspace" />
                  <TopBarMenuItem
                    label="Open command palette"
                    icon={<ListBullets size={14} />}
                    detail="Search notes, run commands, and jump across the vault."
                    onClick={() => {
                      setCommandOpen(true)
                      setCommandQuery('')
                      setTopBarMenu(null)
                    }}
                  />
                  <TopBarMenuItem
                    label="Keyboard shortcuts"
                    icon={<FileText size={14} />}
                    detail="Open the Notes shortcut reference."
                    onClick={() => {
                      setShortcutsOpen(true)
                      setTopBarMenu(null)
                    }}
                  />
                  <TopBarMenuItem
                    label={focusMode ? 'Show file tree' : 'Hide file tree'}
                    icon={<PenNib size={14} />}
                    detail={focusMode ? 'Bring back the file tree sidebar.' : 'Enter a cleaner writing layout.'}
                    onClick={() => {
                      setFocusMode(prev => !prev)
                      setTopBarMenu(null)
                    }}
                  />
                  {!focusMode && (
                    <>
                      <TopBarMenuItem
                        label="Narrow file tree"
                        icon={<FolderOpen size={14} />}
                        detail={`${treeWidth}px wide`}
                        onClick={() => handleAdjustFileTreeWidth('narrow')}
                      />
                      <TopBarMenuItem
                        label="Widen file tree"
                        icon={<FolderOpen size={14} />}
                        detail={`${treeWidth}px wide`}
                        onClick={() => handleAdjustFileTreeWidth('widen')}
                      />
                      <TopBarMenuItem
                        label="Reset file tree width"
                        icon={<FolderOpen size={14} />}
                        detail={`${DEFAULT_FILE_TREE_WIDTH}px default`}
                        onClick={() => handleAdjustFileTreeWidth('reset')}
                      />
                    </>
                  )}
                  <TopBarMenuItem
                    label={infoPanelOpen ? 'Hide document info' : 'Show document info'}
                    icon={<FileText size={14} />}
                    detail={selected ? 'Toggle the right document metadata sidebar.' : 'Select a note to inspect metadata.'}
                    disabled={!selected}
                    onClick={() => {
                      setInfoPanelOpen(prev => !prev)
                      setTopBarMenu(null)
                    }}
                  />
                  <TopBarMenuItem
                    label="Close sidebars"
                    icon={<PenNib size={14} />}
                    detail="Hide the file tree and document info sidebars."
                    onClick={() => {
                      setFocusMode(true)
                      setInfoPanelOpen(false)
                      setTopBarMenu(null)
                    }}
                  />
                  {workspaceSidePaneNote && (
                    <>
                      <TopBarMenuItem
                        label="Swap primary and side pane"
                        icon={<SquaresFour size={14} />}
                        detail={workspaceSidePaneNote.title || workspaceSidePaneNote._id}
                        onClick={handlePromoteWorkspaceSidePane}
                      />
                      <TopBarMenuItem
                        label="Close side pane"
                        icon={<X size={14} />}
                        detail={workspaceSidePaneNote.title || workspaceSidePaneNote._id}
                        onClick={handleCloseWorkspaceSidePane}
                      />
                      <TopBarMenuItem
                        label="Narrow side pane"
                        icon={<SquaresFour size={14} />}
                        detail={`${workspaceSidePanePixelWidth}px wide`}
                        onClick={() => handleAdjustWorkspaceSidePaneWidth('narrow')}
                      />
                      <TopBarMenuItem
                        label="Widen side pane"
                        icon={<SquaresFour size={14} />}
                        detail={`${workspaceSidePanePixelWidth}px wide`}
                        onClick={() => handleAdjustWorkspaceSidePaneWidth('widen')}
                      />
                      <TopBarMenuItem
                        label="Reset side pane width"
                        icon={<SquaresFour size={14} />}
                        detail={`${DEFAULT_WORKSPACE_SIDE_PANE_WIDTH}px default`}
                        onClick={() => handleAdjustWorkspaceSidePaneWidth('reset')}
                      />
                    </>
                  )}
                  {workspaceTabNotes.length > 0 && (
                    <>
                      <TopBarMenuSection label="Open tabs" />
                      {workspaceTabNotes.map(note => {
                        const isActivePrimaryNote = selectedId === note._id
                        return (
                          <Fragment key={`compact-workspace-tab-${note._id}`}>
                              <TopBarMenuItem
                                label={`Switch tab: ${note.title || 'Untitled'}`}
                                icon={<FileText size={14} />}
                                detail={workspaceTabNotes.length > 1 ? `${note.folder || 'Vault root'} · Drag or Alt+Up/Down to reorder` : note.folder || 'Vault root'}
                                active={isActivePrimaryNote}
                                draggable={workspaceTabNotes.length > 1}
                                onDragStart={event => {
                                  event.dataTransfer.setData(WORKSPACE_TAB_DRAG_TYPE, note._id)
                                  event.dataTransfer.effectAllowed = 'move'
                                }}
                                onDragOver={event => {
                                  if (workspaceTabNotes.length <= 1) return
                                  event.preventDefault()
                                  event.dataTransfer.dropEffect = 'move'
                                }}
                                onDrop={event => {
                                  event.preventDefault()
                                  handleReorderWorkspaceTab(event.dataTransfer.getData(WORKSPACE_TAB_DRAG_TYPE), note._id)
                                }}
                                onKeyDown={event => {
                                  if (!event.altKey || workspaceTabNotes.length <= 1) return
                                  if (event.key === 'ArrowUp') {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    handleMoveWorkspaceTab(note._id, 'earlier')
                                  }
                                  if (event.key === 'ArrowDown') {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    handleMoveWorkspaceTab(note._id, 'later')
                                  }
                                }}
                                onClick={() => handleOpenWorkspaceNote(note._id)}
                              />
                            <TopBarMenuItem
                              label={`Open in side pane: ${note.title || 'Untitled'}`}
                              icon={<SquaresFour size={14} />}
                              detail={isActivePrimaryNote ? 'Split the current note to the side.' : note.folder || 'Vault root'}
                              active={workspaceSidePaneNote?._id === note._id}
                              onClick={() => handleOpenWorkspaceSidePane(note._id)}
                            />
                            <TopBarMenuItem
                              label={`Close tab: ${note.title || 'Untitled'}`}
                              icon={<DotsThree size={14} />}
                              detail="Remove from this local workspace stack."
                              onClick={() => handleCloseWorkspaceTab(note._id)}
                            />
                          </Fragment>
                        )
                      })}
                      {selectedId && workspaceTabNotes.length > 1 && (
                        <>
                          <TopBarMenuItem
                            label="Move current tab earlier"
                            icon={<DotsThree size={14} />}
                            detail="Reorder the active tab toward the top."
                            onClick={() => handleMoveWorkspaceTab(selectedId, 'earlier')}
                          />
                          <TopBarMenuItem
                            label="Move current tab later"
                            icon={<DotsThree size={14} />}
                            detail="Reorder the active tab toward the bottom."
                            onClick={() => handleMoveWorkspaceTab(selectedId, 'later')}
                          />
                          <TopBarMenuItem
                            label="Close other tabs"
                            icon={<DotsThree size={14} />}
                            detail="Keep the active note tab in this workspace."
                            onClick={handleCloseOtherWorkspaceTabs}
                          />
                        </>
                      )}
                      <TopBarMenuItem
                        label="Close all tabs"
                        icon={<DotsThree size={14} />}
                        detail="Clear this local workspace tab stack."
                        tone="danger"
                        onClick={handleCloseAllWorkspaceTabs}
                      />
                    </>
                  )}
                  <TopBarMenuSection label="Workspace snapshot" />
                  <TopBarMenuItem
                    label="Save current workspace"
                    icon={<ShieldCheck size={14} />}
                    detail="Capture view, sidebar, info panel, width, and active note."
                    onClick={handleSaveWorkspaceSnapshot}
                  />
                  <TopBarMenuItem
                    label="Restore saved workspace"
                    icon={<UploadSimple size={14} />}
                    detail={workspaceSnapshot ? `Saved ${new Date(workspaceSnapshot.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'No saved workspace yet.'}
                    disabled={!workspaceSnapshot}
                    onClick={handleRestoreWorkspaceSnapshot}
                  />
                  <TopBarMenuItem
                    label={workspaceSyncLabel}
                    icon={workspaceSyncState === 'error' ? <CloudSlash size={14} /> : <Cloud size={14} />}
                    detail={workspaceSyncDetail}
                    disabled
                  />
                  {normalizedWorkspaceSnapshots.length > 0 && (
                    <>
                      <TopBarMenuSection label="Saved workspaces" />
                      {normalizedWorkspaceSnapshots.map(snapshot => {
                        const snapshotName = snapshot.name || `${viewModeLabel(snapshot.viewMode)} workspace`
                        const snapshotKey = workspaceSnapshotKey(snapshot)
                        return (
                          <Fragment key={`compact-workspace-snapshot-${snapshotKey}`}>
                            <TopBarMenuItem
                              label={`Restore workspace: ${snapshotName}`}
                              icon={<UploadSimple size={14} />}
                              detail={`${viewModeLabel(snapshot.viewMode)} view, saved ${new Date(snapshot.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                              active={!!workspaceSnapshot && workspaceSnapshotKey(workspaceSnapshot) === snapshotKey}
                              onClick={() => handleRestoreNamedWorkspaceSnapshot(snapshot)}
                            />
                            <TopBarMenuItem
                              label={`Rename workspace: ${snapshotName}`}
                              icon={<NotePencil size={14} />}
                              detail="Rename this local layout preset."
                              onClick={() => handleRenameWorkspaceSnapshot(snapshot)}
                            />
                            <TopBarMenuItem
                              label={`Delete workspace: ${snapshotName}`}
                              icon={<Trash size={14} />}
                              detail="Remove this local workspace preset."
                              tone="danger"
                              onClick={() => handleDeleteWorkspaceSnapshot(snapshot)}
                            />
                          </Fragment>
                        )
                      })}
                    </>
                  )}
                  <TopBarMenuSection label="Pinned sync" />
                  <TopBarMenuItem
                    label={pinnedNotesSyncLabel}
                    icon={pinnedNotesSyncState === 'error' ? <CloudSlash size={14} /> : <Cloud size={14} />}
                    detail={pinnedNotesSyncDetail}
                    disabled
                  />
                  {pinnedWorkspaceNotes.length > 0 && (
                    <>
                      <TopBarMenuSection label="Pinned notes" />
                      {pinnedWorkspaceNotes.map(note => (
                        <TopBarMenuItem
                          key={`compact-workspace-pinned-${note._id}`}
                          label={note.title || 'Untitled'}
                          icon={<Star size={14} />}
                          detail={note.folder || 'Vault root'}
                          active={selectedId === note._id}
                          onClick={() => handleOpenWorkspaceNote(note._id)}
                        />
                      ))}
                    </>
                  )}
                  {recentWorkspaceNotes.length > 0 && (
                    <>
                      <TopBarMenuSection label="Recent notes" />
                      {recentWorkspaceNotes.map(note => (
                        <TopBarMenuItem
                          key={`compact-workspace-recent-${note._id}`}
                          label={note.title || 'Untitled'}
                          icon={<NotePencil size={14} />}
                          detail={note.folder || 'Vault root'}
                          active={selectedId === note._id}
                          onClick={() => handleOpenWorkspaceNote(note._id)}
                        />
                      ))}
                    </>
                  )}
                  <TopBarMenuSection label="Create" />
                  <TopBarMenuItem label="New note" icon={<NotePencil size={14} />} onClick={() => runMoreAction('new-note')} />
                  <TopBarMenuItem label="New daily note" icon={<NotePencil size={14} />} onClick={() => runMoreAction('daily')} />
                  <TopBarMenuItem label="Yesterday's daily note" icon={<NotePencil size={14} />} onClick={() => runMoreAction('daily-yesterday')} />
                  <TopBarMenuItem label="Tomorrow's daily note" icon={<NotePencil size={14} />} onClick={() => runMoreAction('daily-tomorrow')} />
                  <TopBarMenuItem label="Daily note by date" icon={<NotePencil size={14} />} onClick={() => runMoreAction('daily-date')} />
                  <TopBarMenuItem label="This week note" icon={<NotePencil size={14} />} onClick={() => runMoreAction('weekly')} />
                  <TopBarMenuItem label="This month note" icon={<NotePencil size={14} />} onClick={() => runMoreAction('monthly')} />
                  <TopBarMenuItem label="New folder" icon={<FolderPlus size={14} />} onClick={() => runMoreAction('folder')} />
                  <TopBarMenuItem label="Import clipboard clip" icon={<UploadSimple size={14} />} onClick={() => runMoreAction('clip')} />
                  <TopBarMenuSection label="View" />
                  <TopBarMenuItem label="Editor" icon={<FileText size={14} />} active={viewMode === 'editor'} onClick={() => runViewAction('editor')} />
                  <TopBarMenuItem label="Graph" icon={<GitBranch size={14} />} active={viewMode === 'graph'} onClick={() => runViewAction('graph')} />
                  <TopBarMenuItem label="Data" icon={<Table size={14} />} active={viewMode === 'data'} onClick={() => runViewAction('data')} />
                  <TopBarMenuItem label="Canvas" icon={<SquaresFour size={14} />} active={viewMode === 'canvas'} onClick={() => runViewAction('canvas')} />
                  {selected?.type === 'note' && (
                    <>
                      <TopBarMenuSection label="Review and info" />
                      <TopBarMenuItem label="Open outline" icon={<ListBullets size={14} />} detail={`${selectedOutlineHeadings.length} heading${selectedOutlineHeadings.length === 1 ? '' : 's'}`} onClick={() => runMoreAction('outline')} />
                      <TopBarMenuItem label="Version history" icon={<GitBranch size={14} />} onClick={() => runMoreAction('versions')} />
                      <TopBarMenuItem label="Comments" icon={<ChatCircleText size={14} />} onClick={() => runMoreAction('comments')} />
                      <TopBarMenuItem label="Suggestions" icon={<PenNib size={14} />} onClick={() => runMoreAction('suggest')} />
                      <TopBarMenuItem label="Assist writing" icon={<PenNib size={14} />} onClick={() => runMoreAction('assist-writing')} />
                      <TopBarMenuItem label="Word count" icon={<FileText size={14} />} onClick={() => runMoreAction('word-count')} />
                      <TopBarMenuItem label="Document info" icon={<FileText size={14} />} onClick={() => runMoreAction('info')} />
                      <TopBarMenuSection label="Export and share" />
                      <TopBarMenuItem label="Export DOCX" icon={<FileDoc size={14} />} onClick={() => runMoreAction('docx')} />
                      <TopBarMenuItem label="Print / PDF" icon={<FilePdf size={14} />} onClick={() => runMoreAction('pdf')} />
                      <TopBarMenuItem label="Export Markdown" icon={<FileText size={14} />} onClick={() => runMoreAction('markdown')} />
                      <TopBarMenuItem label="Export HTML" icon={<FileHtml size={14} />} onClick={() => runMoreAction('html')} />
                      <TopBarMenuItem label="Publish static site" icon={<ShareNetwork size={14} />} onClick={() => runMoreAction('publish-site')} />
                      <TopBarMenuItem label="Private share package" icon={<ShareNetwork size={14} />} onClick={() => runMoreAction('share')} />
                    </>
                  )}
                  {selected && <TopBarMenuSection label="Trash" />}
                  {selected && isNoteInTrash(selected) && <TopBarMenuItem label="Restore from Trash" icon={<UploadSimple size={14} />} onClick={() => runMoreAction('restore')} />}
                  {selected && (
                    <TopBarMenuItem
                      label={isNoteInTrash(selected) ? 'Delete permanently' : 'Move to Trash'}
                      icon={<Trash size={14} />}
                      tone="danger"
                      onClick={() => runMoreAction('trash')}
                    />
                  )}
                </TopBarMenuButton>
              ) : (
                <>
                  <TopBarMenuButton
	                    label="Create note actions"
	                    icon={<Plus size={15} weight="bold" />}
	                    searchable
	                    searchLabel="Filter create actions"
	                    searchPlaceholder="Filter create..."
	                    open={topBarMenu === 'create'}
	                    onToggle={() => setTopBarMenu(topBarMenu === 'create' ? null : 'create')}
	                  >
                    <TopBarMenuItem label="New note" icon={<NotePencil size={14} />} onClick={() => runMoreAction('new-note')} />
                    <TopBarMenuItem label="New daily note" icon={<NotePencil size={14} />} onClick={() => runMoreAction('daily')} />
                    <TopBarMenuItem label="Yesterday's daily note" icon={<NotePencil size={14} />} onClick={() => runMoreAction('daily-yesterday')} />
                    <TopBarMenuItem label="Tomorrow's daily note" icon={<NotePencil size={14} />} onClick={() => runMoreAction('daily-tomorrow')} />
                    <TopBarMenuItem label="Daily note by date" icon={<NotePencil size={14} />} onClick={() => runMoreAction('daily-date')} />
                    <TopBarMenuItem label="This week note" icon={<NotePencil size={14} />} onClick={() => runMoreAction('weekly')} />
                    <TopBarMenuItem label="This month note" icon={<NotePencil size={14} />} onClick={() => runMoreAction('monthly')} />
                    <TopBarMenuItem label="New folder" icon={<FolderPlus size={14} />} onClick={() => runMoreAction('folder')} />
                    <TopBarMenuItem label="Import clipboard clip" icon={<UploadSimple size={14} />} onClick={() => runMoreAction('clip')} />
                  </TopBarMenuButton>
                  <TopBarMenuButton
                    label="Notes view"
                    icon={viewModeIcon}
                    open={topBarMenu === 'view'}
                    onToggle={() => setTopBarMenu(topBarMenu === 'view' ? null : 'view')}
                  >
                    <TopBarMenuItem label="Editor" icon={<FileText size={14} />} active={viewMode === 'editor'} onClick={() => runViewAction('editor')} />
                    <TopBarMenuItem label="Graph" icon={<GitBranch size={14} />} active={viewMode === 'graph'} onClick={() => runViewAction('graph')} />
                    <TopBarMenuItem label="Data" icon={<Table size={14} />} active={viewMode === 'data'} onClick={() => runViewAction('data')} />
                    <TopBarMenuItem label="Canvas" icon={<SquaresFour size={14} />} active={viewMode === 'canvas'} onClick={() => runViewAction('canvas')} />
                  </TopBarMenuButton>
	                  <TopBarMenuButton
	                    label="More note actions"
	                    icon={<DotsThree size={16} weight="bold" />}
	                    searchable
	                    searchLabel="Filter more note actions"
	                    searchPlaceholder="Filter actions..."
	                    open={topBarMenu === 'more'}
	                    onToggle={() => setTopBarMenu(topBarMenu === 'more' ? null : 'more')}
	                  >
                    {selected?.type === 'note' && (
                      <>
                      <TopBarMenuSection label="Review and info" />
                      <TopBarMenuItem label="Open outline" icon={<ListBullets size={14} />} detail={`${selectedOutlineHeadings.length} heading${selectedOutlineHeadings.length === 1 ? '' : 's'}`} onClick={() => runMoreAction('outline')} />
                        <TopBarMenuItem label="Version history" icon={<GitBranch size={14} />} onClick={() => runMoreAction('versions')} />
                        <TopBarMenuItem label="Comments" icon={<ChatCircleText size={14} />} onClick={() => runMoreAction('comments')} />
                        <TopBarMenuItem label="Suggestions" icon={<PenNib size={14} />} onClick={() => runMoreAction('suggest')} />
                        <TopBarMenuItem label="Assist writing" icon={<PenNib size={14} />} onClick={() => runMoreAction('assist-writing')} />
                        <TopBarMenuItem label="Word count" icon={<FileText size={14} />} onClick={() => runMoreAction('word-count')} />
                        <TopBarMenuItem label="Document info" icon={<FileText size={14} />} onClick={() => runMoreAction('info')} />
                        <TopBarMenuSection label="Export and share" />
                        <TopBarMenuItem label="Export DOCX" icon={<FileDoc size={14} />} onClick={() => runMoreAction('docx')} />
                        <TopBarMenuItem label="Print / PDF" icon={<FilePdf size={14} />} onClick={() => runMoreAction('pdf')} />
                        <TopBarMenuItem label="Export Markdown" icon={<FileText size={14} />} onClick={() => runMoreAction('markdown')} />
                        <TopBarMenuItem label="Export HTML" icon={<FileHtml size={14} />} onClick={() => runMoreAction('html')} />
                        <TopBarMenuItem label="Publish static site" icon={<ShareNetwork size={14} />} onClick={() => runMoreAction('publish-site')} />
                        <TopBarMenuItem label="Private share package" icon={<ShareNetwork size={14} />} onClick={() => runMoreAction('share')} />
                      </>
                    )}
                    {selected && <TopBarMenuSection label="Trash" />}
                    {selected && isNoteInTrash(selected) && <TopBarMenuItem label="Restore from Trash" icon={<UploadSimple size={14} />} onClick={() => runMoreAction('restore')} />}
                    {selected && (
                      <TopBarMenuItem
                        label={isNoteInTrash(selected) ? 'Delete permanently' : 'Move to Trash'}
                        icon={<Trash size={14} />}
                        tone="danger"
                        onClick={() => runMoreAction('trash')}
                      />
                    )}
                  </TopBarMenuButton>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {notes.length === 0 && unavailableNotes.length > 0 ? (
              <UnavailableNotesState count={unavailableNotes.length} onRetry={() => void refresh()} />
            ) : viewMode === 'editor' ? (
              selected ? (
                selected.type === 'attachment' ? (
                  <AttachmentPreview id={selected._id} />
                ) : (
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ flex: '1 1 58%', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <NoteEditor
                        note={selected}
                        onChange={handleContentChange}
                        onWikilinkClick={handleWikilinkClick}
                        preferences={normalizedEditorPreferences}
                        onSelectionChange={handleSelectionAnchorChange}
                        reviewMarkers={reviewMarkers}
                        activeReviewId={activeReviewId}
                        onReviewMarkerSelect={setActiveReviewId}
                        allNoteTitles={allNoteTitles}
                        allNotes={notes}
                        jumpToLineRequest={editorJumpRequest}
                      />
                      <BacklinksPanel
                        currentNoteTitle={selected.title}
                        allNotes={notes}
                        onNavigate={id => {
                          if (selectedId && selectedId !== id) void flushPendingSave(selectedId)
                          setSelectedId(id)
                          setViewMode('editor')
                        }}
                        onLinkMention={handleLinkUnlinkedMention}
                        onLinkAllMentions={handleLinkAllUnlinkedMentions}
                        collapsed={referencesPanelCollapsed}
                        onCollapsedChange={setReferencesPanelCollapsed}
                        openRequest={backlinksOpenRequest}
                      />
                    </div>
                    {workspaceSidePaneNote && (
                      <>
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          aria-label="Resize workspace side pane"
                          aria-valuemin={MIN_WORKSPACE_SIDE_PANE_WIDTH}
                          aria-valuemax={MAX_WORKSPACE_SIDE_PANE_WIDTH}
                          aria-valuenow={workspaceSidePanePixelWidth}
                          aria-valuetext={`${workspaceSidePanePixelWidth} pixels wide`}
                          tabIndex={0}
                          onMouseDown={handleSidePaneResize}
                          onKeyDown={handleSidePaneResizeKeyDown}
                          style={{
                            width: 6,
                            flex: '0 0 6px',
                            cursor: 'col-resize',
                            borderLeft: '1px solid var(--border)',
                            background: 'transparent',
                          }}
                        />
                        <aside
                          data-testid="workspace-side-pane"
                          aria-label="Workspace side pane"
                          style={{
                            flex: `0 0 ${workspaceSidePanePixelWidth}px`,
                            width: workspaceSidePanePixelWidth,
                            minWidth: MIN_WORKSPACE_SIDE_PANE_WIDTH,
                            maxWidth: MAX_WORKSPACE_SIDE_PANE_WIDTH,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            background: 'var(--bg-base)',
                          }}
                        >
                        <div
                          style={{
                            minHeight: 36,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 8px',
                            borderBottom: '1px solid var(--border)',
                            background: 'color-mix(in srgb, var(--bg-base) 94%, black)',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                color: 'var(--text-primary)',
                                fontSize: 12,
                                fontWeight: 650,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {workspaceSidePaneNote.title || 'Untitled'}
                            </div>
                            <div
                              style={{
                                color: 'var(--text-muted)',
                                fontSize: 10,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {workspaceSidePaneNote.folder || 'Vault root'}
                            </div>
                          </div>
                          <button
                            type="button"
                            aria-label="Make side pane primary"
                            title="Make side pane primary"
                            className="hover-bg"
                            onClick={handlePromoteWorkspaceSidePane}
                            style={{
                              width: 28,
                              height: 28,
                              border: '1px solid transparent',
                              borderRadius: 'var(--radius-sm)',
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                            }}
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Close workspace side pane"
                            title="Close workspace side pane"
                            className="hover-bg"
                            onClick={handleCloseWorkspaceSidePane}
                            style={{
                              width: 28,
                              height: 28,
                              border: '1px solid transparent',
                              borderRadius: 'var(--radius-sm)',
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <NoteEditor
                          note={workspaceSidePaneNote}
                          onChange={handleSidePaneContentChange}
                          onWikilinkClick={handleWikilinkClick}
                          preferences={normalizedEditorPreferences}
                          allNoteTitles={allNoteTitles}
                          allNotes={notes}
                        />
                        </aside>
                      </>
                    )}
                  </div>
                )
              ) : (
                <EmptyState onCreateNote={() => handleCreate()} />
              )
            ) : viewMode === 'graph' ? (
              <Suspense
                fallback={
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
                    Loading graph...
                  </div>
                }
              >
                <GraphView notes={notes} selectedId={selectedId} onSelectNote={handleGraphSelect} />
              </Suspense>
            ) : viewMode === 'canvas' ? (
              <Suspense
                fallback={
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
                    Loading canvas...
                  </div>
                }
              >
                <CanvasView
                  notes={notes}
                  boardNote={canvasBoardNote}
                  selectedId={selectedId}
                  onSelectNote={handleGraphSelect}
                  onSaveBoard={handleSaveCanvasBoard}
                  onCreateBoard={handleCreateCanvasBoard}
                />
              </Suspense>
            ) : (
              <VaultDataView
                notes={notes}
                query={searchQuery}
                syncPresets
                workspaceContext={dataWorkspaceContext}
                onWorkspaceContextChange={setDataWorkspaceContext}
                onToggleTask={handleToggleTaskDone}
                onSelect={id => {
                  if (selectedId && selectedId !== id) void flushPendingSave(selectedId)
                  setSelectedId(id)
                  setViewMode('editor')
                }}
              />
            )}
            {infoPanelOpen && selected && (
              <DocumentInfoPanel
                note={selected}
                onClose={() => setInfoPanelOpen(false)}
                onSetProperty={(key, value) => {
                  void saveDocumentProperty(key, value)
                }}
                onRenameProperty={key => {
                  handleRenameDocumentProperty(key)
                }}
                onRemoveProperty={key => {
                  void saveDocumentProperty(key, '', 'remove')
                }}
                onOpenAllProperties={() => setPropertiesIndexOpen(true)}
              />
            )}
          </div>
        </div>
      </div>
      {commandOpen && (
        <NotesCommandPalette
          query={commandQuery}
          items={commandItems}
          onQueryChange={setCommandQuery}
          onClose={() => setCommandOpen(false)}
        />
      )}
      {historyOpen && (
        <VersionHistoryDialog
          noteTitle={selected?.title || 'Note'}
          currentContent={selected?.content || ''}
          revisions={historyRevisions}
          preview={historyPreview}
          loading={historyLoading}
          error={historyError}
          onCreateCheckpoint={handleCreateVersionCheckpoint}
          onPreview={handlePreviewRevision}
          onRename={handleRenameRevision}
          onCopyToCurrent={handleCopyRevisionToCurrent}
          onRestore={handleRestoreRevision}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      {versionNameRequest && (
        <VersionNameDialog
          request={versionNameRequest}
          loading={historyLoading}
          onSubmit={name => {
            void handleSubmitVersionName(name)
          }}
          onCancel={() => setVersionNameRequest(null)}
        />
      )}
      {documentPropertyRequest && (
        <DocumentPropertyDialog
          request={documentPropertyRequest}
          onSubmit={(key, value, sourceKey) => {
            void handleSubmitDocumentProperty(key, value, sourceKey)
          }}
          onCancel={() => setDocumentPropertyRequest(null)}
        />
      )}
      {reviewPackageRequest && (
        <ReviewPackageDialog
          request={reviewPackageRequest}
          onSubmit={(permission, recipient) => {
            void handleSubmitReviewPackage(permission, recipient)
          }}
          onCancel={() => setReviewPackageRequest(null)}
        />
      )}
      {pluginMarketplaceFeedRequest && (
        <PluginMarketplaceFeedDialog
          request={pluginMarketplaceFeedRequest}
          onSubmit={url => {
            void handleSubmitPluginMarketplaceFeed(url)
          }}
          onCancel={() => setPluginMarketplaceFeedRequest(null)}
        />
      )}
      {encryptedBackupRequest && (
        <EncryptedBackupPasswordDialog
          request={encryptedBackupRequest}
          onSubmit={password => {
            if (encryptedBackupRequest.mode === 'export') {
              void handleSubmitEncryptedBackup(password)
            } else {
              void handleSubmitEncryptedVaultImport(password)
            }
          }}
          onCancel={() => setEncryptedBackupRequest(null)}
        />
      )}
      {confirmActionRequest && (
        <ConfirmActionDialog
          request={confirmActionRequest}
          onCancel={() => setConfirmActionRequest(null)}
          onSettled={() => setConfirmActionRequest(null)}
        />
      )}
      {noticeRequest && (
        <NoticeDialog
          request={noticeRequest}
          onClose={() => setNoticeRequest(null)}
        />
      )}
      {commentsOpen && (
        <CommentsDialog
          noteTitle={selected?.title || 'Note'}
          comments={noteComments}
          loading={commentsLoading}
          error={commentsError}
          onAdd={handleAddComment}
          onResolve={handleResolveComment}
          onReply={handleReplyToComment}
          onDraftReply={handleDraftReplyToComment}
          onJump={handleJumpToReviewAnchor}
          onClose={() => setCommentsOpen(false)}
        />
      )}
      {commentComposeRequest && (
        <CommentComposeDialog
          request={commentComposeRequest}
          loading={commentsLoading}
          onSubmit={body => {
            void handleSubmitCommentCompose(body)
          }}
          onCancel={() => setCommentComposeRequest(null)}
        />
      )}
      {suggestionsOpen && (
        <SuggestionsDialog
          noteTitle={selected?.title || 'Note'}
          suggestions={noteSuggestions}
          comments={noteComments}
          loading={suggestionsLoading}
          error={suggestionsError}
          onAdd={handleAddSuggestion}
          onComment={handleCommentOnSuggestion}
          onResolveComment={handleResolveComment}
          onReplyToComment={handleReplyToComment}
          onDraftReplyToComment={handleDraftReplyToComment}
          onApply={handleApplySuggestion}
          onReject={handleRejectSuggestion}
          onApplyAll={handleApplyAllSuggestions}
          onRejectAll={handleRejectAllSuggestions}
          onJump={handleJumpToReviewAnchor}
          onClose={() => setSuggestionsOpen(false)}
        />
      )}
      {suggestionComposeRequest && (
        <SuggestionComposeDialog
          request={suggestionComposeRequest}
          loading={suggestionsLoading}
          onSubmit={(content, body) => {
            void handleSubmitSuggestionCompose(content, body)
          }}
          onCancel={() => setSuggestionComposeRequest(null)}
        />
      )}
      {writingAssistRequest && (
        <WritingAssistDialog
          request={writingAssistRequest}
          defaultControls={writingAssistDefaults}
          loading={suggestionsLoading}
          error={suggestionsError}
          onControlsChange={updateWritingAssistDefaults}
          onCreate={option => {
            void handleCreateWritingAssistSuggestion(option)
          }}
          onCancel={() => setWritingAssistRequest(null)}
        />
      )}
      {vaultStatusOpen && (
        <VaultStatusDialog
          status={vaultStatus}
          auditEvents={vaultAuditEvents}
          syncLedger={vaultSyncLedger}
          notes={notes}
          loading={vaultStatusLoading}
          error={vaultStatusError}
          onRefresh={handleOpenVaultStatus}
          onOpenNote={handleOpenDiagnosticsNote}
          onSuggestRemote={handleSuggestRemoteConflictVersion}
          onReviewMerge={handleReviewSyncConflictMerge}
          onKeepLocal={handleKeepLocalSyncConflictVersion}
          onClose={() => setVaultStatusOpen(false)}
        />
      )}
      {mergeConflictReviewRequest && (
        <SyncConflictMergeDialog
          request={mergeConflictReviewRequest}
          saving={suggestionsLoading}
          onCreate={content => {
            void handleSubmitSyncConflictMergeReview(content)
          }}
          onCancel={() => setMergeConflictReviewRequest(null)}
        />
      )}
      {queuedEditsOpen && (
        <QueuedEditsDialog
          edits={pendingLocalEdits}
          online={networkOnline}
          saving={saveState === 'saving'}
          onRetry={() => void handleRetryQueuedSave()}
          onOpenNote={handleOpenQueuedEdit}
          onOpenDiagnostics={() => {
            setQueuedEditsOpen(false)
            void handleOpenVaultStatus()
          }}
          onClose={() => setQueuedEditsOpen(false)}
        />
      )}
      {shortcutsOpen && <NotesShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      {wordCountOpen && selectedWordStats && (
        <TopBarWordCountDialog
          stats={selectedWordStats}
          selectionStats={selectedWordSelectionStats}
          onClose={() => setWordCountOpen(false)}
        />
      )}
      {propertiesIndexOpen && (
        <AllPropertiesDialog
          notes={notes}
          onOpenNote={id => {
            setPropertiesIndexOpen(false)
            if (selectedId && selectedId !== id) void flushPendingSave(selectedId)
            setSelectedId(id)
            setViewMode('editor')
          }}
          onEditProperty={(noteId, key) => handleOpenIndexedDocumentProperty(noteId, key, 'set')}
          onRenameProperty={(noteId, key) => handleOpenIndexedDocumentProperty(noteId, key, 'rename')}
          onRemoveProperty={(noteId, key) => handleOpenIndexedDocumentProperty(noteId, key, 'remove')}
          onClose={() => setPropertiesIndexOpen(false)}
        />
      )}
      {tagsIndexOpen && (
        <AllTagsDialog
          notes={notes}
          onOpenNote={id => {
            setTagsIndexOpen(false)
            if (selectedId && selectedId !== id) void flushPendingSave(selectedId)
            setSelectedId(id)
            setViewMode('editor')
          }}
          onRenameTag={tag => {
            setTagsIndexOpen(false)
            handleRenameTag(tag)
          }}
          onRemoveTag={tag => {
            setTagsIndexOpen(false)
            handleRemoveTag(tag)
          }}
          currentNote={selected?.type === 'note' ? selected : null}
          onApplyTagToCurrent={tag => {
            void handleApplyTagToCurrentNote(tag)
          }}
          onFilterTag={tag => {
            setTagsIndexOpen(false)
            setSearchQuery(`tag:${tag}`)
          }}
          onClose={() => setTagsIndexOpen(false)}
        />
      )}
      {activeOutlineOpen && selected?.type === 'note' && (
        <ActiveNoteOutlineDialog
          noteTitle={selected.title || 'Untitled'}
          headings={selectedOutlineHeadings}
          onJump={handleJumpToOutlineHeading}
          onClose={() => setActiveOutlineOpen(false)}
        />
      )}
      {dailyDatePickerOpen && (
        <DailyDatePickerDialog
          preferences={normalizedEditorPreferences}
          onOpenDate={date => {
            setDailyDatePickerOpen(false)
            void handleCreateDailyNote(selected?.folder, date)
          }}
          onClose={() => setDailyDatePickerOpen(false)}
        />
      )}
      {templatePromptRequest && (
        <TemplatePromptDialog
          request={templatePromptRequest}
          onSubmit={values => resolveTemplatePromptRequest(values)}
          onCancel={() => resolveTemplatePromptRequest(null)}
        />
      )}
      {templateNameRequest && (
        <TemplateNameDialog
          request={templateNameRequest}
          onSubmit={name => {
            void handleSubmitSaveCurrentAsTemplate(name)
          }}
          onCancel={() => setTemplateNameRequest(null)}
        />
      )}
      {tagRenameRequest && (
        <TagRenameDialog
          request={tagRenameRequest}
          onSubmit={nextTag => void handleConfirmRenameTag(tagRenameRequest.tag, nextTag)}
          onCancel={() => setTagRenameRequest(null)}
        />
      )}
      {tagRemoveRequest && (
        <TagRemoveDialog
          request={tagRemoveRequest}
          onSubmit={() => void handleConfirmRemoveTag(tagRemoveRequest.tag)}
          onCancel={() => setTagRemoveRequest(null)}
        />
      )}
      {folderCreateRequest && (
        <FolderNameDialog
          mode="create"
          request={folderCreateRequest}
          onSubmit={name => void handleConfirmCreateFolder(folderCreateRequest.parent, name)}
          onCancel={() => setFolderCreateRequest(null)}
        />
      )}
      {folderRenameRequest && (
        <FolderNameDialog
          mode="rename"
          request={folderRenameRequest}
          onSubmit={nextPath => void handleConfirmRenameFolder(folderRenameRequest.path, nextPath)}
          onCancel={() => setFolderRenameRequest(null)}
        />
      )}
      {moveNoteRequest && (
        <MoveNoteDialog
          request={moveNoteRequest}
          onSubmit={folder => void handleSubmitMoveNote(folder)}
          onCancel={() => setMoveNoteRequest(null)}
        />
      )}
      {workspaceRenameRequest && (
        <WorkspaceRenameDialog
          request={workspaceRenameRequest}
          onSubmit={name => handleConfirmRenameWorkspaceSnapshot(workspaceRenameRequest.snapshotKey, name)}
          onCancel={() => setWorkspaceRenameRequest(null)}
        />
      )}
      {preferencesOpen && (
        <NotesPreferencesDialog
          preferences={normalizedEditorPreferences}
          providerStatuses={localCollabProviderStatuses}
          templates={allTemplates}
          syncLabel={editorPreferencesSyncLabel}
          syncDetail={editorPreferencesSyncDetail}
          syncError={editorPreferencesSyncState === 'error'}
          onRetrySync={handleRetryEditorPreferencesSync}
          onConfirmAction={requestConfirmAction}
          onNotice={showNotice}
          onChange={updateEditorPreferences}
          onClose={() => setPreferencesOpen(false)}
        />
      )}
      {collabReviewOpen && selected?.type === 'note' && (
        <LocalCollabDraftDialog
          drafts={localCollabDrafts}
          localContent={pendingContentRef.current.get(selected._id) ?? selected.content}
          baseContent={selected.content}
          onApply={handleApplyLocalCollabDraft}
          onDismiss={handleDismissLocalCollabDraft}
          onClose={() => setCollabReviewOpen(false)}
        />
      )}
      {draftRecoveryOpen && (
        <DraftRecoveryDialog
          drafts={recoverableDrafts}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
          onRefresh={loadRecoverableDrafts}
          onClose={() => setDraftRecoveryOpen(false)}
        />
      )}
    </>
  )
}
