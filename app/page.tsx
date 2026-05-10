'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clapperboard } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')

  function createRoom() {
    const roomId = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    sessionStorage.setItem(`role:${roomId}`, 'host')
    router.push(`/watch/${roomId}`)
  }

  function joinRoom() {
    const id = joinCode.trim()
    if (!id) {
      setJoinError('Enter a room code')
      return
    }
    router.push(`/watch/${id}`)
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <Clapperboard size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Watch Party</h1>
          <p className="text-zinc-400 text-sm">
            Stream local video files in real time with friends
          </p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
          <div>
            <h2 className="text-white font-semibold text-lg">Host a Party</h2>
            <p className="text-zinc-500 text-sm mt-1">
              Create a room and stream a video from your device
            </p>
          </div>
          <button
            onClick={createRoom}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Create Room
          </button>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
          <div>
            <h2 className="text-white font-semibold text-lg">Join a Party</h2>
            <p className="text-zinc-500 text-sm mt-1">
              Enter a room code to watch with the host
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value); setJoinError('') }}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              placeholder="Room code"
              className="flex-1 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={joinRoom}
              className="bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-800 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
            >
              Join
            </button>
          </div>
          {joinError && <p className="text-red-400 text-sm">{joinError}</p>}
        </div>

        <p className="text-center text-zinc-600 text-xs">
          Video streams directly peer-to-peer — nothing is uploaded to any server
        </p>
      </div>
    </main>
  )
}
