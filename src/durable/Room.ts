import type { Session, RoomStatus, InitData, Seat } from "./types";
import { SSEManager } from "./SSEManager";

export class Room {
  black: string | null = null;
  white: string | null = null;
  observers: string[] = [];
  status: RoomStatus = "waiting";
  sessions: Map<string, Session> = new Map();
  sse: SSEManager = new SSEManager();

  addSession(token: string, seat: Seat) {
    if (seat === "black") this.black = token;
    else if (seat === "white") this.white = token;
    else this.observers.push(token);

    this.sessions.set(token, { seat });
  }

  removeSession(token: string) {
    const session = this.sessions.get(token);
    if (!session) return;

    if (session.seat === "black") this.black = null;
    else if (session.seat === "white") this.white = null;
    else this.observers = this.observers.filter(t => t !== token);

    this.sessions.delete(token);
    this.sse.removeConnection(token);
  }

  makeInit(): InitData {
    return {
      black: this.black !== null,
      white: this.white !== null,
      status: this.status,
    };
  }
}