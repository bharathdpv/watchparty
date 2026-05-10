'use client'

import { useEffect, useState } from 'react'
import { WifiOff, CircleX } from 'lucide-react'
import { getSocket } from '@/lib/socket'
import HostView from '@/components/HostView'
import ViewerView from '@/components/ViewerView'

interface Props {
  roomId: string
}

export default function WatchRoom({ roomId }: Props) {
  const [role, setRole] = useState<'host' | 'viewer' | null>(null)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [viewerCount, setViewerCount] = useState(0)
  const [roomClosed, setRoomClosed] = useState(false)

  useEffect(() => {
    const isHost = sessionStorage.getItem(`role:${roomId}`) === 'host'
    setRole(isHost ? 'host' : 'viewer')
  }, [roomId])

  useEffect(() => {
    if (!role) return

    const socket = getSocket()

    if (role === 'host') {
      socket.emit('create-room', roomId)
      socket.on('room-created', () => {})
    }
    // viewer: join-room emitted inside ViewerView after its listeners are registered

    socket.on('room-error', (msg: string) => setRoomError(msg))
    socket.on('viewer-count', (count: number) => setViewerCount(count))
    socket.on('room-closed', () => setRoomClosed(true))

    return () => {
      socket.off('room-error')
      socket.off('viewer-count')
      socket.off('room-closed')
      socket.off('room-created')
    }
  }, [role, roomId])

  if (roomClosed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <WifiOff size={28} className="text-zinc-500" />
            </div>
          </div>
          <h2 className="text-white text-2xl font-bold">Room Closed</h2>
          <p className="text-zinc-400">The host ended the watch party.</p>
          <a href="/" className="inline-block mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            Go Home
          </a>
        </div>
      </div>
    )
  }

  if (roomError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <CircleX size={28} className="text-red-500" />
            </div>
          </div>
          <h2 className="text-white text-2xl font-bold">Room Not Found</h2>
          <p className="text-zinc-400">{roomError}</p>
          <a href="/" className="inline-block mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            Go Home
          </a>
        </div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-sm animate-pulse">Connecting…</div>
      </div>
    )
  }

  return role === 'host'
    ? <HostView roomId={roomId} viewerCount={viewerCount} />
    : <ViewerView roomId={roomId} />
}
