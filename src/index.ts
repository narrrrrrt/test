export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // --- アセットに問い合わせ ---
    const assetResp = await env.ASSETS.fetch(request.clone());
    if (assetResp.status !== 404) {
      return assetResp;
    }

    // --- パス分解 ---
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      return new Response("Invalid path", { status: 400 });
    }

    const roomId = parts[0];
    const action = "/" + parts.slice(1).join("/");

    // --- ID 制限 (1〜4 以外は拒否) ---
    if (!["1", "2", "3", "4"].includes(roomId)) {
      return new Response("Room ID must be 1–4", { status: 400 });
    }

    // --- DO フォワード ---
    try {
      const id = env.RoomDO.idFromName(roomId);
      const stub = env.RoomDO.get(id);

      return await stub.fetch(
        new Request(`http://do${action}${url.search}`, request)
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: "DO forward failed",
          message: err?.message ?? String(err),
          stack: err?.stack ?? null,
        }, null, 2),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};

// DO を export
export { RoomDO } from "./durable/RoomDO";