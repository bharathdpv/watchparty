'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FolderOpen, Play, Pause, RotateCcw, RotateCw,
  Volume2, VolumeX, Maximize, Minimize, FileVideo,
} from 'lucide-react'
import { getSocket } from '@/lib/socket'
import { captureVideoStream, createPeerConnection, SYNC_INTERVAL, type PlaybackState } from '@/lib/webrtc'
import RoomHeader from './RoomHeader'

interface Props {
  roomId: string
  viewerCount: number
}

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function HostView({ roomId, viewerCount }: Props) {
  // WebRTC refs
  const videoRef        = useRef<HTMLVideoElement>(null)
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const peersRef        = useRef<Map<string, RTCPeerConnection>>(new Map())
  const pendingViewers  = useRef<string[]>([])

  // Player UI refs
  const containerRef    = useRef<HTMLDivElement>(null)
  const hideTimerRef    = useRef<ReturnType<typeof setTimeout>>(undefined)

  // State
  const [fileLoaded, setFileLoaded]   = useState(false)
  const [fileName,   setFileName]     = useState('')
  const [playing,    setPlaying]      = useState(false)
  const [currentTime,setCurrentTime]  = useState(0)
  const [duration,   setDuration]     = useState(0)
  const [isDragging, setIsDragging]   = useState(false)
  const [muted,      setMuted]        = useState(false)
  const [volume,     setVolume]       = useState(1)
  const [showCtrl,   setShowCtrl]     = useState(true)
  const [isFs,       setIsFs]         = useState(false)

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

  // ── Broadcast playback state to all viewers ─────────────────────────────────
  const broadcastPlaybackState = useCallback((state: Partial<PlaybackState> = {}) => {
    const video = videoRef.current
    if (!video) return
    getSocket().emit('playback-control', {
      playing: !video.paused,
      currentTime: video.currentTime,
      timestamp: Date.now(),
      ...state,
    } satisfies PlaybackState)
  }, [])

  // ── WebRTC: connect a new viewer ────────────────────────────────────────────
  const connectViewer = useCallback(async (viewerId: string) => {
    const stream = streamRef.current
    if (!stream) { pendingViewers.current.push(viewerId); return }

    const socket = getSocket()
    const pc = createPeerConnection()
    peersRef.current.set(viewerId, pc)

    // Clone tracks — sharing the same MediaStreamTrack across multiple
    // RTCPeerConnections produces black video in some Chrome versions.
    const clonedStream = new MediaStream(stream.getTracks().map((t) => t.clone()))
    clonedStream.getTracks().forEach((track) => pc.addTrack(track, clonedStream))

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('ice-candidate', { targetId: viewerId, candidate: e.candidate.toJSON() })
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        pc.close(); peersRef.current.delete(viewerId)
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket.emit('offer', { targetId: viewerId, offer })
  }, [])

  // ── Socket wiring ───────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()

    socket.on('viewer-joined',   (id: string) => connectViewer(id))
    socket.on('viewer-left',     (id: string) => { peersRef.current.get(id)?.close(); peersRef.current.delete(id) })
    socket.on('answer',          async ({ fromId, answer }: { fromId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(fromId)
      if (pc) await pc.setRemoteDescription(answer)
    })
    socket.on('ice-candidate',   async ({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(fromId)
      if (pc) await pc.addIceCandidate(candidate)
    })
    socket.on('sync-request',    (viewerId: string) => {
      const v = videoRef.current
      if (!v) return
      socket.emit('sync-response', { viewerId, state: { playing: !v.paused, currentTime: v.currentTime, timestamp: Date.now() } })
    })

    return () => { socket.off('viewer-joined'); socket.off('viewer-left'); socket.off('answer'); socket.off('ice-candidate'); socket.off('sync-request') }
  }, [connectViewer])

  // ── Sync heartbeat ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => { if (videoRef.current) broadcastPlaybackState() }, SYNC_INTERVAL)
    return () => clearInterval(id)
  }, [broadcastPlaybackState])

  // ── Video time events ───────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime  = () => setCurrentTime(video.currentTime)
    const onDur   = () => setDuration(video.duration)
    video.addEventListener('timeupdate',      onTime)
    video.addEventListener('durationchange',  onDur)
    return () => { video.removeEventListener('timeupdate', onTime); video.removeEventListener('durationchange', onDur) }
  }, [])

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => () => {
    peersRef.current.forEach((pc) => pc.close())
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  // ── File loading ────────────────────────────────────────────────────────────
  function loadFile(file: File) {
    const video = videoRef.current
    if (!video || !file.type.startsWith('video/')) return
    video.src = URL.createObjectURL(file)
    video.load()
    setFileName(file.name)
    video.onloadedmetadata = () => {
      setFileLoaded(true)
      setDuration(video.duration)
      const stream = captureVideoStream(video, 30)
      streamRef.current = stream
      pendingViewers.current.splice(0).forEach((id) => connectViewer(id))
    }
  }

  // ── Playback handlers ───────────────────────────────────────────────────────
  function handlePlay()  { videoRef.current?.play();  setPlaying(true);  broadcastPlaybackState({ playing: true }) }
  function handlePause() { videoRef.current?.pause(); setPlaying(false); broadcastPlaybackState({ playing: false }) }
  function handleSeek(t: number) {
    const v = videoRef.current; if (!v) return
    v.currentTime = t; setCurrentTime(t); broadcastPlaybackState({ currentTime: t })
  }
  function toggleMute() {
    const v = videoRef.current; if (!v) return
    v.muted = !v.muted; setMuted(v.muted)
  }
  function handleVolume(val: number) {
    const v = videoRef.current; if (!v) return
    v.volume = val; setVolume(val)
    if (val === 0) { v.muted = true; setMuted(true) }
    else if (muted) { v.muted = false; setMuted(false) }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {!isFs && <RoomHeader roomId={roomId} role="host" viewerCount={viewerCount} />}

      <div className="flex-1 flex flex-col min-h-0">
        {/* ── Drop zone ─────────────────────────────────────────────────────── */}
        <div className={`flex-1 flex items-center justify-center p-8 ${fileLoaded ? 'hidden' : ''}`}>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50'
            }`}
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

        {/* ── Video player ───────────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          onMouseMove={showControls}
          onMouseLeave={() => { if (playing) setShowCtrl(false) }}
          className={`relative flex-1 min-h-0 bg-black select-none ${fileLoaded ? '' : 'hidden'} ${isFs ? 'h-screen' : ''}`}
          style={{ cursor: showCtrl ? 'default' : 'none' }}
        >
          {/* Video */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain"
            playsInline
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onClick={() => { playing ? handlePause() : handlePlay(); showControls() }}
          />

          {/* Controls overlay */}
          <div
            className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showCtrl ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Gradient scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

            <div className="relative px-5 pb-5 pt-10 space-y-3">
              {/* File name */}
              <div className="flex items-center gap-1.5 mb-1">
                <FileVideo size={12} className="text-zinc-500" />
                <span className="text-zinc-400 text-xs truncate max-w-xs">{fileName}</span>
              </div>

              {/* Seek bar */}
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-xs font-mono tabular-nums w-10 shrink-0">{formatTime(currentTime)}</span>
                <div className="flex-1 group relative flex items-center h-4">
                  <div className="absolute inset-x-0 h-1 rounded-full bg-white/20 group-hover:h-1.5 transition-all">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${progress}%` }} />
                  </div>
                  <input
                    type="range" min={0} max={duration || 100} step={0.1} value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
                <span className="text-white/50 text-xs font-mono tabular-nums w-10 shrink-0 text-right">{formatTime(duration)}</span>
              </div>

              {/* Buttons row — 3-col grid keeps play/pause perfectly centered */}
              <div className="grid grid-cols-3 items-center">
                {/* Left: spacer (matches right col width) */}
                <div />

                {/* Center: back / play-pause / forward */}
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => { handleSeek(Math.max(0, currentTime - 10)); showControls() }}
                    className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                    <RotateCcw size={18} />
                  </button>
                  <button onClick={() => { playing ? handlePause() : handlePlay(); showControls() }}
                    className="w-10 h-10 rounded-full bg-white text-zinc-900 flex items-center justify-center hover:bg-white/90 transition-colors">
                    {playing
                      ? <Pause size={18} fill="currentColor" />
                      : <Play  size={18} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button onClick={() => { handleSeek(Math.min(duration, currentTime + 10)); showControls() }}
                    className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                    <RotateCw size={18} />
                  </button>
                </div>

                {/* Right: volume + fullscreen */}
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
        </div>
      </div>
    </div>
  )
}
