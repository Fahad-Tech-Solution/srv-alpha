import { Server } from 'socket.io'
import { verifyToken } from './jwt'

let io: Server | null = null

export const initRealtime = (httpServer: import('http').Server): Server => {
  io = new Server(httpServer, {
    cors: {
      origin:
        process.env.CORS_ORIGIN?.split(',') || [
          'http://localhost:3000',
          'http://localhost:5173',
        ],
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) {
      next(new Error('Unauthorized'))
      return
    }

    try {
      const decoded = verifyToken(token)
      socket.data.user = decoded
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user as { userId: string; role: string }
    socket.join(`user:${user.userId}`)

    if (user.role === 'admin') {
      socket.join('admins')
    }
  })

  return io
}

export const emitAdminNotification = (notification: Record<string, unknown>): void => {
  io?.to('admins').emit('admin:notification', notification)
}
