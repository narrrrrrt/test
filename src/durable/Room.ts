import { Seat, Status, BroadcastMessage } from "./types";

export class Room {
  // 黒と白の token（プレイヤー専用）
  private blackToken: string | null = null;
  private whiteToken: string | null = null;

  // 接続中の WebSocket（observer 含む）
  private sessions: Set<WebSocket> = new Set();

  // ボードの状態
  public board: string[];

  // 現在のステータス
  public status: Status = "waiting";

  // 定数ボード
  public static readonly InitialBoard: string[] = [
    "--------",
    "--------",
    "--------",
    "---WB---",
    "---BW---",
    "--------",
    "--------",
    "--------",
  ];

  public static readonly FlatBoard: string[] = [
    "--------",
    "--------",
    "--------",
    "--------",
    "--------",
    "--------",
    "--------",
    "--------",
  ];

  constructor() {
    this.board = [...Room.InitialBoard];
  }

  // プレイヤー token を割り当てる
  assignSeat(seat: Seat, token: string): void {
    if (seat === "black") {
      this.blackToken = token;
    } else if (seat === "white") {
      this.whiteToken = token;
    }
  }

  // プレイヤー token を外す
  removeSeat(seat: Seat): void {
    if (seat === "black") {
      this.blackToken = null;
    } else if (seat === "white") {
      this.whiteToken = null;
    }
  }

  // token から seat を逆参照（observer は null 扱い）
  getSeatByToken(token: string): Seat | null {
    if (this.blackToken === token) return "black";
    if (this.whiteToken === token) return "white";
    return null;
  }

  // WS セッションを追加
  addSession(ws: WebSocket): void {
    this.sessions.add(ws);
  }

  // WS セッションを削除
  removeSession(ws: WebSocket): void {
    this.sessions.delete(ws);
  }

  // 現在の状態を作る
  getState(): BroadcastMessage {
    return {
      black: this.blackToken !== null,
      white: this.whiteToken !== null,
      status: this.status,
      board: this.board,
    };
  }

  // 全員にブロードキャスト
  broadcast(): void {
    const msg = JSON.stringify(this.getState());
    for (const ws of this.sessions) {
      try {
        ws.send(msg);
      } catch {
        this.sessions.delete(ws);
      }
    }
  }
}