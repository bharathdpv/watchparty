'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FolderOpen, Link2, Play, Pause, RotateCcw, RotateCw,
  Volume2, VolumeX, Maximize, Minimize, FileVideo, ArrowLeft,
} from 'lucide-react'
import { getSocket } from '@/lib/socket'
import { extractVideoId } from '@/lib/youtube'
import { captureVideoStream, createPeerConnection, SYNC_INTERVAL, type PlaybackState } from '@/lib/webrtc'
import RoomHeader from './RoomHeader'
import YoutubePlayer from './YoutubePlayer'
import Chat from './Chat'

interface Props { roomId: string; viewerCount: number }

type Mode = 'choose' | 'youtube' | 'local'

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return h > 0
    ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
    : `${m}:${sec.toString().padStart(2,'0')}`
}

export default function HostView({ roomId, viewerCount }: Props) {
  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode,    setMode]    = useState<Mode>('choose')
  const [ytInput, setYtInput] = useState('')
  const [ytError, setYtError] = useState('')
  const [videoId, setVideoId] = useState('')

  // ── YouTube player ────────────────────────────────────────────────────────
  const ytPlayerRef    = useRef<any>(null)
  const suppressRef    = useRef(false)   // prevent feedback loop on programmatic seek

  // ── Local file / WebRTC ───────────────────────────────────────────────────
  const videoRef       = useRef<HTMLVideoElement>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const streamRef      = useRef<MediaStream | null>(null)
  const peersRef       = useRef<Map<string, RTCPeerConnection>>(new Map())
  const pendingViewers = useRef<string[]>([])
  const [fileLoaded,  setFileLoaded]  = useState(false)
  const [fileName,    setFileName]    = useState('')

  // ── Shared playback state ─────────────────────────────────────────────────
  const [playing,     setPlaying]     = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [muted,       setMuted]       = useState(false)
  const [volume,      setVolume]      = useState(1)

  // ── Player shell ──────────────────────────────────────────────────────────
  const containerRef   = useRef<HTMLDivElement>(null)
  const hideTimerRef   = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [showCtrl, setShowCtrl] = useState(true)
  const [isFs,     setIsFs]     = useState(false)
  const [isDrag,   setIsDrag]   = useState(false)
  const [showChat,   setShowChat]   = useState(false)
  const [unread,     setUnread]     = useState(0)
  const [mySocketId, setMySocketId] = useState('')

  useEffect(() => {
    const s = getSocket()
    if (s.id) { setMySocketId(s.id) }
    else { s.once('connect', () => setMySocketId(s.id ?? '')) }
  }, [])

  // ── Controls auto-hide ────────────────────────────────────────────────────
  function showControls() {
    setShowCtrl(true)
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setShowCtrl(false), 2800)
  }

  // ── Fullscreen ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', fn)
    return () => document.removeEventListener('fullscreenchange', fn)
  }, [])
  function toggleFullscreen() {
    document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()
  }

  // ── Broadcast playback state ──────────────────────────────────────────────
  const broadcast = useCallback((override: Partial<PlaybackState> = {}) => {
    let ct = 0
    let pl = false
    if (mode === 'youtube' && ytPlayerRef.current) {
      ct = ytPlayerRef.current.getCurrentTime?.() ?? 0
      pl = ytPlayerRef.current.getPlayerState?.() === 1
    } else if (mode === 'local' && videoRef.current) {
      ct = videoRef.current.currentTime
      pl = !videoRef.current.paused
    }
    const state: PlaybackState = { playing: pl, currentTime: ct, timestamp: Date.now(), ...override }
    getSocket().emit('playback-control', state)
  }, [mode])

  // ── YouTube: host player state change → broadcast ────────────────────────
  const handleYtStateChange = useCallback((state: number) => {
    if (suppressRef.current) return
    if (state === 1) {
      setPlaying(true)
      broadcast({ playing: true })
    } else if (state === 2) {
      setPlaying(false)
      broadcast({ playing: false })
    }
  }, [broadcast])

  // ── YouTube: poll current time ────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'youtube') return
    const id = setInterval(() => {
      const p = ytPlayerRef.current
      if (!p) return
      setCurrentTime(p.getCurrentTime?.() ?? 0)
      setDuration(p.getDuration?.() ?? 0)
      broadcast()
    }, SYNC_INTERVAL)
    return () => clearInterval(id)
  }, [mode, broadcast])

  // ── YouTube: submit URL ───────────────────────────────────────────────────
  function submitYouTube() {
    const id = extractVideoId(ytInput)
    if (!id) { setYtError('Invalid YouTube URL or ID'); return }
    setYtError('')
    setVideoId(id)
    setMode('youtube')
    getSocket().emit('set-youtube', id)
  }

  // ── YouTube playback controls ─────────────────────────────────────────────
  function ytPlay()  { ytPlayerRef.current?.playVideo();  setPlaying(true);  broadcast({ playing: true }) }
  function ytPause() { ytPlayerRef.current?.pauseVideo(); setPlaying(false); broadcast({ playing: false }) }
  function ytSeek(t: number) {
    suppressRef.current = true
    ytPlayerRef.current?.seekTo(t, true)
    setCurrentTime(t)
    broadcast({ currentTime: t })
    setTimeout(() => { suppressRef.current = false }, 300)
  }

  // ── WebRTC: connect viewer ────────────────────────────────────────────────
  const connectViewer = useCallback(async (viewerId: string) => {
    const stream = streamRef.current
    if (!stream) { pendingViewers.current.push(viewerId); return }
    const socket = getSocket()
    const pc = createPeerConnection()
    peersRef.current.set(viewerId, pc)
    const cloned = new MediaStream(stream.getTracks().map((t) => t.clone()))
    cloned.getTracks().forEach((t) => pc.addTrack(t, cloned))
    pc.onicecandidate = (e) => { if (e.candidate) socket.emit('ice-candidate', { targetId: viewerId, candidate: e.candidate.toJSON() }) }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') { pc.close(); peersRef.current.delete(viewerId) }
    }
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket.emit('offer', { targetId: viewerId, offer })
  }, [])

  // ── Socket wiring ─────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSocket()
    s.on('viewer-joined',  (id: string) => { if (mode === 'local') connectViewer(id) })
    s.on('viewer-left',    (id: string) => { peersRef.current.get(id)?.close(); peersRef.current.delete(id) })
    s.on('answer',         async ({ fromId, answer }: { fromId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(fromId); if (pc) await pc.setRemoteDescription(answer)
    })
    s.on('ice-candidate',  async ({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(fromId); if (pc) await pc.addIceCandidate(candidate)
    })
    s.on('sync-request',   (viewerId: string) => {
      const v = videoRef.current
      const state = mode === 'youtube'
        ? { playing: ytPlayerRef.current?.getPlayerState() === 1, currentTime: ytPlayerRef.current?.getCurrentTime() ?? 0, timestamp: Date.now() }
        : { playing: v ? !v.paused : false, currentTime: v?.currentTime ?? 0, timestamp: Date.now() }
      s.emit('sync-response', { viewerId, state })
    })
    return () => { s.off('viewer-joined'); s.off('viewer-left'); s.off('answer'); s.off('ice-candidate'); s.off('sync-request') }
  }, [mode, connectViewer])

  // ── Local file: video events ──────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current; if (!v) return
    const onTime = () => setCurrentTime(v.currentTime)
    const onDur  = () => setDuration(v.duration)
    v.addEventListener('timeupdate',     onTime)
    v.addEventListener('durationchange', onDur)
    return () => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('durationchange', onDur) }
  }, [])

  // ── Local file: sync heartbeat ────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'local') return
    const id = setInterval(() => { if (videoRef.current) broadcast() }, SYNC_INTERVAL)
    return () => clearInterval(id)
  }, [mode, broadcast])

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    peersRef.current.forEach((pc) => pc.close())
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  function loadFile(file: File) {
    const v = videoRef.current; if (!v || !file.type.startsWith('video/')) return
    v.src = URL.createObjectURL(file); v.load(); setFileName(file.name)
    v.onloadedmetadata = () => {
      setFileLoaded(true); setDuration(v.duration)
      const stream = captureVideoStream(v, 30); streamRef.current = stream
      pendingViewers.current.splice(0).forEach((id) => connectViewer(id))
    }
  }

  function localPlay()  { videoRef.current?.play();  setPlaying(true);  broadcast({ playing: true }) }
  function localPause() { videoRef.current?.pause(); setPlaying(false); broadcast({ playing: false }) }
  function localSeek(t: number) { const v = videoRef.current; if (!v) return; v.currentTime = t; setCurrentTime(t); broadcast({ currentTime: t }) }

  function toggleMute() {
    if (mode === 'youtube') {
      const p = ytPlayerRef.current; if (!p) return
      muted ? p.unMute() : p.mute(); setMuted(!muted)
    } else {
      const v = videoRef.current; if (!v) return
      v.muted = !v.muted; setMuted(v.muted)
    }
  }
  function handleVolume(val: number) {
    setVolume(val)
    if (mode === 'youtube') { ytPlayerRef.current?.setVolume(val * 100); if (val === 0) { ytPlayerRef.current?.mute(); setMuted(true) } else if (muted) { ytPlayerRef.current?.unMute(); setMuted(false) } }
    else { const v = videoRef.current; if (!v) return; v.volume = val; if (val === 0) { v.muted = true; setMuted(true) } else if (muted) { v.muted = false; setMuted(false) } }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const playerReady = mode === 'youtube' ? !!videoId : fileLoaded

  // ── Controls overlay (shared between modes) ───────────────────────────────
  const controlsOverlay = (
    <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showCtrl ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
      <div className="relative px-5 pb-5 pt-10 space-y-3">
        {mode === 'local' && fileName && (
          <div className="flex items-center gap-1.5 mb-1">
            <FileVideo size={12} className="text-zinc-500" />
            <span className="text-zinc-400 text-xs truncate max-w-xs">{fileName}</span>
          </div>
        )}

        {/* Seek bar */}
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-xs font-mono tabular-nums w-10 shrink-0">{formatTime(currentTime)}</span>
          <div className="flex-1 group relative flex items-center h-4">
            <div className="absolute inset-x-0 h-1 rounded-full bg-white/20 group-hover:h-1.5 transition-all">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${progress}%` }} />
            </div>
            <input type="range" min={0} max={duration || 100} step={0.5} value={currentTime}
              onChange={(e) => { const t = parseFloat(e.target.value); mode === 'youtube' ? ytSeek(t) : localSeek(t) }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer" />
          </div>
          <span className="text-white/50 text-xs font-mono tabular-nums w-10 shrink-0 text-right">{formatTime(duration)}</span>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-3 items-center">
          <div />
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => { mode === 'youtube' ? ytSeek(Math.max(0, currentTime - 10)) : localSeek(Math.max(0, currentTime - 10)); showControls() }}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              <RotateCcw size={18} />
            </button>
            <button onClick={() => { playing ? (mode === 'youtube' ? ytPause() : localPause()) : (mode === 'youtube' ? ytPlay() : localPlay()); showControls() }}
              className="w-10 h-10 rounded-full bg-white text-zinc-900 flex items-center justify-center hover:bg-white/90 transition-colors">
              {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={() => { mode === 'youtube' ? ytSeek(Math.min(duration, currentTime + 10)) : localSeek(Math.min(duration, currentTime + 10)); showControls() }}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              <RotateCw size={18} />
            </button>
          </div>
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => { toggleMute(); showControls() }}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
              onChange={(e) => handleVolume(parseFloat(e.target.value))}
              className="w-16 accent-white cursor-pointer" />
            <button onClick={() => { toggleFullscreen(); showControls() }}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              {isFs ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {!isFs && (
        <RoomHeader
          roomId={roomId} role="host" viewerCount={viewerCount}
          chatOpen={showChat} onToggleChat={() => { setShowChat(v => !v); setUnread(0) }}
          unreadCount={unread}
        />
      )}

      <div className="flex-1 flex min-h-0">
        {/* Main video/chooser area */}
        <div className="flex-1 flex flex-col min-h-0">

        {/* ── Mode chooser ──────────────────────────────────────────────────── */}
        {mode === 'choose' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-lg space-y-4">
              <p className="text-zinc-400 text-sm text-center mb-6">Choose what you want to watch</p>

              {/* YouTube option */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center">
                    <Link2 size={18} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">YouTube Link</p>
                    <p className="text-zinc-500 text-xs">Paste any YouTube URL</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text" value={ytInput}
                    onChange={(e) => { setYtInput(e.target.value); setYtError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && submitYouTube()}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button onClick={submitYouTube}
                    className="bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap">
                    Watch
                  </button>
                </div>
                {ytError && <p className="text-red-400 text-xs">{ytError}</p>}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-zinc-600 text-xs">or</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Local file option */}
              <button onClick={() => setMode('local')}
                className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-6 flex items-center gap-3 transition-colors text-left">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center shrink-0">
                  <FolderOpen size={18} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Local Video File</p>
                  <p className="text-zinc-500 text-xs">MP4, WebM, MOV — streams peer-to-peer</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Local file: drop zone ─────────────────────────────────────────── */}
        {mode === 'local' && !fileLoaded && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-xl space-y-4">
              <button onClick={() => setMode('choose')} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
                <ArrowLeft size={14} /> Back
              </button>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDrag(true) }}
                onDragLeave={() => setIsDrag(false)}
                onDrop={(e) => { e.preventDefault(); setIsDrag(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-colors ${isDrag ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50'}`}
              >
                <div className="flex justify-center mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <FolderOpen size={32} className="text-indigo-400" />
                  </div>
                </div>
                <p className="text-white font-semibold text-lg mb-2">Drop a video file here</p>
                <p className="text-zinc-500 text-sm">or click to browse — MP4, WebM, MOV supported</p>
                <p className="text-zinc-600 text-xs mt-4">Your file never leaves your device</p>
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f) }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Video player shell (YouTube or local) ─────────────────────────── */}
        <div
          ref={containerRef}
          onMouseMove={showControls}
          onMouseLeave={() => { if (playing) setShowCtrl(false) }}
          className={`relative flex-1 min-h-0 bg-black select-none ${playerReady ? '' : 'hidden'} ${isFs ? 'h-screen' : ''}`}
          style={{ cursor: showCtrl ? 'default' : 'none' }}
        >
          {/* YouTube player */}
          {mode === 'youtube' && videoId && (
            <YoutubePlayer
              videoId={videoId}
              playerRef={ytPlayerRef}
              onStateChange={handleYtStateChange}
              onReady={() => { setDuration(ytPlayerRef.current?.getDuration() ?? 0) }}
            />
          )}

          {/* Local video */}
          {mode === 'local' && (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-contain"
              playsInline
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={() => { playing ? localPause() : localPlay(); showControls() }}
            />
          )}

          {controlsOverlay}
        </div>
        </div>{/* end main area */}

        {/* ── Chat sidebar (always mounted so messages never lost) ─────────── */}
        <Chat mySocketId={mySocketId} visible={showChat && !isFs}
          onUnread={() => setUnread(n => n + 1)}
          onClose={() => setShowChat(false)} />
      </div>
    </div>
  )
}
