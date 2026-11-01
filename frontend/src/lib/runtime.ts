// Tauri's presence identifies native IPC, not a desktop operating system.
type NativePlatform = 'macos' | 'linux' | 'windows' | 'ios' | 'android'
let nativePlatform: NativePlatform | undefined

export async function initializeNativeRuntime(): Promise<void> {
  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return
  const { invoke } = await import('@tauri-apps/api/core')
  const platform = await invoke<NativePlatform>('runtime_platform')
  if (['macos', 'linux', 'windows', 'ios', 'android'].includes(platform)) nativePlatform = platform
}

export function isDesktopRuntime(hasDesktopKey = false): boolean {
  if (nativePlatform) return ['macos', 'linux', 'windows'].includes(nativePlatform)
  // Fail closed on phones even before native bootstrap finishes.
  if (typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))) return false
  return hasDesktopKey
}

export function isNativeMobileRuntime(): boolean {
  if (nativePlatform) return nativePlatform === 'ios' || nativePlatform === 'android'
  return typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__ && typeof navigator !== 'undefined'
    && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
}
