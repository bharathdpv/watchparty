import { createServer } from 'http'
import { Server as IOServer, Socket } from 'socket.io'
import next from 'next'

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
const app = next({ dev, port })
const handle = app.getRequestHandler()

interface Room {
  hostId: string
  viewers: Set<string>
  playbackState: {
    playing: boolean
    currentTime: number
    timestamp: number
  }
}

const rooms = new Map<string, Room>()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res)
  })

  const io = new IOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.on('connection', (socket: Socket) => {
    socket.on('create-room', (roomId: string) => {
      rooms.set(roomId, {
        hostId: socket.id,
        viewers: new Set(),
        playbackState: { playing: false, currentTime: 0, timestamp: Date.now() },
      })
      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.role = 'host'
      socket.emit('room-created', roomId)
    })

    socket.on('join-room', (roomId: string) => {
      const room = rooms.get(roomId)
      if (!room) {
        socket.emit('room-error', 'Room not found')
        return
      }
      room.viewers.add(socket.id)
      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.role = 'viewer'

      socket.to(room.hostId).emit('viewer-joined', socket.id)
      io.to(roomId).emit('viewer-count', room.viewers.size)
      socket.emit('playback-state', room.playbackState)
    })

    // WebRTC signaling — relay between peers
    socket.on('offer', ({ targetId, offer }: { targetId: string; offer: RTCSessionDescriptionInit }) => {
      socket.to(targetId).emit('offer', { fromId: socket.id, offer })
    })

    socket.on('answer', ({ targetId, answer }: { targetId: string; answer: RTCSessionDescriptionInit }) => {
      socket.to(targetId).emit('answer', { fromId: socket.id, answer })
    })

    socket.on('ice-candidate', ({ targetId, candidate }: { targetId: string; candidate: RTCIceCandidateInit }) => {
      socket.to(targetId).emit('ice-candidate', { fromId: socket.id, candidate })
    })

    // Host broadcasts playback state
    socket.on('playback-control', (state: { playing: boolean; currentTime: number; timestamp: number }) => {
      const room = rooms.get(socket.data.roomId)
      if (!room || room.hostId !== socket.id) return
      room.playbackState = state
      socket.to(socket.data.roomId).emit('playback-state', state)
    })

    // Viewer requests current sync from host
    socket.on('request-sync', () => {
      const room = rooms.get(socket.data.roomId)
      if (!room) return
      socket.to(room.hostId).emit('sync-request', socket.id)
    })

    // Host responds to individual viewer sync request
    socket.on('sync-response', ({ viewerId, state }: { viewerId: string; state: { playing: boolean; currentTime: number; timestamp: number } }) => {
      socket.to(viewerId).emit('playback-state', state)
    })

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

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
