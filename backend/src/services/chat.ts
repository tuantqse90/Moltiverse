import { db, isDatabaseAvailable } from '../db';
import { chatMessages, NewChatMessage, ChatMessage } from '../db/schema';
import { desc, eq } from 'drizzle-orm';

export class ChatService {
  // Get recent chat messages
  static async getHistory(limit: number = 100): Promise<any[]> {
    if (!isDatabaseAvailable()) return [];
    try {
      const messages = await db!
        .select()
        .from(chatMessages)
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);

      // Convert to frontend format and reverse to oldest first
      return messages.reverse().map((msg) => ({
        id: msg.messageId,
        sender: msg.sender,
        senderName: msg.senderName,
        message: msg.message,
        timestamp: msg.createdAt?.getTime() || Date.now(),
        isAgent: msg.isAgent || false,
        reactions: msg.reactions || {},
        replyTo: msg.replyToId
          ? {
              id: msg.replyToId,
              sender: msg.replyToSender || '',
              senderName: msg.replyToSenderName,
              message: msg.replyToMessage || '',
            }
          : undefined,
      }));
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  }

  // Save a new message
  static async saveMessage(data: {
    id: string;
    sender: string;
    senderName?: string;
    message: string;
    isAgent?: boolean;
    replyTo?: {
      id: string;
      sender: string;
      senderName?: string;
      message: string;
    };
  }): Promise<ChatMessage | null> {
    try {
      const newMessage: NewChatMessage = {
        messageId: data.id,
        sender: data.sender,
        senderName: data.senderName,
        message: data.message,
        isAgent: data.isAgent || false,
        reactions: {},
      };

      // Add reply data if present
      if (data.replyTo) {
        newMessage.replyToId = data.replyTo.id;
        newMessage.replyToSender = data.replyTo.sender;
        newMessage.replyToSenderName = data.replyTo.senderName;
        newMessage.replyToMessage = data.replyTo.message;
      }

      if (!isDatabaseAvailable()) return null;
      const [saved] = await db!.insert(chatMessages).values(newMessage).returning();
      return saved;
    } catch (error) {
      console.error('Error saving chat message:', error);
      return null;
    }
  }

  // Update reactions on a message
  static async updateReactions(
    messageId: string,
    reactions: Record<string, string[]>
  ): Promise<boolean> {
    if (!isDatabaseAvailable()) return false;
    try {
      await db!
        .update(chatMessages)
        .set({ reactions })
        .where(eq(chatMessages.messageId, messageId));
      return true;
    } catch (error) {
      console.error('Error updating reactions:', error);
      return false;
    }
  }

  // Get a single message by ID
  static async getMessage(messageId: string): Promise<ChatMessage | null> {
    if (!isDatabaseAvailable()) return null;
    try {
      const [message] = await db!
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.messageId, messageId))
        .limit(1);
      return message || null;
    } catch (error) {
      console.error('Error fetching message:', error);
      return null;
    }
  }
}
