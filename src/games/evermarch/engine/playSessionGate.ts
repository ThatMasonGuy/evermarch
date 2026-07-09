const PLAY_SESSION_INTENT_KEY = 'evermarch:play-session-intent'

export function markPlaySessionIntent(): void {
  window.sessionStorage.setItem(PLAY_SESSION_INTENT_KEY, String(Date.now()))
}

export function consumePlaySessionIntent(): boolean {
  const hasIntent = window.sessionStorage.getItem(PLAY_SESSION_INTENT_KEY) !== null
  window.sessionStorage.removeItem(PLAY_SESSION_INTENT_KEY)
  return hasIntent
}
