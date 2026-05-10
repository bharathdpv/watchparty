'use client'

import { useState } from 'react'
import { Clapperboard, Check, Link, Users, Wifi, WifiOff } from 'lucide-react'

interface Props {
  roomId: string
  role: 'host' | 'viewer'
  viewerCount?: number
  connected?: boolean
}

export default function RoomHeader({ roomId, role, viewerCount = 0, connected = true }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    const url = `${window.location.origin}/watch/${roomId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-white font-bold text-sm">
          <Clapperboard size={16} className="text-indigo-400" />
          Watch Party
        </div>
        <span className="text-zinc-700">·</span>
        <code className="text-indigo-400 text-sm font-mono">{roomId}</code>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          role === 'host'
            ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-800'
            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
        }`}>
          {role}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {role === 'host' && (
          <span className="text-zinc-400 text-sm flex items-center gap-1.5">
            <Users size={14} />
            {viewerCount}
          </span>
        )}
        {role === 'viewer' && (
          <span className={`text-xs flex items-center gap-1.5 ${connected ? 'text-green-400' : 'text-yellow-400'}`}>
            {connected
              ? <Wifi size={13} />
              : <WifiOff size={13} className="animate-pulse" />}
            {connected ? 'Connected' : 'Buffering…'}
          </span>
        )}
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border border-zinc-700"
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Link size={13} />}
          {copied ? 'Copied!' : 'Share Link'}
        </button>
      </div>
    </header>
  )
}
