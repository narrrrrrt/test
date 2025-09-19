export class RoomDO {
  state: DurableObjectState;
  connections: Set<WritableStreamDefaultWriter>;
  count: number;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.connections = new Set();
    this.count = 0;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname.endsWith("/count")) {
      return this.handleSSE();
    }

    return new Response("Unknown endpoint", { status: 404 });
  }

  private async handleSSE(): Promise<Response> {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    this.connections.add(writer);

    // 接続数を +1 して全員に通知
    this.count++;
    this.broadcast();

    // 🔔 クライアント切断を監視
    const reader = readable.getReader();
    reader.closed.then(() => {
      this.connections.delete(writer);
      this.count--;
      this.broadcast();
    });

    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    };

    return new Response(readable, { headers });
  }

  private broadcast() {
    const msg =
      `event: stats\n` +
      `data: ${JSON.stringify({ connections: this.count })}\n\n`;

    const encoder = new TextEncoder();
    const data = encoder.encode(msg);

    for (const writer of this.connections) {
      writer.write(data).catch(() => {
        // 書き込み失敗は無視
      });
    }
  }
}