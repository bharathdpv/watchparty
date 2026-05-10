'use client'

import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react'

interface Props {
  playing: boolean
  currentTime: number
  duration: number
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
}

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function PlaybackControls({ playing, currentTime, duration, onPlay, onPause, onSeek }: Props) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="bg-zinc-900 border-t border-zinc-800 px-6 py-4 space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-zinc-400 text-xs font-mono w-12 text-right">{formatTime(currentTime)}</span>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #6366f1 ${progress}%, #3f3f46 ${progress}%)`,
            }}
          />
        </div>
        <span className="text-zinc-400 text-xs font-mono w-12">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onSeek(Math.max(0, currentTime - 10))}
          className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800"
          title="Back 10s"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={playing ? onPause : onPlay}
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-full w-12 h-12 flex items-center justify-center transition-colors"
        >
          {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>
        <button
          onClick={() => onSeek(Math.min(duration, currentTime + 10))}
          className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800"
          title="Forward 10s"
        >
          <RotateCw size={20} />
        </button>
      </div>
    </div>
  )
}
