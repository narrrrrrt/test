import { Room } from "./Room";
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
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    let params: Record<string, string> = Object.fromEntries(url.searchParams);
    if (request.method === "POST") {
      try {
        const body = await request.json();
        params = { ...params, ...body };
      } catch {}
    }

    // --- SSE ---
    if (path === "/sse") {
      return this.room.sse.handleConnection(this.room, params.token);
    }

    // --- ハンドラーマップ ---
    const handlers = { join, move, leave, reset } as const;
    const endpoint = path.replace(/^\//, "");
    const handler = (handlers as any)[endpoint];
    if (handler) {
      return handler(this.room, params);
    }

    return new Response("Unknown endpoint", { status: 404 });
  }
}