class SSEService {
  constructor() {
    this.clients = new Map();
  }

  addClient(sessionId, res) {
    this.clients.set(sessionId, res);
  }

  removeClient(sessionId) {
    this.clients.delete(sessionId);
  }

  getClient(sessionId) {
    return this.clients.get(sessionId);
  }

  sendToClient(sessionId, type, message, data = {}) {
    const client = this.clients.get(sessionId);
    if (client) {
      const payload = {
        type,
        message,
        timestamp: Date.now(),
        ...data,
      };
      client.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  }

  closeClient(sessionId, delay = 1000) {
    setTimeout(() => {
      const client = this.clients.get(sessionId);
      if (client) {
        client.end();
        this.clients.delete(sessionId);
      }
    }, delay);
  }
}

module.exports = new SSEService();
