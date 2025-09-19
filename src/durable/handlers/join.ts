import type { Room } from "../Room";
import type { JoinResponse, Seat } from "../types";

function generateToken(): string {
  return "a" + Math.floor(Math.random() * 1e8).toString().padStart(8, "0");
}

export async function join(room: Room, params: Record<string, string>): Promise<Response> {
  const seat = (params.seat as Seat) ?? "observer";
  const token = generateToken();

  // セッション追加
  room.addSession(token, seat);

  // 返すレスポンス
  const res: JoinResponse = { token };

  // 🔔 ブロードキャスト (イベント: Join, データ: InitData)
  const initData = room.makeInit();
  room.sse.broadcast("Join", initData);

  return new Response(JSON.stringify(res), {
    headers: { "Content-Type": "application/json" },
  });
}