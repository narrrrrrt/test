export class RoomDO {
  state: DurableObjectState;
  roomName: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    // idFromName に渡した "1" などを name から取り出す
    this.roomName = state.id.name ?? "unknown";
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    const data = {
      roomId: this.roomName,  // ← "1", "2", "3", "4"
      pathname: url.pathname,
      searchParams: Object.fromEntries(url.searchParams),
    };

    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  }
}