export class RoomDO {
  state: DurableObjectState;
  env: Env;
  roomName: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    // ここで name を取っておく。undefined の場合は fallback。
    this.roomName = state.id.name ?? "unknown";
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    const data = {
      roomId: this.roomName,
      pathname: url.pathname,
      searchParams: Object.fromEntries(url.searchParams),
    };

    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  }
}