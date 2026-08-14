import { type ChildProcessByStdio, spawn } from "node:child_process";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

interface RpcResponse {
  error?: { message?: string };
  id?: number;
  result?: unknown;
}

interface PendingRequest {
  reject(error: Error): void;
  resolve(value: unknown): void;
  timer: NodeJS.Timeout;
}

type AppServerProcess = ChildProcessByStdio<Writable, Readable, null>;

export class CodexAppServerClient {
  private closed = false;
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();

  private constructor(private readonly child: AppServerProcess) {
    const lines = createInterface({ input: child.stdout });
    lines.on("line", (line) => this.receive(line));
    child.once("error", (error) => this.failAll(error));
    child.once("exit", () => this.failAll(new Error("Codex app-server exited")));
  }

  static async create(
    appPath = process.env.CODEXION_APP_PATH ?? "/Applications/ChatGPT.app",
  ): Promise<CodexAppServerClient> {
    const executable = join(appPath, "Contents", "Resources", "codex");
    const child = spawn(executable, ["app-server", "--listen", "stdio://"], {
      shell: false,
      stdio: ["pipe", "pipe", "ignore"],
    });
    const client = new CodexAppServerClient(child);
    try {
      await client.request("initialize", {
        capabilities: null,
        clientInfo: { name: "codexion", title: "Codexion", version: "0.2.0" },
      });
      return client;
    } catch (error) {
      client.close();
      throw error;
    }
  }

  request<T = unknown>(method: string, params: unknown, timeoutMs = 10_000): Promise<T> {
    if (this.closed) return Promise.reject(new Error("Codex app-server is closed"));
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex app-server request timed out: ${method}`));
      }, timeoutMs);
      this.pending.set(id, {
        reject,
        resolve: (value) => resolve(value as T),
        timer,
      });
      this.child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.child.kill("SIGTERM");
    this.failAll(new Error("Codex app-server client closed"));
  }

  private receive(line: string): void {
    let message: RpcResponse;
    try {
      message = JSON.parse(line) as RpcResponse;
    } catch {
      return;
    }
    if (typeof message.id !== "number") return;
    const pending = this.pending.get(message.id);
    if (pending === undefined) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if (message.error !== undefined) {
      pending.reject(new Error(message.error.message ?? "Codex app-server request failed"));
    } else {
      pending.resolve(message.result);
    }
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
