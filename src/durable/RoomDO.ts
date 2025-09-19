export class RoomDO {
  state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    const data = {
      roomId: this.state.id.toString(),
      pathname: url.pathname,
      searchParams: Object.fromEntries(url.searchParams),
    };

    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  }
}