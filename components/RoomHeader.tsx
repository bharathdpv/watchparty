'use client'

import { useState } from 'react'
import { Clapperboard, Check, Link, Users, Wifi, WifiOff, MessageSquare } from 'lucide-react'

interface Props {
  roomId: string
  role: 'host' | 'viewer'
  viewerCount?: number
  connected?: boolean
  chatOpen?: boolean
  onToggleChat?: () => void
  unreadCount?: number
}

export default function RoomHeader({ roomId, role, viewerCount = 0, connected = true, chatOpen, onToggleChat, unreadCount = 0 }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    const url = `${window.location.origin}/watch/${roomId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-1.5 text-white font-bold text-sm shrink-0">
          <Clapperboard size={15} className="text-indigo-400" />
          <span className="hidden sm:inline">Watch Party</span>
        </div>
        <code className="text-indigo-400 text-xs sm:text-sm font-mono truncate">{roomId}</code>
        <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium ${
          role === 'host'
            ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-800'
            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
        }`}>
          {role}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {role === 'host' && (
          <span className="text-zinc-400 text-xs sm:text-sm flex items-center gap-1">
            <Users size={13} />
            {viewerCount}
          </span>
        )}
        {role === 'viewer' && (
          <span className={`text-xs flex items-center gap-1 ${connected ? 'text-green-400' : 'text-yellow-400'}`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} className="animate-pulse" />}
            <span className="hidden sm:inline">{connected ? 'Connected' : 'Buffering…'}</span>
          </span>
        )}
        <button
          onClick={copyLink}
          className="flex items-center gap-1 sm:gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors border border-zinc-700"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Link size={12} />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share Link'}</span>
          <span className="sm:hidden">{copied ? '✓' : 'Share'}</span>
        </button>
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className={`relative flex items-center gap-1 sm:gap-1.5 text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors border ${
              chatOpen
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <MessageSquare size={13} />
            <span className="hidden sm:inline">Chat</span>
            {unreadCount > 0 && !chatOpen && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  )
}
