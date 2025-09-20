import type { DurableObjectState } from "@cloudflare/workers-types";
import type { WSMessage } from "./types";
import { Room } from "./Room";
import { handleJoin } from "./handlers/join";
import { handleLeave } from "./handlers/leave";
import { handleMove } from "./handlers/move";
import { handleReset } from "./handlers/reset";

// --- ハンドラーマップ（インポート直下に置く） ---
const handlers: Record<string, Function> = {
  join: handleJoin,
  move: handleMove,
  leave: handleLeave,
  reset: handleReset,
};

export class RoomDO {
  state: DurableObjectState;
  room: Room;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.room = new Room();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\//, "");
    const parts = path.split("/");
    const action = parts[1];

    if (action === "ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      const [client, server] = Object.values(new WebSocketPair());
      this.handleWS(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  private handleWS(ws: WebSocket) {
    ws.accept();

    ws.addEventListener("message", async (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as WSMessage;
        const event = msg.event;

        const handler = (handlers as any)[event];
        if (typeof handler === "function") {
          await handler(this.room, msg, ws);
        } else {
          ws.send(JSON.stringify({ error: `Unknown event: ${event}` }));
        }
      } catch (err: any) {
        ws.send(JSON.stringify({ error: "Invalid message", detail: err?.message }));
      }
    });

    ws.addEventListener("close", () => {
      this.room.removeConnection(ws);
      this.broadcastState();
    });

    this.room.addConnection(ws);
    this.sendState(ws);
  }

  private sendState(ws: WebSocket) {
    ws.send(JSON.stringify({ event: "state", data: this.room.makeState() }));
  }

  private broadcastState() {
    const state = this.room.makeState();
    this.room.broadcast({ event: "state", data: state });
  }
}