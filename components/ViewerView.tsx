'use client'

import { useEffect, useRef, useState } from 'react'
import { Radio, Loader2, Play, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react'
import { getSocket } from '@/lib/socket'
import { createPeerConnection, type PlaybackState } from '@/lib/webrtc'
import RoomHeader from './RoomHeader'

interface Props {
  roomId: string
}

export default function ViewerView({ roomId }: Props) {
  const videoRef          = useRef<HTMLVideoElement>(null)
  const pcRef             = useRef<RTCPeerConnection | null>(null)
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([])
  const remoteDescSet     = useRef(false)
  const containerRef      = useRef<HTMLDivElement>(null)
  const hideTimerRef      = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [connected,    setConnected]    = useState(false)
  const [status,       setStatus]       = useState<'waiting' | 'connecting' | 'live' | 'buffering'>('waiting')
  const [muted,        setMuted]        = useState(true)
  const [needsGesture, setNeedsGesture] = useState(false)
  const [showCtrl,     setShowCtrl]     = useState(true)
  const [isFs,         setIsFs]         = useState(false)

  // ── Controls auto-hide ──────────────────────────────────────────────────────
  function showControls() {
    setShowCtrl(true)
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setShowCtrl(false), 2800)
  }

  // ── Fullscreen ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else containerRef.current?.requestFullscreen()
  }

  // ── Socket + WebRTC wiring ──────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()

    socket.on('viewer-count', () => socket.emit('request-sync'))

    socket.on('offer', async ({ fromId, offer }: { fromId: string; offer: RTCSessionDescriptionInit }) => {
      setStatus('connecting')

      const pc = createPeerConnection()
      pcRef.current = pc

      pc.ontrack = (e) => {
        const video = videoRef.current
        if (video && e.streams[0]) {
          video.srcObject = e.streams[0]
          video.muted = true
          video.play().catch(() => setNeedsGesture(true))
        }
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('ice-candidate', { targetId: fromId, candidate: e.candidate.toJSON() })
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected')    { setConnected(true);  setStatus('live') }
        if (pc.connectionState === 'disconnected' ||
            pc.connectionState === 'failed')        { setConnected(false); setStatus('buffering') }
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

    socket.on('playback-state', (state: PlaybackState) => {
      const video = videoRef.current
      if (!video || !video.srcObject) return
      if (state.playing && video.paused)   video.play().catch(() => setNeedsGesture(true))
      if (!state.playing && !video.paused) video.pause()
    })

    return () => {
      socket.off('offer'); socket.off('ice-candidate')
      socket.off('playback-state'); socket.off('viewer-count')
      pcRef.current?.close()
    }
  }, [roomId])

  function toggleMute() {
    const v = videoRef.current; if (!v) return
    const next = !muted; v.muted = next; setMuted(next)
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {!isFs && <RoomHeader roomId={roomId} role="viewer" connected={connected} />}

      {/* ── Waiting / connecting states ─────────────────────────────────────── */}
      {status === 'waiting' && (
        <div className="flex-1 flex items-center justify-center bg-zinc-950">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Radio size={28} className="text-zinc-500 animate-pulse" />
              </div>
            </div>
            <p className="text-white font-semibold">Waiting for host to start streaming…</p>
            <p className="text-zinc-500 text-sm">The host needs to select a video file</p>
          </div>
        </div>
      )}

      {status === 'connecting' && (
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

      {/* ── Video player ────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onMouseMove={showControls}
        onMouseLeave={() => setShowCtrl(false)}
        className={`relative flex-1 min-h-0 bg-black select-none ${
          status !== 'live' && status !== 'buffering' ? 'hidden' : ''
        } ${isFs ? 'h-screen' : ''}`}
        style={{ cursor: showCtrl ? 'default' : 'none' }}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          muted
          onWaiting={() => setStatus('buffering')}
          onPlaying={() => { setStatus('live'); setNeedsGesture(false) }}
        />

        {/* Tap-to-play overlay */}
        {needsGesture && (
          <button
            onClick={() => { videoRef.current?.play(); setNeedsGesture(false) }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 z-10"
          >
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
              {/* Left: status */}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  status === 'live'      ? 'bg-green-400' :
                  status === 'buffering' ? 'bg-yellow-400 animate-pulse' : 'bg-zinc-600'
                }`} />
                <span className="text-white/60 text-xs capitalize">{status}</span>
                <span className="text-white/30 text-xs">· host controls playback</span>
              </div>

              {/* Right: mute + fullscreen */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { toggleMute(); showControls() }}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button
                  onClick={() => { toggleFullscreen(); showControls() }}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {isFs ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
