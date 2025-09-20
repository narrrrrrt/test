import type { Room } from "../Room";
import type { WSMessage, JoinResult, BroadcastMessage, ResponseMessage } from "../types";
import { handleJoinLogic } from "../logic/join_L";

export async function handleJoin(
  room: Room,
  msg: WSMessage,
  ws: WebSocket
): Promise<ResponseMessage> {
  // ロジックで role/token を決定
  const { role, token }: JoinResult = handleJoinLogic(room, msg);

  // セッション登録
  room.addSession(token, ws);

  // --- ロールが observer 以外のときだけブロードキャスト ---
  if (result.role !== "observer") {
    const broadcast: BroadcastMessage = {
      event: "join",
      data: {
        black: room.black !== null,
        white: room.white !== null,
        status: room.status,
        board: room.board,
      },
    };
    room.broadcast(broadcast);
  }

  // レスポンス
  const response: ResponseMessage = {
    event: "join",
    role,
    token,
  };

  return response;
}