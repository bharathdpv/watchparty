import { createServer } from 'http'
import { Server as IOServer, Socket } from 'socket.io'
import next from 'next'

const dev  = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
const app  = next({ dev, port })
const handle = app.getRequestHandler()

interface PlaybackState {
  playing: boolean
  currentTime: number
  timestamp: number
}

interface Room {
  hostId: string
  viewers: Set<string>
  playbackState: PlaybackState
  videoSource: { type: 'youtube'; videoId: string } | { type: 'local' } | null
}

const rooms = new Map<string, Room>()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => { handle(req, res) })

  const io = new IOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.on('connection', (socket: Socket) => {

    socket.on('create-room', (roomId: string) => {
      rooms.set(roomId, {
        hostId: socket.id,
        viewers: new Set(),
        playbackState: { playing: false, currentTime: 0, timestamp: Date.now() },
        videoSource: null,
      })
      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.role   = 'host'
      socket.emit('room-created', roomId)
    })

    socket.on('join-room', (roomId: string) => {
      const room = rooms.get(roomId)
      if (!room) { socket.emit('room-error', 'Room not found'); return }

      room.viewers.add(socket.id)
      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.role   = 'viewer'

      socket.to(room.hostId).emit('viewer-joined', socket.id)
      io.to(roomId).emit('viewer-count', room.viewers.size)

      // Send current video source so late-joining viewers load the right video
      if (room.videoSource?.type === 'youtube') {
        socket.emit('youtube-video', room.videoSource.videoId)
      }
      socket.emit('playback-state', room.playbackState)
    })

    // ── YouTube source ────────────────────────────────────────────────────────
    socket.on('set-youtube', (videoId: string) => {
      const room = rooms.get(socket.data.roomId)
      if (!room || room.hostId !== socket.id) return
      room.videoSource    = { type: 'youtube', videoId }
      room.playbackState  = { playing: false, currentTime: 0, timestamp: Date.now() }
      // Broadcast to everyone in room including host (confirms set)
      io.to(socket.data.roomId).emit('youtube-video', videoId)
    })

    // ── WebRTC signaling (local file mode) ────────────────────────────────────
    socket.on('offer',         ({ targetId, offer }:      { targetId: string; offer: RTCSessionDescriptionInit })      => socket.to(targetId).emit('offer',         { fromId: socket.id, offer }))
    socket.on('answer',        ({ targetId, answer }:     { targetId: string; answer: RTCSessionDescriptionInit })     => socket.to(targetId).emit('answer',        { fromId: socket.id, answer }))
    socket.on('ice-candidate', ({ targetId, candidate }:  { targetId: string; candidate: RTCIceCandidateInit })        => socket.to(targetId).emit('ice-candidate',  { fromId: socket.id, candidate }))

    // ── Playback sync ─────────────────────────────────────────────────────────
    socket.on('playback-control', (state: PlaybackState) => {
      const room = rooms.get(socket.data.roomId)
      if (!room || room.hostId !== socket.id) return
      room.playbackState = state
      socket.to(socket.data.roomId).emit('playback-state', state)
    })

    socket.on('request-sync', () => {
      const room = rooms.get(socket.data.roomId)
      if (!room) return
      socket.to(room.hostId).emit('sync-request', socket.id)
    })

    socket.on('sync-response', ({ viewerId, state }: { viewerId: string; state: PlaybackState }) => {
      socket.to(viewerId).emit('playback-state', state)
    })

    // ── Chat ─────────────────────────────────────────────────────────────────
    socket.on('chat-message', (text: string, cb?: (r: object) => void) => {
      const room = rooms.get(socket.data.roomId)
      console.log('[chat] from', socket.id, 'roomId=', socket.data.roomId, 'found=', !!room, 'role=', socket.data.role)
      if (!room || typeof text !== 'string') {
        cb?.({ ok: false, reason: !room ? 'no-room' : 'bad-text', roomId: socket.data.roomId })
        return
      }
      const msg = {
        id:        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role:      socket.data.role as 'host' | 'viewer',
        socketId:  socket.id,
        text:      text.slice(0, 500),
        timestamp: Date.now(),
      }
      io.to(socket.data.roomId).emit('chat-message', msg)
      cb?.({ ok: true })
    })

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { roomId, role } = socket.data
      if (!roomId) return
      const room = rooms.get(roomId)
      if (!room) return
      if (role === 'host') {
        io.to(roomId).emit('room-closed')
        rooms.delete(roomId)
      } else {
        room.viewers.delete(socket.id)
        io.to(roomId).emit('viewer-count', room.viewers.size)
        socket.to(room.hostId).emit('viewer-left', socket.id)
      }
    })
  })

  httpServer.listen(port, () => console.log(`> Ready on http://localhost:${port}`))
})
