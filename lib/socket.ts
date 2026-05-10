import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    // In prod, NEXT_PUBLIC_SOCKET_URL points to the deployed server.
    // In dev, omit URL → connects to same origin (localhost:3000).
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || undefined
    socket = io(url as string, { autoConnect: true })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
