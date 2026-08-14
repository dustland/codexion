import { describe, expect, it, vi } from "vitest";
import { type CodexProcess, startCodexWithCdp } from "../src/lifecycle/codex-app.js";

const executable = "/Applications/ChatGPT.app/Contents/MacOS/ChatGPT";

function process(pid: number): CodexProcess {
  return { commandLine: executable, pid };
}

describe("startCodexWithCdp", () => {
  it("reuses a verified CDP-enabled process", async () => {
    const launch = vi.fn();
    const result = await startCodexWithCdp(
      {},
      {
        forceQuit: vi.fn(),
        launch,
        listProcesses: async () => [process(42)],
        ownsPort: async () => true,
        probePort: async () => true,
        quit: vi.fn(),
        wait: async () => undefined,
      },
    );

    expect(result).toEqual({ pid: 42, restarted: false });
    expect(launch).not.toHaveBeenCalled();
  });

  it("quits a native process and launches Codex directly with CDP", async () => {
    let running = [process(10)];
    let ready = false;
    const launch = vi.fn(async (_path: string, args: string[]) => {
      expect(args).toEqual([
        "--remote-debugging-address=127.0.0.1",
        "--remote-debugging-port=9341",
      ]);
      running = [process(20)];
      ready = true;
      return 20;
    });

    const result = await startCodexWithCdp(
      {},
      {
        forceQuit: vi.fn(),
        launch,
        listProcesses: async () => running,
        ownsPort: async (pid) => pid === 20,
        probePort: async () => ready,
        quit: async () => {
          running = [];
        },
        wait: async () => undefined,
      },
    );

    expect(result).toEqual({ pid: 20, restarted: true });
    expect(launch).toHaveBeenCalledOnce();
  });

  it("forces a restart when Codex ignores the normal quit request", async () => {
    let running = [process(10)];
    let ready = false;
    const forceQuit = vi.fn(async () => {
      running = [];
    });
    const launch = vi.fn(async () => {
      running = [process(20)];
      ready = true;
      return 20;
    });

    const result = await startCodexWithCdp(
      { timeoutMs: 2 },
      {
        forceQuit,
        launch,
        listProcesses: async () => running,
        ownsPort: async (pid) => pid === 20,
        probePort: async () => ready,
        quit: vi.fn(),
        wait: async () => undefined,
      },
    );

    expect(forceQuit).toHaveBeenCalledOnce();
    expect(result).toEqual({ pid: 20, restarted: true });
  });

  it("rejects a port owned by another process", async () => {
    await expect(
      startCodexWithCdp(
        {},
        {
          forceQuit: vi.fn(),
          launch: vi.fn(),
          listProcesses: async () => [process(42)],
          ownsPort: async () => false,
          probePort: async () => true,
          quit: vi.fn(),
          wait: async () => undefined,
        },
      ),
    ).rejects.toThrow("is open but is not owned by Codex Desktop");
  });
});
