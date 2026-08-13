import { execFile as execFileCallback, spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const LOOPBACK_HOST = "127.0.0.1";
const DEFAULT_APP_PATH = "/Applications/ChatGPT.app";

export interface CodexProcess {
  commandLine: string;
  pid: number;
}

export interface StartCodexOptions {
  appPath?: string;
  port?: number;
  timeoutMs?: number;
}

export interface StartCodexResult {
  pid: number;
  restarted: boolean;
}

interface LifecycleDependencies {
  launch(executablePath: string, args: string[]): Promise<number>;
  listProcesses(executablePath: string): Promise<CodexProcess[]>;
  ownsPort(pid: number, port: number): Promise<boolean>;
  probePort(port: number): Promise<boolean>;
  quit(process: CodexProcess): Promise<void>;
  wait(milliseconds: number): Promise<void>;
}

export async function startCodexWithCdp(
  options: StartCodexOptions = {},
  dependencies: Partial<LifecycleDependencies> = {},
): Promise<StartCodexResult> {
  if (process.platform !== "darwin" && Object.keys(dependencies).length === 0) {
    throw new Error("Codexion start currently supports macOS only");
  }

  const port = validatePort(options.port ?? 9341);
  const appPath = options.appPath ?? process.env.CODEXION_APP_PATH ?? DEFAULT_APP_PATH;
  const executablePath = join(appPath, "Contents", "MacOS", "ChatGPT");
  const timeoutMs = options.timeoutMs ?? 30_000;
  const deps: LifecycleDependencies = {
    launch: launchDetached,
    listProcesses,
    ownsPort,
    probePort,
    quit: requestNormalQuit,
    wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    ...dependencies,
  };

  if (Object.keys(dependencies).length === 0) {
    await access(executablePath, constants.X_OK);
  }

  const existing = await deps.listProcesses(executablePath);
  if (existing.length > 1) {
    throw new Error("More than one Codex Desktop process is running; quit them and try again");
  }

  if (await deps.probePort(port)) {
    const owner = existing[0];
    if (owner === undefined || !(await deps.ownsPort(owner.pid, port))) {
      throw new Error(`CDP port ${port} is open but is not owned by Codex Desktop`);
    }
    return { pid: owner.pid, restarted: false };
  }

  if (existing[0] !== undefined) {
    await deps.quit(existing[0]);
    await waitUntil(async () => (await deps.listProcesses(executablePath)).length === 0, {
      deps,
      message: "Codex Desktop did not exit normally",
      timeoutMs,
    });
  }

  const pid = await deps.launch(executablePath, [
    `--remote-debugging-address=${LOOPBACK_HOST}`,
    `--remote-debugging-port=${port}`,
  ]);

  await waitUntil(() => deps.probePort(port), {
    deps,
    message: `Codex Desktop did not open CDP port ${port}`,
    timeoutMs,
  });

  const launched = (await deps.listProcesses(executablePath)).find((entry) => entry.pid === pid);
  if (launched === undefined || !(await deps.ownsPort(pid, port))) {
    throw new Error(`CDP port ${port} is not owned by the Codex Desktop process Codexion launched`);
  }

  return { pid, restarted: true };
}

export async function diagnoseCodex(options: StartCodexOptions = {}): Promise<{
  appPath: string;
  cdpReady: boolean;
  port: number;
  processes: CodexProcess[];
}> {
  const port = validatePort(options.port ?? 9341);
  const appPath = options.appPath ?? process.env.CODEXION_APP_PATH ?? DEFAULT_APP_PATH;
  const executablePath = join(appPath, "Contents", "MacOS", "ChatGPT");
  return {
    appPath,
    cdpReady: await probePort(port),
    port,
    processes: await listProcesses(executablePath),
  };
}

async function listProcesses(executablePath: string): Promise<CodexProcess[]> {
  const { stdout } = await execFile("/bin/ps", ["-axo", "pid=,command="]);
  const prefix = `${executablePath} `;
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const match = /^(\d+)\s+(.+)$/.exec(line);
      if (match === null) return [];
      const commandLine = match[2];
      if (commandLine === undefined) return [];
      if (commandLine !== executablePath && !commandLine.startsWith(prefix)) return [];
      return [{ commandLine, pid: Number(match[1]) }];
    });
}

async function requestNormalQuit(target: CodexProcess): Promise<void> {
  const source = `ObjC.import("AppKit");
function run(argv) {
  const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(Number(argv[0]));
  if (!app) throw new Error("Codex Desktop disappeared");
  if (!app.terminate) throw new Error("Codex Desktop refused to quit normally");
  return true;
}`;
  await execFile("/usr/bin/osascript", [
    "-l",
    "JavaScript",
    "-e",
    source,
    "--",
    String(target.pid),
  ]);
}

async function launchDetached(executablePath: string, args: string[]): Promise<number> {
  const child = spawn(executablePath, args, { detached: true, shell: false, stdio: "ignore" });
  await new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  if (child.pid === undefined) throw new Error("Codex Desktop did not return a process id");
  child.unref();
  return child.pid;
}

async function probePort(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://${LOOPBACK_HOST}:${port}/json/version`, {
      signal: AbortSignal.timeout(750),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function ownsPort(pid: number, port: number): Promise<boolean> {
  try {
    const { stdout } = await execFile("/usr/sbin/lsof", [
      "-nP",
      "-a",
      "-p",
      String(pid),
      `-iTCP:${port}`,
      "-sTCP:LISTEN",
      "-t",
    ]);
    return stdout.trim() === String(pid);
  } catch {
    return false;
  }
}

async function waitUntil(
  predicate: () => Promise<boolean>,
  options: { deps: LifecycleDependencies; message: string; timeoutMs: number },
): Promise<void> {
  const deadline = Date.now() + options.timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await options.deps.wait(250);
  }
  throw new Error(options.message);
}

function validatePort(port: number): number {
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error(`Invalid CDP port: ${port}`);
  }
  return port;
}
