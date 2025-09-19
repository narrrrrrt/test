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
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start: async (controller) => {
        const writer = controller.writable.getWriter();

        // ✅ Init を即送信（この時点の Room 状態）
        const init = this.getInit();
        const initMsg = `event: Init\ndata: ${JSON.stringify(init)}\n\n`;
        await writer.write(encoder.encode(initMsg));

        if (token) {
          this.connections.set(token, writer);

          // ✅ 切断時にトークン削除
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

  removeConnection(token: string) {
    const writer = this.connections.get(token);
    if (writer) {
      try { writer.close(); } catch {}
    }
    this.connections.delete(token);

    // ✅ Room 側に通知
    this.onRemove(token);
  }

  broadcast(payload: SSEMessage) {
    const msg =
      `event: ${payload.event}\n` +
      `data: ${JSON.stringify(payload.data ?? {})}\n\n`;
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
}