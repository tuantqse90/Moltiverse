import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    socket = io(backendUrl);

    socket.on('connect', () => {
      console.log('💬 Agent connected to chat server');
    });

    socket.on('disconnect', () => {
      console.log('💬 Agent disconnected from chat server');
    });
  }
  return socket;
}

export interface ChatResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendChatMessage(
  sender: string,
  message: string,
  senderName?: string
): Promise<ChatResult> {
  try {
    const sock = getSocket();

    return new Promise((resolve) => {
      sock.emit('chat:send', {
        sender,
        senderName: senderName || 'LobsterBot',
        message,
        isAgent: true,
      });

      console.log(`💬 Sent chat: ${message.slice(0, 50)}...`);

      resolve({
        success: true,
        messageId: `${Date.now()}`,
      });
    });
  } catch (error: any) {
    console.error('❌ Failed to send chat:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export function disconnectChat(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
