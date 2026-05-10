'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, X } from 'lucide-react'
import { getSocket } from '@/lib/socket'

interface ChatMessage {
  id:        string
  role:      'host' | 'viewer'
  socketId:  string
  text:      string
  timestamp: number
}

interface Props {
  mySocketId: string
  visible: boolean
  onUnread?: (count: number) => void
  onClose?: () => void
}

export default function Chat({ mySocketId, visible, onUnread, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input,    setInput]    = useState('')
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const visibleRef = useRef(visible)
  useEffect(() => { visibleRef.current = visible }, [visible])

  useEffect(() => {
    const socket = getSocket()
    const handler = (msg: ChatMessage) => {
      console.log('[Chat] received chat-message', msg)
      setMessages(prev => [...prev, msg])
      if (!visibleRef.current) onUnread?.(1)
    }
    socket.on('chat-message', handler)
    return () => { socket.off('chat-message', handler) }
  }, [onUnread])

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send() {
    const text = input.trim()
    if (!text) return
    const s = getSocket()
    console.log('[Chat] emit chat-message, connected=', s.connected, 'id=', s.id)
    s.emit('chat-message', text, (ack: object) => {
      console.log('[Chat] server ack:', JSON.stringify(ack))
    })
    setInput('')
    inputRef.current?.focus()
  }

  // Mobile: fixed full-screen overlay. Desktop: sidebar.
  return (
    <div className={`
      flex flex-col bg-zinc-900 border-zinc-800 shrink-0
      fixed inset-0 z-50
      sm:relative sm:inset-auto sm:z-auto sm:w-72 sm:border-l
      ${visible ? 'flex' : 'hidden'}
    `}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-white text-sm font-semibold">Chat</span>
        {onClose && (
          <button onClick={onClose} className="sm:hidden p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
        {messages.length === 0 && (
          <p className="text-zinc-600 text-xs text-center pt-4">No messages yet. Say hi!</p>
        )}
        {messages.map(msg => {
          const isMe = msg.socketId === mySocketId
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-xs font-semibold ${msg.role === 'host' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                  {isMe ? 'You' : msg.role === 'host' ? 'Host' : 'Viewer'}
                </span>
                <span className="text-zinc-600 text-xs">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words ${
                isMe
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-zinc-800 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Message…"
          maxLength={500}
          className="flex-1 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
