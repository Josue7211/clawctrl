import {
  type NotesEditorPreferences,
  normalizeNotesEditorPreferences,
  notesRemoteCollaborationSetupStatus,
  createNotesRemoteCollaborationPairingInvite,
  isNotesRemoteCollaborationPairingKey,
  parseNotesRemoteCollaborationPairingInvite,
  isNotesRemoteCollaborationBaseUrl,
} from '@/features/notes/notesPreferences'
import { type LocalCollabTransportStatus } from '@/features/notes/collaboration'
import { type NoteTemplate } from '@/features/notes/templates'
import {
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react'
import type {
  VaultCollaborationPairing,
  VaultCollaborationProviderHealth,
} from '@/features/notes/storage/vault'
import {
  getVaultCollaborationPairings,
  testVaultCollaborationRemoteProvider,
  approveVaultCollaborationPairing,
  revokeVaultCollaborationPairing,
} from '@/features/notes/storage/vault'
import { getRemoteApiKey } from '@/lib/api'
import { CloudSlash, Cloud } from '@phosphor-icons/react'
import { writingAssistProviderLabel } from '@/features/notes/assistiveWriting'
import { type ConfirmActionRequest, type NoticeRequest } from '@/features/notes/workspaceTypes'

function NotesPreferencesDialog({
  preferences,
  providerStatuses,
  templates,
  syncLabel,
  syncDetail,
  syncError,
  onRetrySync,
  onConfirmAction,
  onNotice,
  onChange,
  onClose,
}: {
  preferences: NotesEditorPreferences
  providerStatuses: LocalCollabTransportStatus[]
  templates: NoteTemplate[]
  syncLabel: string
  syncDetail: string
  syncError: boolean
  onRetrySync: () => void
  onConfirmAction: (request: ConfirmActionRequest) => void
  onNotice: (request: NoticeRequest) => void
  onChange: (preferences: NotesEditorPreferences) => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const [pairings, setPairings] = useState<VaultCollaborationPairing[]>([])
  const [pairingBusy, setPairingBusy] = useState(false)
  const [pairingError, setPairingError] = useState<string | null>(null)
  const [providerHealth, setProviderHealth] = useState<VaultCollaborationProviderHealth | null>(null)
  const [providerHealthBusy, setProviderHealthBusy] = useState(false)
  const [pairingInviteOutput, setPairingInviteOutput] = useState('')
  const [approveDeviceLabelOpen, setApproveDeviceLabelOpen] = useState(false)
  const [approveDeviceLabel, setApproveDeviceLabel] = useState('clawctrl Notes')
  const [acceptInviteOpen, setAcceptInviteOpen] = useState(false)
  const [acceptInviteValue, setAcceptInviteValue] = useState('')
  const update = (patch: Partial<NotesEditorPreferences>) => {
    onChange(normalizeNotesEditorPreferences({ ...preferences, ...patch }))
  }
  const remoteSetup = notesRemoteCollaborationSetupStatus(preferences)

  const refreshPairings = useCallback(async () => {
    try {
      const next = await getVaultCollaborationPairings()
      setPairings(next)
      setPairingError(null)
    } catch (error) {
      setPairingError(error instanceof Error ? error.message : 'Could not load approved pairings')
    }
  }, [])

  const checkProviderHealth = async (nextPreferences: NotesEditorPreferences = preferences) => {
    setProviderHealthBusy(true)
    const health = await testVaultCollaborationRemoteProvider({
      baseUrl: nextPreferences.remoteCollaborationBaseUrl,
      apiKey: getRemoteApiKey(),
      pairingKey: nextPreferences.remoteCollaborationPairingKey,
      timeoutMs: 8_000,
    })
    setProviderHealth(health)
    setProviderHealthBusy(false)
  }

  const createPairingInvite = async () => {
    try {
      setPairingBusy(true)
      const { invite, encoded } = createNotesRemoteCollaborationPairingInvite({
        providerUrl: preferences.remoteCollaborationBaseUrl,
        pairingKey: preferences.remoteCollaborationPairingKey,
        deviceLabel: 'clawctrl Notes',
      })
      const nextPreferences = normalizeNotesEditorPreferences({
        ...preferences,
        remoteCollaborationEnabled: true,
        remoteCollaborationBaseUrl: invite.providerUrl,
        remoteCollaborationPairingKey: invite.pairingKey,
      })
      onChange(nextPreferences)
      await approveVaultCollaborationPairing(invite.pairingKey, invite.deviceLabel)
      await refreshPairings()
      void checkProviderHealth(nextPreferences)
      setPairingInviteOutput(encoded)
    } catch (error) {
      onNotice({
        title: 'Pairing invite failed',
        detail: error instanceof Error ? error.message : 'Could not create pairing invite',
        tone: 'danger',
      })
    } finally {
      setPairingBusy(false)
    }
  }

  const openApproveCurrentPairing = () => {
    if (!isNotesRemoteCollaborationPairingKey(preferences.remoteCollaborationPairingKey)) {
      setPairingError('Use a valid pairing key before approving this vault.')
      return
    }
    setApproveDeviceLabel('clawctrl Notes')
    setApproveDeviceLabelOpen(true)
  }

  const approveCurrentPairing = async (label: string) => {
    setPairingBusy(true)
    try {
      await approveVaultCollaborationPairing(preferences.remoteCollaborationPairingKey, label.trim() || 'clawctrl Notes')
      await refreshPairings()
      setApproveDeviceLabelOpen(false)
      void checkProviderHealth()
    } catch (error) {
      setPairingError(error instanceof Error ? error.message : 'Could not approve pairing')
    } finally {
      setPairingBusy(false)
    }
  }

  const revokeCurrentPairing = async () => {
    if (!isNotesRemoteCollaborationPairingKey(preferences.remoteCollaborationPairingKey)) {
      setPairingError('Use a valid pairing key before revoking this vault.')
      return
    }
    onConfirmAction({
      title: 'Revoke pairing key',
      detail: 'Revoke this pairing key for the local vault. Remote collaboration will need a newly approved key before it can sync again.',
      confirmLabel: 'Revoke pairing',
      tone: 'danger',
      onConfirm: async () => {
        setPairingBusy(true)
        try {
          await revokeVaultCollaborationPairing({ pairingKey: preferences.remoteCollaborationPairingKey })
          await refreshPairings()
        } catch (error) {
          setPairingError(error instanceof Error ? error.message : 'Could not revoke pairing')
        } finally {
          setPairingBusy(false)
        }
      },
    })
  }

  const openAcceptPairingInvite = () => {
    setAcceptInviteValue('')
    setAcceptInviteOpen(true)
  }

  const acceptPairingInvite = async (raw: string) => {
    if (!raw?.trim()) return
    setPairingBusy(true)
    try {
      const invite = parseNotesRemoteCollaborationPairingInvite(raw)
      const nextPreferences = normalizeNotesEditorPreferences({
        ...preferences,
        remoteCollaborationEnabled: true,
        remoteCollaborationBaseUrl: invite.providerUrl,
        remoteCollaborationPairingKey: invite.pairingKey,
      })
      onChange(nextPreferences)
      await approveVaultCollaborationPairing(invite.pairingKey, invite.deviceLabel)
      await refreshPairings()
      setAcceptInviteOpen(false)
      void checkProviderHealth(nextPreferences)
    } catch (error) {
      onNotice({
        title: 'Pairing invite failed',
        detail: error instanceof Error ? error.message : 'Could not accept pairing invite',
        tone: 'danger',
      })
    } finally {
      setPairingBusy(false)
    }
  }

  const testProvider = async () => {
    await checkProviderHealth()
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    requestAnimationFrame(() => dialogRef.current?.focus())
  }, [])

  useEffect(() => {
    void refreshPairings()
  }, [refreshPairings])

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
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Editor preferences"
        tabIndex={-1}
        style={{
          width: 'min(520px, 100%)',
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
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 650 }}>Editor preferences</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Editor, appearance, and periodic-note settings for this vault UI</div>
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
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div
            style={{
              border: `1px solid ${syncError ? 'color-mix(in srgb, var(--red) 36%, var(--border))' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              background: syncError ? 'color-mix(in srgb, var(--red) 8%, transparent)' : 'var(--bg-white-02)',
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
            }}
          >
            <span style={{ color: syncError ? 'var(--red)' : 'var(--text-muted)', display: 'inline-flex', flexShrink: 0 }}>
              {syncError ? <CloudSlash size={14} /> : <Cloud size={14} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 650 }}>{syncLabel}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.35 }}>{syncDetail}</div>
            </div>
            {syncError && (
              <button
                type="button"
                onClick={onRetrySync}
                className="hover-bg"
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '5px 8px',
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                Retry
              </button>
            )}
          </div>
          <PreferenceSelect
            label="Default editor mode"
            value={preferences.defaultMode}
            options={[
              ['doc', 'Document'],
              ['source', 'Markdown'],
              ['split', 'Split'],
              ['read', 'Read'],
            ]}
            onChange={value => update({ defaultMode: value as NotesEditorPreferences['defaultMode'] })}
          />
          <PreferenceSelect
            label="Markdown line width"
            value={preferences.markdownWidth}
            options={[
              ['narrow', 'Narrow'],
              ['normal', 'Normal'],
              ['wide', 'Wide'],
            ]}
            onChange={value => update({ markdownWidth: value as NotesEditorPreferences['markdownWidth'] })}
          />
          <PreferenceSelect
            label="Markdown font size"
            value={preferences.markdownFontSize}
            options={[
              ['small', 'Small'],
              ['normal', 'Normal'],
              ['large', 'Large'],
            ]}
            onChange={value => update({ markdownFontSize: value as NotesEditorPreferences['markdownFontSize'] })}
          />
          <label
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}
          >
            <input
              type="checkbox"
              checked={preferences.spellcheck}
              onChange={event => update({ spellcheck: event.target.checked })}
            />
            Spellcheck Markdown editor
          </label>
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 12,
              display: 'grid',
              gap: 8,
            }}
          >
            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 650 }}>Vault appearance</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.35 }}>
                Local-only Notes theme and scoped CSS snippet for this vault workspace.
              </div>
            </div>
            <PreferenceSelect
              label="Appearance"
              value={preferences.appearanceMode}
              options={[
                ['system', 'Use app theme'],
                ['light', 'Light'],
                ['dark', 'Dark'],
              ]}
              onChange={value => update({ appearanceMode: value as NotesEditorPreferences['appearanceMode'] })}
            />
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}
            >
              <input
                type="checkbox"
                checked={preferences.cssSnippetEnabled}
                onChange={event => update({ cssSnippetEnabled: event.target.checked })}
              />
              Enable CSS snippet
            </label>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>CSS snippet</span>
              <textarea
                aria-label="CSS snippet"
                value={preferences.cssSnippet}
                rows={6}
                spellCheck={false}
                placeholder=".tiptap-note-body { font-size: 15px; }"
                onChange={event => update({ cssSnippet: event.target.value })}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  padding: '7px 8px',
                  font: '12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  minWidth: 0,
                  resize: 'vertical',
                }}
              />
            </label>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 12,
              display: 'grid',
              gap: 8,
            }}
          >
            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 650 }}>Daily notes</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.35 }}>
                Date tokens use formats like YYYY-MM-DD, dddd, MMMM D, HH:mm, and [literal text].
              </div>
            </div>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Folder</span>
              <input
                type="text"
                value={preferences.dailyNoteFolder}
                placeholder="Daily"
                onChange={event => update({ dailyNoteFolder: event.target.value })}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  padding: '7px 8px',
                  font: 'inherit',
                  fontSize: 12,
                  minWidth: 0,
                }}
              />
            </label>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Title format</span>
              <input
                type="text"
                value={preferences.dailyNoteTitleFormat}
                placeholder="[Daily] YYYY-MM-DD"
                onChange={event => update({ dailyNoteTitleFormat: event.target.value })}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  padding: '7px 8px',
                  font: 'inherit',
                  fontSize: 12,
                  minWidth: 0,
                }}
              />
            </label>
            <PreferenceSelect
              label="Template"
              value={preferences.dailyNoteTemplateId}
              options={templates.map(template => [
                template.id,
                template.source === 'vault' ? `${template.label} (vault)` : template.label,
              ])}
              onChange={value => update({ dailyNoteTemplateId: value })}
            />
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}
            >
              <input
                type="checkbox"
                checked={preferences.dailyNoteOpenExisting}
                onChange={event => update({ dailyNoteOpenExisting: event.target.checked })}
              />
              Open today's note if it already exists
            </label>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'grid', gap: 8 }}>
              <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 650 }}>Periodic notes</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8 }}>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Weekly folder</span>
                  <input
                    type="text"
                    value={preferences.weeklyNoteFolder}
                    placeholder="Weekly"
                    onChange={event => update({ weeklyNoteFolder: event.target.value })}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      padding: '7px 8px',
                      font: 'inherit',
                      fontSize: 12,
                      minWidth: 0,
                    }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Monthly folder</span>
                  <input
                    type="text"
                    value={preferences.monthlyNoteFolder}
                    placeholder="Monthly"
                    onChange={event => update({ monthlyNoteFolder: event.target.value })}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      padding: '7px 8px',
                      font: 'inherit',
                      fontSize: 12,
                      minWidth: 0,
                    }}
                  />
                </label>
              </div>
              <PreferenceSelect
                label="Weekly template"
                value={preferences.weeklyNoteTemplateId}
                options={templates.map(template => [
                  template.id,
                  template.source === 'vault' ? `${template.label} (vault)` : template.label,
                ])}
                onChange={value => update({ weeklyNoteTemplateId: value })}
              />
              <PreferenceSelect
                label="Monthly template"
                value={preferences.monthlyNoteTemplateId}
                options={templates.map(template => [
                  template.id,
                  template.source === 'vault' ? `${template.label} (vault)` : template.label,
                ])}
                onChange={value => update({ monthlyNoteTemplateId: value })}
              />
            </div>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 12,
              display: 'grid',
              gap: 8,
            }}
          >
            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 650 }}>Writing assistant</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.35 }}>
                Synced defaults for the local assistant dialog. Note text still stays on this device.
              </div>
            </div>
            <PreferenceSelect
              label="Provider"
              value={preferences.writingAssistProvider}
              options={[
                ['local', writingAssistProviderLabel('local')],
              ]}
              onChange={value => update({ writingAssistProvider: value as NotesEditorPreferences['writingAssistProvider'] })}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8 }}>
              <PreferenceSelect
                label="Tone"
                value={preferences.writingAssistTone}
                options={[
                  ['neutral', 'Neutral'],
                  ['direct', 'Direct'],
                  ['friendly', 'Friendly'],
                ]}
                onChange={value => update({ writingAssistTone: value as NotesEditorPreferences['writingAssistTone'] })}
              />
              <PreferenceSelect
                label="Length"
                value={preferences.writingAssistLength}
                options={[
                  ['standard', 'Standard'],
                  ['short', 'Short'],
                ]}
                onChange={value => update({ writingAssistLength: value as NotesEditorPreferences['writingAssistLength'] })}
              />
            </div>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 12,
              display: 'grid',
              gap: 8,
            }}
          >
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}
            >
              <input
                type="checkbox"
                checked={preferences.remoteCollaborationEnabled}
                onChange={event => update({ remoteCollaborationEnabled: event.target.checked })}
              />
              Remote collaboration provider
            </label>
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: remoteSetup.ready ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'var(--bg-white-04)',
                color: 'var(--text-secondary)',
                padding: '8px 10px',
                display: 'grid',
                gap: 3,
              }}
            >
              <div
                style={{
                  color: remoteSetup.ready ? 'var(--success)' : 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 650,
                }}
              >
                {remoteSetup.label}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.35 }}>{remoteSetup.detail}</div>
            </div>
            {providerStatuses.length > 0 && (
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '7px 9px',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: 650,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  Provider health
                </div>
                {providerStatuses.map(status => (
                  <div
                    key={status.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(100px, 1fr) auto',
                      gap: 8,
                      padding: '7px 9px',
                      borderBottom: '1px solid var(--border)',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: 'var(--text-secondary)',
                          fontSize: 12,
                          fontWeight: 650,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {status.id}
                      </div>
                      <div
                        style={{
                          color: status.lastError ? 'var(--danger)' : 'var(--text-muted)',
                          fontSize: 11,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatCollabProviderDetail(status)}
                      </div>
                    </div>
                    <span
                      style={{
                        color: status.ok ? 'var(--success)' : 'var(--danger)',
                        fontSize: 11,
                        fontWeight: 650,
                      }}
                    >
                      {status.ok ? 'Online' : 'Needs attention'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {providerHealth && (
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: providerHealth.readinessSeverity === 'success'
                    ? 'color-mix(in srgb, var(--success) 10%, transparent)'
                    : providerHealth.readinessSeverity === 'warning'
                      ? 'color-mix(in srgb, var(--warning) 10%, transparent)'
                      : 'color-mix(in srgb, var(--danger) 10%, transparent)',
                  color: 'var(--text-secondary)',
                  padding: '8px 10px',
                  display: 'grid',
                  gap: 3,
                }}
              >
                <div
                  style={{
                    color:
                      providerHealth.readinessSeverity === 'success'
                        ? 'var(--success)'
                        : providerHealth.readinessSeverity === 'warning'
                          ? 'var(--warning)'
                          : 'var(--danger)',
                    fontSize: 12,
                    fontWeight: 650,
                  }}
                >
                  {providerHealth.readinessLabel}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.35 }}>
                  {providerHealth.readinessDetail ||
                    `Collaboration health checked at ${new Date(providerHealth.checkedAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}.`}
                </div>
                {providerHealth.counts && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    <ProviderHealthMetric label="Pairings" value={providerHealth.counts.approvedPairings} />
                    <ProviderHealthMetric label="Events" value={providerHealth.counts.activeEvents} />
                    <ProviderHealthMetric label="Snapshots" value={providerHealth.counts.crdtSnapshots} />
                  </div>
                )}
              </div>
            )}
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Provider URL</span>
              <input
                type="url"
                value={preferences.remoteCollaborationBaseUrl}
                disabled={!preferences.remoteCollaborationEnabled}
                placeholder="https://your-clawctrl.example"
                onChange={event => update({ remoteCollaborationBaseUrl: event.target.value })}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: preferences.remoteCollaborationEnabled ? 'var(--bg-base)' : 'var(--bg-muted)',
                  color: 'var(--text-primary)',
                  padding: '7px 8px',
                  font: 'inherit',
                  fontSize: 12,
                  minWidth: 0,
                }}
              />
            </label>
            {preferences.remoteCollaborationEnabled &&
              preferences.remoteCollaborationBaseUrl &&
              !isNotesRemoteCollaborationBaseUrl(preferences.remoteCollaborationBaseUrl) && (
                <div style={{ color: 'var(--danger)', fontSize: 11 }}>Use an HTTP(S) provider URL.</div>
              )}
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Pairing key</span>
              <input
                type="password"
                value={preferences.remoteCollaborationPairingKey}
                disabled={!preferences.remoteCollaborationEnabled}
                placeholder="Paste paired-device key"
                onChange={event => update({ remoteCollaborationPairingKey: event.target.value })}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: preferences.remoteCollaborationEnabled ? 'var(--bg-base)' : 'var(--bg-muted)',
                  color: 'var(--text-primary)',
                  padding: '7px 8px',
                  font: 'inherit',
                  fontSize: 12,
                  minWidth: 0,
                }}
              />
            </label>
            {preferences.remoteCollaborationEnabled &&
              preferences.remoteCollaborationPairingKey &&
              !isNotesRemoteCollaborationPairingKey(preferences.remoteCollaborationPairingKey) && (
                <div style={{ color: 'var(--danger)', fontSize: 11 }}>Use a pairing key with 16+ safe characters.</div>
              )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={createPairingInvite}
                disabled={
                  pairingBusy ||
                  !preferences.remoteCollaborationEnabled ||
                  !isNotesRemoteCollaborationBaseUrl(preferences.remoteCollaborationBaseUrl)
                }
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-white-04)',
                  color: 'var(--text-secondary)',
                  cursor: pairingBusy ? 'wait' : preferences.remoteCollaborationEnabled ? 'pointer' : 'not-allowed',
                  padding: '7px 10px',
                  fontSize: 12,
                }}
              >
                Create and approve invite
              </button>
              <button
                type="button"
                onClick={openAcceptPairingInvite}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-white-04)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '7px 10px',
                  fontSize: 12,
                }}
              >
                Accept invite
              </button>
              <button
                type="button"
                onClick={() => {
                  void testProvider()
                }}
                disabled={
                  providerHealthBusy ||
                  !remoteSetup.ready ||
                  !isNotesRemoteCollaborationBaseUrl(preferences.remoteCollaborationBaseUrl)
                }
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-white-04)',
                  color: 'var(--text-secondary)',
                  cursor: providerHealthBusy ? 'wait' : remoteSetup.ready ? 'pointer' : 'not-allowed',
                  padding: '7px 10px',
                  fontSize: 12,
                }}
              >
                {providerHealthBusy ? 'Testing...' : 'Test provider'}
              </button>
              <button
                type="button"
                onClick={openApproveCurrentPairing}
                disabled={pairingBusy || !isNotesRemoteCollaborationPairingKey(preferences.remoteCollaborationPairingKey)}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-white-04)',
                  color: 'var(--text-secondary)',
                  cursor: pairingBusy ? 'wait' : 'pointer',
                  padding: '7px 10px',
                  fontSize: 12,
                }}
              >
                Approve local key
              </button>
              <button
                type="button"
                onClick={revokeCurrentPairing}
                disabled={pairingBusy || !isNotesRemoteCollaborationPairingKey(preferences.remoteCollaborationPairingKey)}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  color: 'var(--danger)',
                  cursor: pairingBusy ? 'wait' : 'pointer',
                  padding: '7px 10px',
                  fontSize: 12,
                }}
              >
                Revoke key
              </button>
            </div>
            {pairingInviteOutput && (
              <div
                role="group"
                aria-label="Pairing invite"
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-white-02)',
                  padding: 10,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 650 }}>Pairing invite</div>
                <textarea
                  aria-label="Pairing invite text"
                  readOnly
                  value={pairingInviteOutput}
                  rows={4}
                  style={{
                    width: '100%',
                    minWidth: 0,
                    resize: 'vertical',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    padding: '7px 8px',
                    font: 'inherit',
                    fontSize: 12,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(pairingInviteOutput)}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-white-04)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '6px 9px',
                      fontSize: 12,
                    }}
                  >
                    Copy invite
                  </button>
                  <button
                    type="button"
                    onClick={() => setPairingInviteOutput('')}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '6px 9px',
                      fontSize: 12,
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            {approveDeviceLabelOpen && (
              <form
                aria-label="Approve local pairing"
                onSubmit={event => {
                  event.preventDefault()
                  void approveCurrentPairing(approveDeviceLabel)
                }}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-white-02)',
                  padding: 10,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Device label</span>
                  <input
                    type="text"
                    aria-label="Device label"
                    value={approveDeviceLabel}
                    onChange={event => setApproveDeviceLabel(event.target.value)}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      padding: '7px 8px',
                      font: 'inherit',
                      fontSize: 12,
                      minWidth: 0,
                    }}
                  />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setApproveDeviceLabelOpen(false)}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '6px 9px',
                      fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pairingBusy}
                    style={{
                      border: '1px solid var(--accent-a20)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--accent-a12)',
                      color: 'var(--accent)',
                      cursor: pairingBusy ? 'wait' : 'pointer',
                      padding: '6px 9px',
                      fontSize: 12,
                      fontWeight: 650,
                    }}
                  >
                    Approve pairing
                  </button>
                </div>
              </form>
            )}
            {acceptInviteOpen && (
              <form
                aria-label="Accept pairing invite"
                onSubmit={event => {
                  event.preventDefault()
                  void acceptPairingInvite(acceptInviteValue)
                }}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-white-02)',
                  padding: 10,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>Pairing invite</span>
                  <textarea
                    aria-label="Pairing invite"
                    value={acceptInviteValue}
                    onChange={event => setAcceptInviteValue(event.target.value)}
                    rows={4}
                    style={{
                      width: '100%',
                      minWidth: 0,
                      resize: 'vertical',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      padding: '7px 8px',
                      font: 'inherit',
                      fontSize: 12,
                    }}
                  />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setAcceptInviteOpen(false)}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '6px 9px',
                      fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pairingBusy || !acceptInviteValue.trim()}
                    style={{
                      border: '1px solid var(--accent-a20)',
                      borderRadius: 'var(--radius-sm)',
                      background: acceptInviteValue.trim() ? 'var(--accent-a12)' : 'var(--bg-muted)',
                      color: acceptInviteValue.trim() ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: pairingBusy ? 'wait' : acceptInviteValue.trim() ? 'pointer' : 'not-allowed',
                      padding: '6px 9px',
                      fontSize: 12,
                      fontWeight: 650,
                    }}
                  >
                    Accept pairing
                  </button>
                </div>
              </form>
            )}
            {pairingError && <div style={{ color: 'var(--danger)', fontSize: 11 }}>{pairingError}</div>}
            {pairings.length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                {pairings.slice(0, 4).map(pairing => (
                  <div
                    key={pairing.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 8,
                      alignItems: 'center',
                      color: 'var(--text-muted)',
                      fontSize: 11,
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pairing.deviceLabel} - {pairing.keyFingerprint}
                    </span>
                    <span style={{ color: pairing.status === 'approved' ? 'var(--success)' : 'var(--danger)' }}>
                      {pairing.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

function PreferenceSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<[string, string]>
  onChange: (value: string) => void
}) {
  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 650 }}>{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
          padding: '7px 8px',
          font: 'inherit',
          fontSize: 12,
        }}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

function ProviderHealthMetric({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-white-02)',
        padding: '6px 7px',
        minWidth: 0,
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 650 }}>{value}</div>
    </div>
  )
}

function formatCollabProviderTimestamp(status: LocalCollabTransportStatus): string {
  const timestamp = status.lastCrdtStateAt ?? status.lastListedAt ?? status.lastPublishedAt
  if (!timestamp) return 'Waiting for activity'
  return `Last activity ${new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
}

function formatCollabProviderDetail(status: LocalCollabTransportStatus): string {
  if (status.lastError) return status.lastError
  if (status.pendingMirrorCount) {
    return `${status.pendingMirrorCount} mirror event${status.pendingMirrorCount === 1 ? '' : 's'} pending`
  }
  return formatCollabProviderTimestamp(status)
}

export { NotesPreferencesDialog }
