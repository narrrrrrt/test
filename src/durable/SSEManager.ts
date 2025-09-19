import type { InitData, SSEMessage } from "./types";

export class SSEManager {
  private connections: Map<string, WritableStreamDefaultWriter> = new Map();
  private queue: string[] = [];
  private flushing = false;

  private getInit: () => InitData;
  private onRemove: (token: string) => void;

  constructor(getInit: () => InitData, onRemove: (token: string) => void) {
    this.getInit = getInit;
    this.onRemove = onRemove;
  }

  // 新しい接続を登録
  addConnection(token: string, writer: WritableStreamDefaultWriter) {
    this.connections.set(token, writer);

    // ✅ 接続直後に Init を即送信（true/false の状態付き）
    const init = this.getInit();
    const initMsg =
      `event: Init\n` +
      `data: ${JSON.stringify(init)}\n\n`;
    this.queue.push(initMsg);
    this.flush();
  }

  // 接続を削除（切断時に呼ぶ）
  removeConnection(token: string) {
    const writer = this.connections.get(token);
    if (writer) {
      try {
        writer.close();
      } catch {}
    }
    this.connections.delete(token);

    // ✅ Room にも通知
    this.onRemove(token);
  }

  // ブロードキャスト
  broadcast(payload: SSEMessage) {
    const msg =
      `event: ${payload.event}\n` +
      `data: ${JSON.stringify(payload.data ?? {})}\n\n`;
    this.queue.push(msg);
    this.flush();
  }

  // flush: 順序を守って送信
  private async flush() {
    if (this.flushing) return;
    this.flushing = true;

    const encoder = new TextEncoder();

    while (this.queue.length > 0) {
      const msg = this.queue.shift()!;
      const bytes = encoder.encode(msg);

      const toRemove: string[] = [];
      for (const [token, writer] of this.connections) {
        try {
          await writer.write(bytes);
        } catch {
          toRemove.push(token);
        }
      }
      for (const token of toRemove) this.removeConnection(token);
    }

    this.flushing = false;
  }
}