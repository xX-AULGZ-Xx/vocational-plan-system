import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export interface DataUpdateEvent {
  scope: 'PROJECTS' | 'APPROVALS' | 'SYSTEM' | 'EVALUATION';
  action: string;
  projectId?: string;
  status?: string;
  stepOrder?: number;
  nextStepOrder?: number;
  leaderId?: string;
  departmentId?: number;
  approverId?: string;
  execution_status?: string;
  timestamp: string;
  [key: string]: any;
}

class WebSocketManager {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map();

  public initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: true,
        credentials: true,
      },
      path: '/socket.io',
      pingInterval: 25000,
      pingTimeout: 20000,
      transports: ['websocket', 'polling'],
    });

    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication token missing'));
      }

      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.id ? decoded.id.toString() : null;

        if (!userId) {
          return next(new Error('Invalid token payload'));
        }

        (socket as any).userId = userId;
        (socket as any).userRole = decoded.role;
        next();
      } catch (err: any) {
        return next(new Error('Authentication failed: ' + err.message));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = (socket as any).userId as string;
      const userRole = (socket as any).userRole as string;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      socket.join(`user:${userId}`);
      if (userRole) {
        socket.join(`role:${userRole}`);
      }

      console.log(`[WebSocket] Connected: user=${userId}, role=${userRole}, socketId=${socket.id}, total clients for user=${this.userSockets.get(userId)?.size}`);

      socket.emit('connected', {
        message: 'WebSocket connected successfully',
        userId,
        timestamp: new Date().toISOString(),
      });

      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      socket.on('disconnect', (reason) => {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.userSockets.delete(userId);
          }
        }
        console.log(`[WebSocket] Disconnected: user=${userId}, reason=${reason}`);
      });
    });

    console.log('✅ WebSocket Manager initialized successfully');
  }

  public sendToUser(userId: string | number | bigint, eventName: string, data: any) {
    const uId = userId.toString();
    if (this.io) {
      this.io.to(`user:${uId}`).emit(eventName, data);
    }
  }

  public sendToRole(role: string, eventName: string, data: any) {
    if (this.io) {
      this.io.to(`role:${role}`).emit(eventName, data);
    }
  }

  public broadcast(eventName: string, data: any) {
    if (this.io) {
      this.io.emit(eventName, data);
    }
  }

  public getOnlineUserCount(): number {
    return this.userSockets.size;
  }
}

export const wsManager = new WebSocketManager();
