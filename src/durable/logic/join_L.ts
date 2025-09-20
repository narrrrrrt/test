import type { Room } from "../Room";
import type { Seat } from "../types";

// トークン生成
function generateToken(): string {
  return "a" + Math.floor(Math.random() * 1e8).toString().padStart(8, "0");
}

/**
 * join ロジック
 * - 既存 token の場合はそれを尊重
 * - 無い場合は新規発行
 * - 席が指定されていなければ observer
 */
export function joinLogic(
  room: Room,
  msg: { data?: Record<string, any> }
): { token: string; role: Seat } {
  const seat = (msg.data?.seat as Seat) ?? "observer";
  const token = msg.data?.token ?? generateToken();

  // ルームにセッション追加
  room.addSession(token, seat);

  return { token, role: seat };
}