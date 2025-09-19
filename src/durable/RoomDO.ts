import { Room } from "./Room";
import type { Env } from "./types";
import { join } from "./handlers/join";
import { move } from "./handlers/move";
import { leave } from "./handlers/leave";
import { reset } from "./handlers/reset";

export class RoomDO {
  state: DurableObjectState;
  room: Room;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.room = new Room();
    this.room.initSSE(); // Room 完成後に SSEManager を初期化
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- パラメータ抽出 ---
    let params: Record<string, string> = Object.fromEntries(url.searchParams);
    if (request.method === "POST") {
      try {
        const body = await request.json();
        params = { ...params, ...body };
      } catch {
        // body が空なら無視
      }
    }

    // --- SSE ---
    if (path.endsWith("/sse")) {
      return this.room.sse.handleConnection(params.token || null);
    }

    // --- ハンドラーマップ ---
    const handlers = { join, move, leave, reset } as const;

    const endpoint = path.replace(/^\//, "").split("/").pop() || "";
    const handler = (handlers as any)[endpoint];
    if (handler) {
      return handler(this.room, params);
    }

    return new Response("Unknown endpoint", { status: 404 });
  }
}