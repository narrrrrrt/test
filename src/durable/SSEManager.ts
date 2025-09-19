export class SSEManager {
  private connections: Map<string, (msg: string) => void>;

  constructor() {
    this.connections = new Map();
  }

  addConnection(token: string, send: (msg: string) => void, closed: Promise<void>, onClose: () => void) {
    this.connections.set(token, send);

    // 切断検知
    closed.then(() => {
      this.removeConnection(token);
      onClose();
    });
  }

  removeConnection(token: string) {
    this.connections.delete(token);
  }

  broadcast(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const send of this.connections.values()) {
      send(payload);
    }
  }
}