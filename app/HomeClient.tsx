'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, AlertCircle } from 'lucide-react'

export default function HomeClient() {
  const router = useRouter()
  const [joinCode,  setJoinCode]  = useState('')
  const [joinError, setJoinError] = useState('')
  const [creating,  setCreating]  = useState(false)

  function createRoom() {
    setCreating(true)
    const roomId = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    sessionStorage.setItem(`role:${roomId}`, 'host')
    router.push(`/watch/${roomId}`)
  }

  function joinRoom() {
    const id = joinCode.trim().replace(/^.+\/watch\//, '').split('/')[0]
    if (!id) { setJoinError('Paste a room code or full link'); return }
    router.push(`/watch/${id}`)
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">

      {/* Host */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-6">
        <div>
          <span className="inline-block text-[11px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full mb-4">
            Host
          </span>
          <h2 className="text-[17px] font-bold text-white mb-2">Create a room</h2>
          <p className="text-[13px] text-white/40 leading-relaxed">
            A unique room link is generated instantly in your browser.
            Share it with anyone — they join without an account.
            You control playback for the entire room.
          </p>
        </div>
        <button
          onClick={createRoom}
          disabled={creating}
          className="mt-auto flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[14px] font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-900/30 active:scale-[.99]"
        >
          {creating ? 'Creating room…' : <><span>Create room</span> <ArrowRight size={15} /></>}
        </button>
      </div>

      {/* Viewer */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-6">
        <div>
          <span className="inline-block text-[11px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full mb-4">
            Viewer
          </span>
          <h2 className="text-[17px] font-bold text-white mb-2">Join a room</h2>
          <p className="text-[13px] text-white/40 leading-relaxed">
            Paste the room code or the full link you received from the host.
            Watch Party extracts the code automatically from any URL format.
          </p>
        </div>
        <div className="mt-auto space-y-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value); setJoinError('') }}
              onKeyDown={e => e.key === 'Enter' && joinRoom()}
              placeholder="Room code or link"
              className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.10] text-white placeholder-white/25 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition-all"
            />
            <button
              onClick={joinRoom}
              className="bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.10] text-white text-[13px] font-semibold px-5 rounded-xl transition-colors active:scale-[.99] shrink-0"
            >
              Join
            </button>
          </div>
          {joinError && (
            <p className="flex items-center gap-1.5 text-red-400 text-[12px]">
              <AlertCircle size={12} /> {joinError}
            </p>
          )}
        </div>
      </div>

    </div>
  )
}
