import type { InitData } from "./types";

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

  handleConnection(token: string | null): Response {
    const stream = new ReadableStream({
      start: (controller) => {
        const writer = controller.writable.getWriter();

        // 接続直後に Init をキューに積む
        const init = this.getInit();
        const msg =
          `event: Init\n` +
          `data: ${JSON.stringify(init)}\n\n`;
        this.enqueue(msg);

        if (token) {
          this.connections.set(token, writer);
          controller.closed.then(() => {
            this.removeConnection(token);
          });
        } else {
          // tokenなし → 一発Initだけ送って終わり
          writer.write(new TextEncoder().encode(msg)).catch(() => {});
          writer.close().catch(() => {});
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

  private enqueue(msg: string) {
    this.queue.push(msg);
    this.flush();
  }

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

  broadcast(event: string, data: any) {
    const msg =
      `event: ${event}\n` +
      `data: ${JSON.stringify(data ?? {})}\n\n`;
    this.enqueue(msg);
  }

  removeConnection(token: string) {
    const writer = this.connections.get(token);
    if (writer) {
      try {
        writer.close();
      } catch {}
    }
    this.connections.delete(token);
    this.onRemove(token);
  }
}