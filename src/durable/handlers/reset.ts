import type { Room } from "../Room";
import type { CommonResponse } from "../types";

export async function reset(room: Room, params: Record<string, string>): Promise<Response> {
  // TODO: 実際には room の状態を初期化する処理を入れる
  const res: CommonResponse = { action: "reset", ...params };

  return new Response(JSON.stringify(res), {
    headers: { "Content-Type": "application/json" },
  });
}