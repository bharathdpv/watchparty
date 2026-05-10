'use client'

import { useEffect, useRef, useState } from 'react'
import { Radio, Loader2, Play, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react'
import { getSocket } from '@/lib/socket'
import { createPeerConnection, type PlaybackState } from '@/lib/webrtc'
import RoomHeader from './RoomHeader'
import YoutubePlayer from './YoutubePlayer'
import Chat from './Chat'

interface Props { roomId: string }

const DRIFT_THRESHOLD = 2  // seconds — acceptable for independent YT players

export default function ViewerView({ roomId }: Props) {
  // ── YouTube mode ──────────────────────────────────────────────────────────
  const ytPlayerRef    = useRef<any>(null)
  const [videoId,   setVideoId]   = useState('')
  const [ytReady,   setYtReady]   = useState(false)

  // ── Local / WebRTC mode ───────────────────────────────────────────────────
  const videoRef          = useRef<HTMLVideoElement>(null)
  const pcRef             = useRef<RTCPeerConnection | null>(null)
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([])
  const remoteDescSet     = useRef(false)
  const joinedRef         = useRef(false)

  // ── Player shell ──────────────────────────────────────────────────────────
  const containerRef   = useRef<HTMLDivElement>(null)
  const hideTimerRef   = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [connected,    setConnected]    = useState(false)
  const [status,       setStatus]       = useState<'waiting' | 'connecting' | 'live' | 'buffering'>('waiting')
  const [muted,        setMuted]        = useState(true)
  const [needsGesture, setNeedsGesture] = useState(false)
  const [showCtrl,     setShowCtrl]     = useState(true)
  const [isFs,         setIsFs]         = useState(false)
  const [showChat,   setShowChat]   = useState(false)
  const [unread,     setUnread]     = useState(0)
  const [mySocketId, setMySocketId] = useState('')

  useEffect(() => {
    const s = getSocket()
    if (s.id) { setMySocketId(s.id) }
    else { s.once('connect', () => setMySocketId(s.id ?? '')) }
  }, [])

  const mode = videoId ? 'youtube' : 'local'
  const playerVisible = status === 'live' || status === 'buffering'

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

  // ── Apply playback state (via ref so listeners never go stale) ───────────
  const applyStateRef = useRef<(s: PlaybackState) => void>(() => {})
  applyStateRef.current = (state: PlaybackState) => {
    if (videoId) {
      // YouTube mode
      const p = ytPlayerRef.current
      if (!p || !ytReady) return
      const elapsed      = (Date.now() - state.timestamp) / 1000
      const expectedTime = state.playing ? state.currentTime + elapsed : state.currentTime
      const currentT     = p.getCurrentTime?.() ?? 0
      if (Math.abs(currentT - expectedTime) > DRIFT_THRESHOLD) p.seekTo(expectedTime, true)
      if (state.playing && p.getPlayerState?.() !== 1) p.playVideo()
      if (!state.playing && p.getPlayerState?.() !== 2)  p.pauseVideo()
    } else {
      // Local WebRTC mode
      const v = videoRef.current
      if (!v || !v.srcObject) return
      if (state.playing && v.paused)  v.play().catch(() => setNeedsGesture(true))
      if (!state.playing && !v.paused) v.pause()
    }
  }

  // Re-request sync once YT player ready — initial state likely arrived before player was ready
  useEffect(() => {
    if (!ytReady) return
    getSocket().emit('request-sync')
  }, [ytReady])

  // ── Stable socket wiring (only roomId dep — never re-runs on ytReady change)
  useEffect(() => {
    const socket = getSocket()

    // YouTube video id sent on join or when host sets link
    socket.on('youtube-video', (id: string) => {
      setVideoId(id)
      setStatus('connecting')
      setConnected(true)
    })

    // viewer-count fires when we join → request current playback state
    socket.on('viewer-count', () => socket.emit('request-sync'))

    // playback-state always routed through ref — no stale closure issues
    socket.on('playback-state', (state: PlaybackState) => applyStateRef.current(state))

    // WebRTC offer (local file mode)
    socket.on('offer', async ({ fromId, offer }: { fromId: string; offer: RTCSessionDescriptionInit }) => {
      if (videoId) return   // ignore WebRTC if in YouTube mode
      setStatus('connecting')
      const pc = createPeerConnection()
      pcRef.current = pc

      pc.ontrack = (e) => {
        const v = videoRef.current
        if (v && e.streams[0]) {
          v.srcObject = e.streams[0]; v.muted = true
          v.play().catch(() => setNeedsGesture(true))
        }
      }
      pc.onicecandidate = (e) => { if (e.candidate) socket.emit('ice-candidate', { targetId: fromId, candidate: e.candidate.toJSON() }) }
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected')                                      { setConnected(true);  setStatus('live') }
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') { setConnected(false); setStatus('buffering') }
      }

      await pc.setRemoteDescription(offer)
      remoteDescSet.current = true
      for (const c of pendingCandidates.current) await pc.addIceCandidate(c)
      pendingCandidates.current = []
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('answer', { targetId: fromId, answer })
    })

    socket.on('ice-candidate', async ({ candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
      if (remoteDescSet.current && pcRef.current) await pcRef.current.addIceCandidate(candidate)
      else pendingCandidates.current.push(candidate)
    })

    // Join room after all listeners registered — server response will be caught
    if (!joinedRef.current) {
      socket.emit('join-room', roomId)
      joinedRef.current = true
    }

    return () => {
      socket.off('youtube-video'); socket.off('offer'); socket.off('ice-candidate')
      socket.off('playback-state'); socket.off('viewer-count')
      pcRef.current?.close()
    }
  }, [roomId])   // ← roomId only; ytReady/mode changes handled via applyStateRef

  function toggleMute() {
    if (mode === 'youtube') {
      const p = ytPlayerRef.current; if (!p) return
      muted ? p.unMute() : p.mute(); setMuted(!muted)
    } else {
      const v = videoRef.current; if (!v) return
      v.muted = !v.muted; setMuted(v.muted)
    }
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {!isFs && (
        <RoomHeader
          roomId={roomId} role="viewer" connected={connected}
          chatOpen={showChat} onToggleChat={() => { setShowChat(v => !v); setUnread(0) }}
          unreadCount={unread}
        />
      )}

      {/* ── Main area (video + optional chat sidebar) ─────────────────────── */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0">

          {/* ── Waiting ────────────────────────────────────────────────────── */}
          {status === 'waiting' && (
            <div className="flex-1 flex items-center justify-center bg-zinc-950">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Radio size={28} className="text-zinc-500 animate-pulse" />
                  </div>
                </div>
                <p className="text-white font-semibold">Waiting for host to choose a video…</p>
                <p className="text-zinc-500 text-sm">Host selects YouTube link or local file</p>
              </div>
            </div>
          )}

          {/* ── Connecting ─────────────────────────────────────────────────── */}
          {status === 'connecting' && mode === 'local' && (
            <div className="flex-1 flex items-center justify-center bg-zinc-950">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Loader2 size={28} className="text-indigo-400 animate-spin" />
                  </div>
                </div>
                <p className="text-white font-semibold">Establishing peer connection…</p>
              </div>
            </div>
          )}

          {/* ── Video player shell ─────────────────────────────────────────── */}
          <div
            ref={containerRef}
            onMouseMove={showControls}
            onMouseLeave={() => setShowCtrl(false)}
            className={`relative flex-1 min-h-0 bg-black select-none ${
              (mode === 'youtube' && videoId) || playerVisible ? '' : 'hidden'
            } ${isFs ? 'h-screen' : ''}`}
            style={{ cursor: showCtrl ? 'default' : 'none' }}
          >
            {/* YouTube player */}
            {mode === 'youtube' && videoId && (
              <YoutubePlayer
                videoId={videoId}
                playerRef={ytPlayerRef}
                onReady={() => { setYtReady(true); setStatus('live') }}
                onStateChange={(s) => {
                  if (s === 1 || s === 2) setStatus('live')
                  if (s === 3) setStatus('buffering')
                }}
              />
            )}

            {/* WebRTC local stream */}
            {mode === 'local' && (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain"
                playsInline muted
                onWaiting={() => setStatus('buffering')}
                onPlaying={()  => { setStatus('live'); setNeedsGesture(false) }}
              />
            )}

            {/* Tap-to-play (autoplay blocked) */}
            {needsGesture && (
              <button onClick={() => { videoRef.current?.play(); setNeedsGesture(false) }}
                className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto">
                    <Play size={28} className="text-white ml-1" fill="white" />
                  </div>
                  <p className="text-white font-semibold text-sm">Click to play</p>
                </div>
              </button>
            )}

            {/* Controls overlay */}
            <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showCtrl ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="relative px-5 pb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'live' ? 'bg-green-400' : status === 'buffering' ? 'bg-yellow-400 animate-pulse' : 'bg-zinc-600'}`} />
                    <span className="text-white/60 text-xs capitalize">{status}</span>
                    <span className="text-white/30 text-xs">· host controls playback</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { toggleMute(); showControls() }}
                      className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <button onClick={() => { toggleFullscreen(); showControls() }}
                      className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                      {isFs ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>{/* end main video area */}

        {/* ── Chat sidebar (always mounted so messages never lost) ─────────── */}
        <Chat mySocketId={mySocketId} visible={showChat && !isFs}
          onUnread={() => setUnread(n => n + 1)}
          onClose={() => setShowChat(false)} />
      </div>
    </div>
  )
}
