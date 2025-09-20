export class RoomDO {
  state: DurableObjectState;
  env: Env;
  sockets: Map<string, WebSocket> = new Map(); // token → WebSocket
  seats: Map<string, string> = new Map();      // token → seat

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/ws")) {
      const { 0: client, 1: server } = new WebSocketPair();
      const body = await request.json().catch(() => ({}));

      let { token, seat } = body;
      seat = seat ?? "observer";

      // 新規の場合 → token を払い出す
      if (!token || !this.seats.has(token)) {
        token = "t" + Math.random().toString(36).slice(2, 10);
        this.seats.set(token, seat);
      }

      const ws = server as WebSocket;
      this.sockets.set(token, ws);

      ws.accept();

      // 初回レスポンス
      this.send(ws, {
        role: this.seats.get(token),
        token,
        count: this.sockets.size,
        tokens: [...this.sockets.keys()],
      });

      // 全体へブロードキャスト
      this.broadcast();

      ws.addEventListener("close", () => {
        this.sockets.delete(token!);
        this.seats.delete(token!);
        this.broadcast();
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  private send(ws: WebSocket, data: any) {
    try {
      ws.send(JSON.stringify(data));
    } catch {}
  }

  private broadcast() {
    const payload = {
      count: this.sockets.size,
      tokens: [...this.sockets.keys()],
    };
    for (const ws of this.sockets.values()) {
      this.send(ws, payload);
    }
  }
}