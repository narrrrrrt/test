import type { InitData } from "./types";

export class SSEManager {
  private connections: Map<string, WritableStreamDefaultWriter> = new Map();
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

        // 接続直後に Init を送信
        const init = this.getInit();
        const msg =
          `event: Init\n` +
          `data: ${JSON.stringify(init)}\n\n`;
        writer.write(new TextEncoder().encode(msg)).catch(() => {});

        if (token) {
          // 管理対象に追加
          this.connections.set(token, writer);

          // 切断時にセッション削除
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
      try {
        writer.close();
      } catch {}
    }
    this.connections.delete(token);
    this.onRemove(token);
  }

  broadcast(event: string, data: any) {
    const msg =
      `event: ${event}\n` +
      `data: ${JSON.stringify(data ?? {})}\n\n`;
    const bytes = new TextEncoder().encode(msg);

    const toRemove: string[] = [];
    for (const [token, writer] of this.connections) {
      writer.write(bytes).catch(() => toRemove.push(token));
    }
    for (const t of toRemove) this.removeConnection(t);
  }
}