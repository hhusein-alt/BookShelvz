const WebSocket = require('ws');
const logger = require('./utils/logger');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map of client ID to WebSocket
    this.rooms = new Map(); // Map of room ID to Set of client IDs

    this.init();
  }

  init() {
    this.wss.on('connection', (ws, req) => {
      const clientId = Math.random().toString(36).substring(7);
      this.clients.set(clientId, ws);

      logger.info(`WebSocket client connected: ${clientId}`);

      // Send initial connection success message
      this.sendToClient(clientId, {
        type: 'connection',
        status: 'connected',
        clientId
      });

      // Handle messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(clientId, data);
        } catch (error) {
          logger.error('WebSocket message parsing error:', error);
          this.sendToClient(clientId, {
            type: 'error',
            message: 'Invalid message format'
          });
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
        this.handleDisconnect(clientId);
      });
    });
  }

  handleMessage(clientId, data) {
    const { type, room, message } = data;

    switch (type) {
      case 'join':
        this.joinRoom(clientId, room);
        break;
      case 'leave':
        this.leaveRoom(clientId, room);
        break;
      case 'message':
        this.broadcastToRoom(room, {
          type: 'message',
          clientId,
          message,
          timestamp: Date.now()
        });
        break;
      default:
        logger.warn(`Unknown message type from client ${clientId}: ${type}`);
    }
  }

  handleDisconnect(clientId) {
    // Remove from all rooms
    this.rooms.forEach((clients, room) => {
      if (clients.has(clientId)) {
        this.leaveRoom(clientId, room);
      }
    });

    // Remove client
    this.clients.delete(clientId);
    logger.info(`WebSocket client disconnected: ${clientId}`);
  }

  joinRoom(clientId, room) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room).add(clientId);

    // Notify room of new member
    this.broadcastToRoom(room, {
      type: 'room',
      action: 'join',
      clientId,
      timestamp: Date.now()
    });

    logger.info(`Client ${clientId} joined room ${room}`);
  }

  leaveRoom(clientId, room) {
    if (this.rooms.has(room)) {
      this.rooms.get(room).delete(clientId);

      // Notify room of departure
      this.broadcastToRoom(room, {
        type: 'room',
        action: 'leave',
        clientId,
        timestamp: Date.now()
      });

      // Clean up empty rooms
      if (this.rooms.get(room).size === 0) {
        this.rooms.delete(room);
      }

      logger.info(`Client ${clientId} left room ${room}`);
    }
  }

  broadcastToRoom(room, message) {
    if (this.rooms.has(room)) {
      this.rooms.get(room).forEach(clientId => {
        this.sendToClient(clientId, message);
      });
    }
  }

  broadcastToAll(message) {
    this.clients.forEach((ws, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  sendToClient(clientId, message) {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Utility methods for specific notifications
  notifyBookUpdate(bookId, update) {
    this.broadcastToRoom(`book:${bookId}`, {
      type: 'book_update',
      bookId,
      update,
      timestamp: Date.now()
    });
  }

  notifyNewBook(book) {
    this.broadcastToRoom('new_books', {
      type: 'new_book',
      book,
      timestamp: Date.now()
    });
  }

  notifyUserActivity(userId, activity) {
    this.broadcastToRoom(`user:${userId}`, {
      type: 'user_activity',
      userId,
      activity,
      timestamp: Date.now()
    });
  }
}

module.exports = WebSocketServer; 