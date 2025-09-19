import type { InitData, SSEMessage } from "./types";

export class SSEManager {
  private connections: Map<string, WritableStreamDefaultWriter> = new Map();
  private queue: string[] = [];
  private flushing = false;

  private getInit: () => InitData;
  private onRemove: (token: string) => void;

  constructor(getInit: () => InitData, onRemove: (token: string) => void) {
    this.getInit = getInit;
    this.onRemove = onRemove;
  }

  // --- SSE接続を開始 ---
  handleConnection(token: string | null): Response {
    const stream = new ReadableStream({
      start: (controller) => {
        const writer = controller.writable.getWriter();

        // Init を queue に積んで flush
        const init = this.getInit();
        const initMsg =
          `event: Init\n` +
          `data: ${JSON.stringify(init)}\n\n`;
        this.queue.push(initMsg);
        this.flush();

        if (token) {
          this.connections.set(token, writer);

          // 切断時に token を削除
          controller.closed.then(() => {
            this.removeConnection(token);
          });
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Transfer-Encoding": "chunked",
      },
    });
  }

  // --- 接続削除 ---
  removeConnection(token: string) {
    const writer = this.connections.get(token);
    if (writer) {
      try {
        writer.close();
      } catch {}
    }
    this.connections.delete(token);

    // Room にも通知
    this.onRemove(token);
  }

  // --- メッセージ送信（broadcast） ---
  broadcast(payload: SSEMessage) {
    const msg =
      `event: ${payload.event}\n` +
      `data: ${JSON.stringify(payload.data ?? {})}\n\n`;
    this.queue.push(msg);
    this.flush();
  }

  // --- flush: 順序保証付きで送信 ---
  private async flush() {
    if (this.flushing) return;
    this.flushing = true;

    const encoder = new TextEncoder();

    while (this.queue.length > 0) {
      const msg = this.queue.shift()!;
      const bytes = encoder.encode(msg);

      const toRemove: string[] = [];
      for (const [token, writer] of this.connections) {
        try {
          await writer.write(bytes);
        } catch {
          toRemove.push(token);
        }
      }
      for (const token of toRemove) this.removeConnection(token);
    }

    this.flushing = false;
  }
}