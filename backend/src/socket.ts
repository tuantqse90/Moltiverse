import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function setSocketInstance(socketServer: SocketServer) {
  io = socketServer;
}

export function getSocketInstance(): SocketServer | null {
  return io;
}

export function emitToAll(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}

export function emitToUser(socketId: string, event: string, data: any) {
  if (io) {
    io.to(socketId).emit(event, data);
  }
}
