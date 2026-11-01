import type { components } from './notes-api.generated'

// The wire document is generated; these fields belong only to local UI/cache state.
export interface VaultNote extends Omit<components['schemas']['NoteDocument'], '_rev' | 'type'> {
  _rev?: string
  type: 'note' | 'attachment'
  content_status?: 'cached_title_only' | 'confirmed_blank'
}

export interface VaultFolder {
  _id: string
  _rev?: string
  type: 'folder'
  path: string
  name: string
  created_at: number
  updated_at: number
  trashed_at?: number | null
  trash_origin_path?: string | null
}

export interface NoteSelectionAnchor {
  scope: 'selection' | 'cursor' | 'document'
  mode?: 'markdown' | 'document'
  start?: number
  end?: number
  from_line?: number
  to_line?: number
  quote?: string
}

export interface NoteReviewMarker {
  id: string
  kind: 'comment' | 'suggestion'
  status?: string
  anchor?: NoteSelectionAnchor | Record<string, unknown>
  trackedChange?: {
    type: 'replace' | 'insert' | 'replace_document'
    before?: string
    after?: string
  }
}

export interface FolderNode {
  name: string
  path: string
  children: FolderNode[]
  notes: VaultNote[]
  isExpanded: boolean
}

export interface GraphNode {
  id: string
  title: string
  links: number
  val: number
  cluster?: string
}

export interface GraphLink {
  source: string
  target: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}
