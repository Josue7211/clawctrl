import type { ChatWorkspaceProject } from '@/chat/t3-adapters/projectWorkspace'
import { normalizedProjectPath } from '@/chat/t3-adapters/projectSidebar'

export function normalizedEnvironmentId(value: string | null | undefined): string {
  return value?.trim().toLowerCase() || ''
}

export function normalizedSessionEnvironmentId(value: string | null | undefined): string {
  return normalizedEnvironmentId(value) || 'local'
}

function preferredProjectForEnvironment(
  projects: ChatWorkspaceProject[],
  environmentId?: string | null,
): ChatWorkspaceProject | null {
  const environmentKey = normalizedEnvironmentId(environmentId)
  if (environmentKey) {
    return projects.find((project) => normalizedEnvironmentId(project.environmentId) === environmentKey) ?? null
  }
  return projects.find((project) => normalizedEnvironmentId(project.environmentId) === 'local')
    ?? projects.find((project) => !normalizedEnvironmentId(project.environmentId))
    ?? projects[0]
    ?? null
}

export function uniqueProjectForEnvironment(
  projects: ChatWorkspaceProject[],
  environmentId?: string | null,
): ChatWorkspaceProject | null {
  const environmentKey = normalizedEnvironmentId(environmentId)
  if (!environmentKey) return null
  const matches = projects.filter((project) => normalizedEnvironmentId(project.environmentId || 'local') === environmentKey)
  return matches.length === 1 ? matches[0] : null
}

export function findProjectByPathAndEnvironment(
  projects: ChatWorkspaceProject[],
  path: string,
  environmentId?: string | null,
): ChatWorkspaceProject | null {
  const trimmedPath = path.trim()
  const pathKey = normalizedProjectPath(path)
  if (!pathKey) return null

  const exactPathMatch = preferredProjectForEnvironment(
    projects.filter((project) => project.path.trim() === trimmedPath),
    environmentId,
  )
  if (exactPathMatch) return exactPathMatch

  return preferredProjectForEnvironment(
    projects.filter((project) => normalizedProjectPath(project.path) === pathKey),
    environmentId,
  )
}
