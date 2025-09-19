import type { Room } from "./Room";

export class SSEManager {
  private connections: Map<
    string,
    { send: (msg: string) => void; queue: string[]; active: boolean; processing: boolean }
  >;

  constructor() {
    this.connections = new Map();
  }

  // --- Durable Object から呼ばれる: SSE接続開始 ---
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

        if (token) {
          this.addConnection(
            token,
            send,
            controller.closed,
            () => room.removeSession(token)
          );
        }

        // 接続直後に Init を broadcast 経由で送信
        this.broadcast("Init", room.makeInit());

        // Pulse を定期送信（これも broadcast 経由）
        const interval = setInterval(() => {
          this.broadcast("Pulse", "");
        }, 10000);

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

  // --- 接続登録 ---
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

  // --- 接続削除 ---
  removeConnection(token: string) {
    this.connections.delete(token);
  }

  // --- 全員に送信（順序保証あり） ---
  broadcast(event: string, data: any) {
    if (this.connections.size === 0) {
      return; // 誰もいなければ何もしない
    }

    const payload =
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const conn of this.connections.values()) {
      if (!conn.active) continue;
      conn.queue.push(payload);
      this.processQueue(conn);
    }
  }

  // --- 内部処理: キューを順に処理 ---
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