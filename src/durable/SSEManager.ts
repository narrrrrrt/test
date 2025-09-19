export class SSEManager {
  private connections: Map<
    string,
    { send: (msg: string) => void; queue: string[]; active: boolean; processing: boolean }
  >;

  constructor() {
    this.connections = new Map();
  }

  addConnection(
    token: string,
    send: (msg: string) => void,
    closed: Promise<void>,
    onClose: () => void
  ) {
    this.connections.set(token, {
      send,
      queue: [],
      active: true,
      processing: false,
    });

    closed.then(() => {
      const conn = this.connections.get(token);
      if (conn) {
        conn.active = false;
        this.connections.delete(token);
      }
      onClose();
    });
  }

  removeConnection(token: string) {
    this.connections.delete(token);
  }

  broadcast(event: string, data: any) {
    if (this.connections.size === 0) {
      return; // 誰も繋がっていなければ何もしない
    }

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const [token, conn] of this.connections) {
      if (!conn.active) continue;
      conn.queue.push(payload);
      this.processQueue(conn);
    }
  }

  private async processQueue(conn: {
    send: (msg: string) => void;
    queue: string[];
    active: boolean;
    processing: boolean;
  }) {
    if (conn.processing) return;
    conn.processing = true;

    while (conn.queue.length > 0 && conn.active) {
      const msg = conn.queue.shift()!;
      try {
        conn.send(msg);
      } catch (err) {
        console.error("SSE send failed", err);
        conn.active = false;
        break;
      }
    }

    conn.processing = false;
  }
}