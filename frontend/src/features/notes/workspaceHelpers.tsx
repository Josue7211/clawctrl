import { type CSSProperties } from 'react'
import { LOCAL_STORAGE_STATE_EVENT } from '@/lib/hooks/useLocalStorageState'
import { type NotesAppearanceMode } from '@/features/notes/notesPreferences'
import type { VaultNote, NoteSelectionAnchor } from '@/features/notes/types'
import { appendTemplateToContent } from '@/features/notes/templates'
import { noteFolderPath } from '@/features/notes/trash'
import { rewriteWikilinkPath } from '@/features/notes/storage/vault'
import {
  type NotesGraphWorkspaceContext,
  type ViewMode,
  type NotesWorkspaceSnapshot,
  type MarkdownOutlineHeading,
  type SuggestionDiffLine,
} from '@/features/notes/workspaceTypes'

const COMPACT_TOPBAR_VIEWPORT_WIDTH = 900
const COMPACT_TOPBAR_ACTUAL_WIDTH = 860
const MENU_VIEWPORT_MARGIN = 8

function viewportAnchoredMenuStyle(
  trigger: HTMLElement | null,
  menu: HTMLElement | null,
  align: 'left' | 'right' = 'left',
  fallbackWidth = 240,
  maxHeight = 340,
): CSSProperties {
  if (typeof window === 'undefined' || !trigger) return {}
  const triggerRect = trigger.getBoundingClientRect()
  const measuredWidth = menu?.getBoundingClientRect().width || fallbackWidth
  const width = Math.min(measuredWidth, window.innerWidth - MENU_VIEWPORT_MARGIN * 2)
  const preferredLeft = align === 'right' ? triggerRect.right - width : triggerRect.left
  const left = Math.min(
    Math.max(MENU_VIEWPORT_MARGIN, preferredLeft),
    Math.max(MENU_VIEWPORT_MARGIN, window.innerWidth - width - MENU_VIEWPORT_MARGIN),
  )
  const availableBelow = Math.max(160, window.innerHeight - triggerRect.bottom - MENU_VIEWPORT_MARGIN - 4)

  return {
    position: 'fixed',
    top: Math.min(triggerRect.bottom + 4, window.innerHeight - MENU_VIEWPORT_MARGIN),
    left,
    right: 'auto',
    maxWidth: `min(280px, calc(100vw - ${MENU_VIEWPORT_MARGIN * 2}px))`,
    maxHeight: `min(${maxHeight}px, ${availableBelow}px)`,
  }
}

const SAVE_DEBOUNCE_MS = 700
const MIN_FILE_TREE_WIDTH = 160
const MAX_FILE_TREE_WIDTH = 360
const DEFAULT_FILE_TREE_WIDTH = 220
const FILE_TREE_WIDTH_STEP = 40
const MIN_WORKSPACE_SIDE_PANE_WIDTH = 300
const MAX_WORKSPACE_SIDE_PANE_WIDTH = 720
const DEFAULT_WORKSPACE_SIDE_PANE_WIDTH = 420
const WORKSPACE_SIDE_PANE_WIDTH_STEP = 40
const WORKSPACE_TAB_DRAG_TYPE = 'application/x-clawctrl-workspace-tab'
const VALID_GRAPH_GROUP_MODES = new Set<NotesGraphWorkspaceContext['groupMode']>(['tag', 'folder', 'type', 'none'])

function readLocalStorageJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored !== null ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

function writeLocalStorageJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_STATE_EVENT, { detail: { key } }))
}

function readGraphWorkspaceContext(): NotesGraphWorkspaceContext {
  const groupMode = readLocalStorageJson<unknown>('mc-notes-graph-group-mode', 'tag')
  return {
    graphSearch: String(readLocalStorageJson('mc-notes-graph-search', '') || '').slice(0, 240),
    focusMatches: readLocalStorageJson<unknown>('mc-notes-graph-focus-matches', false) === true,
    hideOrphans: readLocalStorageJson<unknown>('mc-notes-graph-hide-orphans', false) === true,
    localGraph: readLocalStorageJson<unknown>('mc-notes-graph-local', false) === true,
    groupMode: typeof groupMode === 'string' && VALID_GRAPH_GROUP_MODES.has(groupMode as NotesGraphWorkspaceContext['groupMode'])
      ? groupMode as NotesGraphWorkspaceContext['groupMode']
      : 'tag',
  }
}

function restoreGraphWorkspaceContext(context: NotesGraphWorkspaceContext | undefined): void {
  if (!context) return
  try {
    writeLocalStorageJson('mc-notes-graph-search', context.graphSearch)
    writeLocalStorageJson('mc-notes-graph-focus-matches', context.focusMatches)
    writeLocalStorageJson('mc-notes-graph-hide-orphans', context.hideOrphans)
    writeLocalStorageJson('mc-notes-graph-local', context.localGraph)
    writeLocalStorageJson('mc-notes-graph-group-mode', context.groupMode)
    writeLocalStorageJson('mc-notes-graph-settings-updated-at', Date.now())
  } catch {
    // Graph controls still remain usable inside GraphView if local storage is unavailable.
  }
}

function clampWorkspaceSidePaneWidth(width: number): number {
  return Math.max(MIN_WORKSPACE_SIDE_PANE_WIDTH, Math.min(MAX_WORKSPACE_SIDE_PANE_WIDTH, Math.round(width)))
}

function clampFileTreeWidth(width: number): number {
  return Math.max(MIN_FILE_TREE_WIDTH, Math.min(MAX_FILE_TREE_WIDTH, Math.round(width)))
}

function notesAppearanceStyle(mode: NotesAppearanceMode): CSSProperties {
  if (mode === 'light') {
    return {
      colorScheme: 'light',
      '--bg-base': '#f7f7f4',
      '--bg-panel': '#ffffff',
      '--bg-muted': '#ecece7',
      '--bg-elevated': '#ffffff',
      '--bg-white-02': 'rgba(16, 20, 24, 0.03)',
      '--bg-white-03': 'rgba(16, 20, 24, 0.04)',
      '--bg-white-04': 'rgba(16, 20, 24, 0.06)',
      '--bg-white-06': 'rgba(16, 20, 24, 0.08)',
      '--bg-white-08': 'rgba(16, 20, 24, 0.1)',
      '--text-primary': '#15171a',
      '--text-secondary': '#3d4248',
      '--text-muted': '#69707a',
      '--border': 'rgba(16, 20, 24, 0.12)',
      '--border-hover': 'rgba(16, 20, 24, 0.2)',
      '--hover-bg': 'rgba(16, 20, 24, 0.06)',
    } as CSSProperties
  }
  if (mode === 'dark') {
    return {
      colorScheme: 'dark',
      '--bg-base': '#0a0b0d',
      '--bg-panel': '#111318',
      '--bg-muted': '#171a20',
      '--bg-elevated': '#151821',
      '--bg-white-02': 'rgba(255, 255, 255, 0.02)',
      '--bg-white-03': 'rgba(255, 255, 255, 0.03)',
      '--bg-white-04': 'rgba(255, 255, 255, 0.04)',
      '--bg-white-06': 'rgba(255, 255, 255, 0.06)',
      '--bg-white-08': 'rgba(255, 255, 255, 0.08)',
      '--text-primary': '#e8e9ee',
      '--text-secondary': '#b9bec8',
      '--text-muted': '#858c98',
      '--border': 'rgba(255, 255, 255, 0.08)',
      '--border-hover': 'rgba(255, 255, 255, 0.14)',
      '--hover-bg': 'rgba(255, 255, 255, 0.05)',
    } as CSSProperties
  }
  return {}
}

function viewModeLabel(mode: ViewMode): string {
  if (mode === 'editor') return 'Editor'
  if (mode === 'graph') return 'Graph'
  if (mode === 'data') return 'Data'
  return 'Canvas'
}

function workspaceSnapshotKey(snapshot: NotesWorkspaceSnapshot): string {
  return snapshot.id || `${snapshot.viewMode}:${snapshot.savedAt}:${snapshot.selectedId ?? 'no-note'}`
}

function noteLinkTitle(note: Pick<VaultNote, '_id' | 'title'>): string {
  return note.title || note._id.replace(/\.md$/, '')
}

function noteEmbedMarkdown(note: Pick<VaultNote, '_id' | 'title'>): string {
  return `![[${noteLinkTitle(note)}]]`
}

function insertMarkdownBlockAtAnchor(content: string, insertion: string, anchor: NoteSelectionAnchor | null): string {
  const block = insertion.trim()
  if (!block) return content
  if (
    anchor?.mode !== 'markdown' ||
    typeof anchor.start !== 'number' ||
    typeof anchor.end !== 'number'
  ) {
    return appendTemplateToContent(content, block)
  }

  const start = Math.max(0, Math.min(anchor.start, content.length))
  const end = Math.max(start, Math.min(anchor.end, content.length))
  const before = content.slice(0, start).trimEnd()
  const after = content.slice(end).trimStart()
  if (!before && !after) return `${block}\n`
  if (!before) return `${block}\n\n${after}`
  if (!after) return `${before}\n\n${block}\n`
  return `${before}\n\n${block}\n\n${after}`
}

function slugForBlockId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'block'
}

function createBlockId(note: Pick<VaultNote, '_id' | 'title'>): string {
  return `${slugForBlockId(noteLinkTitle(note))}-${Date.now().toString(36)}`
}

function insertBlockIdAtAnchor(content: string, blockId: string, anchor: NoteSelectionAnchor | null): string {
  const marker = `^${blockId.replace(/^\^+/, '')}`
  if (
    anchor?.mode !== 'markdown' ||
    typeof anchor.start !== 'number'
  ) {
    return insertMarkdownBlockAtAnchor(content, marker, null)
  }

  const cursor = Math.max(0, Math.min(anchor.start, content.length))
  const lineStart = content.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1
  const nextLineBreak = content.indexOf('\n', cursor)
  const lineEnd = nextLineBreak === -1 ? content.length : nextLineBreak
  const line = content.slice(lineStart, lineEnd)
  if (!line.trim()) {
    return `${content.slice(0, lineStart)}${marker}${content.slice(lineEnd)}`
  }
  const nextLine = line.match(/\s\^[A-Za-z0-9-]+$/)
    ? line.replace(/\s\^[A-Za-z0-9-]+$/, ` ${marker}`)
    : `${line.trimEnd()} ${marker}`
  return `${content.slice(0, lineStart)}${nextLine}${content.slice(lineEnd)}`
}

function blockIdAtAnchorLine(content: string, anchor: NoteSelectionAnchor | null): string | null {
  if (
    anchor?.mode !== 'markdown' ||
    typeof anchor.start !== 'number'
  ) {
    return null
  }
  const cursor = Math.max(0, Math.min(anchor.start, content.length))
  const lineStart = content.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1
  const nextLineBreak = content.indexOf('\n', cursor)
  const lineEnd = nextLineBreak === -1 ? content.length : nextLineBreak
  const line = content.slice(lineStart, lineEnd)
  return line.match(/\s\^([A-Za-z0-9-]+)$/)?.[1] ?? null
}

function blockReferenceMarkdown(note: Pick<VaultNote, '_id' | 'title'>, blockId: string): string {
  return `[[${noteLinkTitle(note)}#^${blockId.replace(/^\^+/, '')}]]`
}

function headingAtAnchor(content: string, anchor: NoteSelectionAnchor | null): string | null {
  if (
    anchor?.mode !== 'markdown' ||
    typeof anchor.start !== 'number'
  ) {
    return null
  }
  const cursor = Math.max(0, Math.min(anchor.start, content.length))
  const currentLineEnd = content.indexOf('\n', cursor)
  const throughCurrentLine = content.slice(0, currentLineEnd === -1 ? content.length : currentLineEnd)
  const lines = throughCurrentLine.split('\n')
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const match = lines[index]?.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)
    const heading = match?.[1]?.trim()
    if (heading) return heading
  }
  return null
}

function headingReferenceMarkdown(note: Pick<VaultNote, '_id' | 'title'>, heading: string): string {
  return `[[${noteLinkTitle(note)}#${heading}]]`
}

function collectMarkdownOutlineHeadings(content: string): MarkdownOutlineHeading[] {
  return content
    .split('\n')
    .map((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
      if (!match) return null
      return {
        level: match[1].length,
        text: match[2].trim(),
        lineNumber: index + 1,
      }
    })
    .filter((heading): heading is MarkdownOutlineHeading => !!heading)
}

function headingForReference(content: string, anchor: NoteSelectionAnchor | null, note: Pick<VaultNote, '_id' | 'title'>): string | null {
  const anchoredHeading = headingAtAnchor(content, anchor)
  if (anchoredHeading) return anchoredHeading

  const noteTitle = noteLinkTitle(note).trim().toLowerCase()
  const headings = collectMarkdownOutlineHeadings(content)
  return headings.find(heading => heading.text.trim().toLowerCase() !== noteTitle)?.text ?? headings[0]?.text ?? null
}

function fallbackHeadingAnchor(content: string, note: Pick<VaultNote, '_id' | 'title'>): NoteSelectionAnchor | null {
  const noteTitle = noteLinkTitle(note).trim().toLowerCase()
  const heading = collectMarkdownOutlineHeadings(content)
    .find(item => item.text.trim().toLowerCase() !== noteTitle)
  if (!heading) return null

  const lines = content.split('\n')
  let start = 0
  for (let index = 0; index < heading.lineNumber - 1; index += 1) {
    start += (lines[index]?.length ?? 0) + 1
  }
  const end = start + (lines[heading.lineNumber - 1]?.length ?? 0)
  return { scope: 'cursor', mode: 'markdown', start: end, end, quote: '' }
}

function markdownAnchorOrHeadingFallback(
  content: string,
  anchor: NoteSelectionAnchor | null,
  note: Pick<VaultNote, '_id' | 'title'>,
): NoteSelectionAnchor | null {
  if (anchor?.mode === 'markdown' && typeof anchor.start === 'number') return anchor
  return fallbackHeadingAnchor(content, note)
}

function isInsideFolder(folder: string, path: string): boolean {
  return folder === path || folder.startsWith(`${path}/`)
}

function isNoteInsideFolder(note: VaultNote, path: string): boolean {
  return isInsideFolder(noteFolderPath(note), path)
}

function applyPathRewrites(content: string, rewrites: Array<[string, string]>): string {
  return rewrites.reduce((next, [fromId, toId]) => rewriteWikilinkPath(next, fromId, toId), content)
}

function documentAnchor(): NoteSelectionAnchor {
  return { scope: 'document' }
}

function usableSelectionAnchor(anchor: NoteSelectionAnchor | null): NoteSelectionAnchor {
  if (!anchor || anchor.scope !== 'selection' || !anchor.quote?.trim()) return documentAnchor()
  return anchor
}

function usableSuggestionAnchor(anchor: NoteSelectionAnchor | null): NoteSelectionAnchor {
  if (anchor?.scope === 'selection' && anchor.quote?.trim()) return anchor
  if (anchor?.scope === 'cursor' && typeof anchor.start === 'number') return anchor
  return documentAnchor()
}

function suggestionDiff(before: string, after: string): SuggestionDiffLine[] {
  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')
  if (before === after) return beforeLines.slice(0, 12).map(text => ({ kind: 'same', text }))
  return [
    ...beforeLines.slice(0, 8).map(text => ({ kind: 'removed' as const, text })),
    ...afterLines.slice(0, 8).map(text => ({ kind: 'added' as const, text })),
  ].slice(0, 16)
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown save error'
}

export {
  MIN_FILE_TREE_WIDTH,
  MAX_FILE_TREE_WIDTH,
  DEFAULT_FILE_TREE_WIDTH,
  DEFAULT_WORKSPACE_SIDE_PANE_WIDTH,
  WORKSPACE_TAB_DRAG_TYPE,
  viewModeLabel,
  workspaceSnapshotKey,
  MIN_WORKSPACE_SIDE_PANE_WIDTH,
  MAX_WORKSPACE_SIDE_PANE_WIDTH,
  viewportAnchoredMenuStyle,
  suggestionDiff,
  formatBytes,
  COMPACT_TOPBAR_VIEWPORT_WIDTH,
  collectMarkdownOutlineHeadings,
  notesAppearanceStyle,
  errorMessage,
  COMPACT_TOPBAR_ACTUAL_WIDTH,
  clampWorkspaceSidePaneWidth,
  isNoteInsideFolder,
  isInsideFolder,
  applyPathRewrites,
  WORKSPACE_SIDE_PANE_WIDTH_STEP,
  FILE_TREE_WIDTH_STEP,
  clampFileTreeWidth,
  readGraphWorkspaceContext,
  restoreGraphWorkspaceContext,
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
}
