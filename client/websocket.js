class WebSocketClient {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.rooms = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.handlers = new Map();
    this.connected = false;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      this.handleDisconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleMessage(message) {
    const { type } = message;
    const handlers = this.handlers.get(type) || [];
    handlers.forEach(handler => handler(message));
  }

  handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.reconnectDelay *= 2; // Exponential backoff
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
      // Notify user of connection failure
      this.notifyConnectionFailure();
    }
  }

  notifyConnectionFailure() {
    const event = new CustomEvent('websocket:connection-failed', {
      detail: {
        message: 'Unable to establish real-time connection. Some features may be limited.'
      }
    });
    window.dispatchEvent(event);
  }

  joinRoom(room) {
    if (!this.connected) return;
    this.rooms.add(room);
    this.send({
      type: 'join',
      room
    });
  }

  leaveRoom(room) {
    if (!this.connected) return;
    this.rooms.delete(room);
    this.send({
      type: 'leave',
      room
    });
  }

  send(message) {
    if (this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  on(type, handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type).push(handler);
  }

  off(type, handler) {
    if (this.handlers.has(type)) {
      const handlers = this.handlers.get(type);
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Utility methods for specific features
  subscribeToBook(bookId) {
    this.joinRoom(`book:${bookId}`);
  }

  unsubscribeFromBook(bookId) {
    this.leaveRoom(`book:${bookId}`);
  }

  subscribeToNewBooks() {
    this.joinRoom('new_books');
  }

  unsubscribeFromNewBooks() {
    this.leaveRoom('new_books');
  }

  subscribeToUserActivity(userId) {
    this.joinRoom(`user:${userId}`);
  }

  unsubscribeFromUserActivity(userId) {
    this.leaveRoom(`user:${userId}`);
  }
}

// Create and export a singleton instance
const wsClient = new WebSocketClient();
export default wsClient; 