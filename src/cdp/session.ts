import type { CdpEvent, CdpResponse } from "./types.js";

interface PendingCommand {
  reject: (error: Error) => void;
  resolve: (value: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface CdpCommand {
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface RuntimeEvaluateResult {
  exceptionDetails?: {
    description?: string;
    text?: string;
  };
  result?: {
    description?: string;
    value?: unknown;
  };
}

export class CdpSession {
  private readonly pending = new Map<number, PendingCommand>();
  private nextId = 1;
  private socket: WebSocket | null = null;

  private constructor(private readonly commandTimeoutMs: number) {}

  static async connect(url: string, commandTimeoutMs = 8_000): Promise<CdpSession> {
    const session = new CdpSession(commandTimeoutMs);
    await session.open(url);
    await session.send("Runtime.enable");
    return session;
  }

  async send<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    const socket = this.socket;
    if (socket === null || socket.readyState !== WebSocket.OPEN) {
      throw new Error("CDP session is not connected");
    }

    const id = this.nextId;
    this.nextId += 1;
    const command: CdpCommand = { id, method };
    if (params !== undefined) {
      command.params = params;
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, this.commandTimeoutMs);

      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
      socket.send(JSON.stringify(command));
    });
  }

  async evaluate<T = unknown>(expression: string): Promise<T> {
    const response = await this.send<RuntimeEvaluateResult>("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: false,
    });

    if (response.exceptionDetails !== undefined) {
      const message =
        response.exceptionDetails.description ??
        response.exceptionDetails.text ??
        "Runtime.evaluate failed";
      throw new Error(message);
    }

    return response.result?.value as T;
  }

  close(): void {
    this.rejectPending(new Error("CDP session closed"));
    this.socket?.close();
    this.socket = null;
  }

  private async open(url: string): Promise<void> {
    const socket = new WebSocket(url);
    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error("Timed out connecting to the Codex Desktop renderer"));
      }, this.commandTimeoutMs);

      socket.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      socket.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Could not connect to the Codex Desktop renderer"));
      };
      socket.onmessage = (event) => this.handleMessage(event.data);
      socket.onclose = () => this.rejectPending(new Error("CDP socket closed"));
    });
  }

  private handleMessage(data: unknown): void {
    if (typeof data !== "string") {
      return;
    }

    let message: CdpResponse | CdpEvent;
    try {
      message = JSON.parse(data) as CdpResponse | CdpEvent;
    } catch {
      return;
    }

    if ("id" in message && typeof message.id === "number") {
      const pending = this.pending.get(message.id);
      if (pending === undefined) {
        return;
      }

      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.error !== undefined) {
        pending.reject(new Error(`CDP ${message.error.code}: ${message.error.message}`));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private rejectPending(error: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }
}
