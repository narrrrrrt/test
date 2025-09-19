import { SSEManager } from "./SSEManager";
import type { Seat, RoomStatus, InitData } from "./types";

export class Room {
  black: string | null = null;
  white: string | null = null;
  observers: string[] = [];
  status: RoomStatus = "waiting";

  sse?: SSEManager;

  constructor() {
    // SSEManager はまだ作らない
    // 初めて /sse が呼ばれたときに作る
  }

  // --- セッション追加 ---
  addSession(token: string, seat: Seat) {
    if (seat === "black") this.black = token;
    else if (seat === "white") this.white = token;
    else this.observers.push(token);
  }

  // --- セッション削除 ---
  removeSession(token: string) {
    if (this.black === token) this.black = null;
    if (this.white === token) this.white = null;
    this.observers = this.observers.filter(t => t !== token);
  }

  // --- Init データを作成 ---
  makeInit(): InitData {
    return {
      black: this.black !== null,
      white: this.white !== null,
      status: this.status,
    };
  }

  // --- SSEManager 初期化 ---
  ensureSSE(): SSEManager {
    if (!this.sse) {
      this.sse = new SSEManager(
        () => this.makeInit(),
        (token) => this.removeSession(token)
      );
    }
    return this.sse;
  }
}