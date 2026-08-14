import { type ChildProcessByStdio, spawn } from "node:child_process";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { parseWeeklyUsage } from "./parse.js";
import type { UsageProvider, UsageSnapshot } from "./types.js";

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

export interface AppServerUsageProvider extends UsageProvider {
  close(): void;
}

export async function createAppServerUsageProvider(
  appPath = process.env.CODEXION_APP_PATH ?? "/Applications/ChatGPT.app",
): Promise<AppServerUsageProvider> {
  const executable = join(appPath, "Contents", "Resources", "codex");
  const child = spawn(executable, ["app-server", "--listen", "stdio://"], {
    shell: false,
    stdio: ["pipe", "pipe", "ignore"],
  });
  const client = new AppServerClient(child);
  try {
    await client.initialize();
  } catch (error) {
    client.close();
    throw error;
  }
  return client;
}

class AppServerClient implements AppServerUsageProvider {
  private closed = false;
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();

  constructor(private readonly child: AppServerProcess) {
    const lines = createInterface({ input: child.stdout });
    lines.on("line", (line) => this.receive(line));
    child.once("error", (error) => this.failAll(error));
    child.once("exit", () => this.failAll(new Error("Codex app-server exited")));
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      capabilities: null,
      clientInfo: { name: "codexion", title: "Codexion", version: "0.1.0" },
    });
  }

  async getSnapshot(): Promise<UsageSnapshot | null> {
    const response = await this.request("account/rateLimits/read", null);
    return parseWeeklyUsage(response);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.child.kill("SIGTERM");
    this.failAll(new Error("Codexion usage provider closed"));
  }

  private request(method: string, params: unknown): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error("Codex app-server is closed"));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex app-server request timed out: ${method}`));
      }, 10_000);
      this.pending.set(id, { reject, resolve, timer });
      this.child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    });
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
