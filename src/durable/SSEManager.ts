export class SSEManager {
  private connections: Map<string, (msg: string) => void>;

  constructor() {
    this.connections = new Map();
  }

  handleConnection(room: any, token?: string): Response {
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    };

    const stream = new ReadableStream({
      start: (controller) => {
        const encoder = new TextEncoder();
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(msg));

        // Initを送信
        const init = room.makeInit();
        send(`event: Init\ndata: ${JSON.stringify(init)}\n\n`);

        // Pulseを定期送信
        const interval = setInterval(() => {
          send(`event: Pulse\ndata:\n\n`);
        }, 10000);

        if (token) {
          this.addConnection(
            token,
            send,
            controller.closed,
            () => room.removeSession(token)
          );
        }

        controller.closed.then(() => {
          clearInterval(interval);
          if (token) {
            room.removeSession(token);
          }
        });
      },
    });

    return new Response(stream, { headers });
  }

  addConnection(
    token: string,
    send: (msg: string) => void,
    closed: Promise<void>,
    onClose: () => void
  ) {
    this.connections.set(token, send);
    closed.then(() => {
      this.removeConnection(token);
      onClose();
    });
  }

  removeConnection(token: string) {
    this.connections.delete(token);
  }

  broadcast(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const send of this.connections.values()) {
      send(payload);
    }
  }
}