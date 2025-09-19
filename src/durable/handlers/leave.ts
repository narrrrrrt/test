import type { Room } from "../Room";
import type { CommonResponse } from "../types";

export async function leave(room: Room, params: Record<string, string>): Promise<Response> {
  // TODO: 実際には room.removeSession(token) などを呼ぶ
  const res: CommonResponse = { action: "leave", ...params };

  return new Response(JSON.stringify(res), {
    headers: { "Content-Type": "application/json" },
  });
}