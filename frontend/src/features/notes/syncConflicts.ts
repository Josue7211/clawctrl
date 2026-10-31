import type { VaultSyncLedger } from './storage/vault'
import { mergeNonOverlappingLineChanges } from './collaboration'


function isSyncConflictState(state: VaultSyncLedger['sync_states'][number]): boolean {
  return state.conflict_state !== 'clean' || Object.keys(state.conflict ?? {}).length > 0
}

function formatSyncConflictSummary(state: VaultSyncLedger['sync_states'][number]): string {
  const conflict = state.conflict ?? {}
  const keys = Object.keys(conflict)
  if (keys.length === 0) return 'Remote sync reported a conflict without structured details.'
  const local = conflict.local_rev || conflict.local || conflict.localRevision
  const remote = conflict.remote_rev || conflict.remote || conflict.remoteRevision
  if (local || remote) {
    return `Conflict details include local ${String(local || 'unknown')} and remote ${String(remote || 'unknown')}.`
  }
  return `Conflict details: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ', ...' : ''}.`
}

function formatSyncLedgerTimestamp(value: number | null | undefined): string {
  if (!value) return 'Not synced'
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function remoteConflictContent(conflict: Record<string, unknown>): string | null {
  const candidates = [
    conflict.remote_markdown,
    conflict.remoteMarkdown,
    conflict.remote_content,
    conflict.remoteContent,
    conflict.remote_content_markdown,
    conflict.remoteContentMarkdown,
    conflict.remote_body,
    conflict.remoteBody,
    objectValue(conflict.remote)?.content,
    objectValue(conflict.remote)?.content_markdown,
    objectValue(conflict.remote)?.markdown,
    objectValue(conflict.remote_document)?.content,
    objectValue(conflict.remote_document)?.content_markdown,
    objectValue(conflict.remoteDocument)?.content,
    objectValue(conflict.remoteDocument)?.content_markdown,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  return null
}

function baseConflictContent(conflict: Record<string, unknown>): string | null {
  const candidates = [
    conflict.base_markdown,
    conflict.baseMarkdown,
    conflict.base_content,
    conflict.baseContent,
    conflict.base_content_markdown,
    conflict.baseContentMarkdown,
    conflict.base_body,
    conflict.baseBody,
    conflict.ancestor_markdown,
    conflict.ancestorMarkdown,
    conflict.common_ancestor_markdown,
    conflict.commonAncestorMarkdown,
    objectValue(conflict.base)?.content,
    objectValue(conflict.base)?.content_markdown,
    objectValue(conflict.base)?.markdown,
    objectValue(conflict.ancestor)?.content,
    objectValue(conflict.ancestor)?.content_markdown,
    objectValue(conflict.ancestor)?.markdown,
    objectValue(conflict.common_ancestor)?.content,
    objectValue(conflict.common_ancestor)?.content_markdown,
    objectValue(conflict.common_ancestor)?.markdown,
    objectValue(conflict.commonAncestor)?.content,
    objectValue(conflict.commonAncestor)?.content_markdown,
    objectValue(conflict.commonAncestor)?.markdown,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  return null
}

function mergedSyncConflictContent(state: VaultSyncLedger['sync_states'][number], localContent: string): string | null {
  const baseContent = baseConflictContent(state.conflict)
  const remoteContent = remoteConflictContent(state.conflict)
  if (!baseContent || !remoteContent) return null
  const merged = mergeNonOverlappingLineChanges(baseContent, localContent, remoteContent)
  if (!merged || merged === localContent || merged === remoteContent) return null
  return merged
}

function conflictMarkedMergeContent(localContent: string, remoteContent: string, provider: string): string {
  return [
    '<<<<<<< LOCAL',
    localContent.trimEnd(),
    '=======',
    remoteContent.trimEnd(),
    `>>>>>>> REMOTE ${provider}`,
    '',
  ].join('\n')
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}
export {
  isSyncConflictState,
  formatSyncConflictSummary,
  formatSyncLedgerTimestamp,
  remoteConflictContent,
  baseConflictContent,
  mergedSyncConflictContent,
  conflictMarkedMergeContent,
}
