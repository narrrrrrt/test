export class RoomDO {
  state: DurableObjectState;
  env: Env;
  sockets: Map<string, WebSocket>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sockets = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/ws")) {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response("Missing token", { status: 400 });
      }

      const [client, server] = Object.values(new WebSocketPair());
      this.handleWS(server as WebSocket, token);

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  private handleWS(ws: WebSocket, token: string) {
    ws.accept();

    // 登録
    this.sockets.set(token, ws);
    this.broadcastState();

    ws.addEventListener("close", () => {
      this.sockets.delete(token);
      this.broadcastState();
    });

    ws.addEventListener("error", () => {
      this.sockets.delete(token);
      this.broadcastState();
    });
  }

  private broadcastState() {
    const tokens = Array.from(this.sockets.keys());
    const payload = JSON.stringify({
      count: tokens.length,
      tokens,
    });

    for (const ws of this.sockets.values()) {
      try {
        ws.send(payload);
      } catch {
        // エラーが出たソケットは削除
        for (const [t, w] of this.sockets) {
          if (w === ws) this.sockets.delete(t);
        }
      }
    }
  }
}