import type { RoomStatus, InitData, Seat } from "./types";
import { SSEManager } from "./SSEManager";

export class Room {
  sse!: SSEManager;
  status: RoomStatus = "waiting";
  black: string | null = null;
  white: string | null = null;
  observers: string[] = [];

  constructor() {
    // ここでは sse を new しない
  }

  // Room 完成後に呼び出す
  initSSE() {
    this.sse = new SSEManager(
      () => this.makeInit(),
      (token) => this.removeSession(token)
    );
  }

  makeInit(): InitData {
    return {
      black: !!this.black,
      white: !!this.white,
      status: this.status,
    };
  }

  addSession(token: string, seat: Seat) {
    if (seat === "black") this.black = token;
    else if (seat === "white") this.white = token;
    else this.observers.push(token);
  }

  removeSession(token: string) {
    if (this.black === token) this.black = null;
    if (this.white === token) this.white = null;
    this.observers = this.observers.filter((t) => t !== token);
  }
}