import type { Room } from "../Room";
import type { CommonResponse } from "../types";

export async function move(room: Room, params: Record<string, string>): Promise<Response> {
  // TODO: 実際には駒を置いた処理をここでやる
  const res: CommonResponse = { action: "move", ...params };

  return new Response(JSON.stringify(res), {
    headers: { "Content-Type": "application/json" },
  });
}