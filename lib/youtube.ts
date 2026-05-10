// ── YouTube IFrame API singleton loader ───────────────────────────────────────
let apiLoaded = false
let apiReady  = false
const queue: (() => void)[] = []

export function loadYouTubeAPI(onReady: () => void) {
  if (apiReady) { onReady(); return }
  queue.push(onReady)
  if (!apiLoaded) {
    apiLoaded = true
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    ;(window as unknown as Record<string, unknown>).onYouTubeIframeAPIReady = () => {
      apiReady = true
      queue.splice(0).forEach((cb) => cb())
    }
  }
}

// ── Extract video ID from any YouTube URL format ──────────────────────────────
export function extractVideoId(input: string): string | null {
  const clean = input.trim()
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,           // watch?v=
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,       // youtu.be/
    /embed\/([a-zA-Z0-9_-]{11})/,           // /embed/
    /shorts\/([a-zA-Z0-9_-]{11})/,          // /shorts/
    /^([a-zA-Z0-9_-]{11})$/,               // raw ID
  ]
  for (const p of patterns) {
    const m = clean.match(p)
    if (m) return m[1]
  }
  return null
}
