import type { Room } from "./Room";

export class SSEManager {
  private connections: Map<
    string,
    { send: (msg: string) => void; queue: string[]; active: boolean; processing: boolean }
  >;

  constructor() {
    this.connections = new Map();
  }

  // --- DOから直接呼ばれる: SSE接続開始 ---
  handleConnection(room: Room, token?: string): Response {
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    };

    const stream = new ReadableStream({
      start: (controller) => {
        const encoder = new TextEncoder();
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(msg));

        // Init送信
        const init = room.makeInit();
        send(`event: Init\ndata: ${JSON.stringify(init)}\n\n`);

        // Pulse送信（下りの心拍）
        const interval = setInterval(() => {
          send(`event: Pulse\ndata:\n\n`);
        }, 10000);

        if (token) {
          this.addConnection(
            token,
            send,
            controller.closed,
            () => room.removeSession(token)
          );
        }

        controller.closed.then(() => {
          clearInterval(interval);
          if (token) {
            room.removeSession(token);
          }
        });
      },
    });

    return new Response(stream, { headers });
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
      return;
    }
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const conn of this.connections.values()) {
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