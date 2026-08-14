import type { AccountIdentity } from "./types.js";

export function parseAccountIdentity(payload: unknown): AccountIdentity | null {
  if (typeof payload !== "object" || payload === null) return null;
  const account = (payload as Record<string, unknown>).account;
  if (typeof account !== "object" || account === null) return null;
  const record = account as Record<string, unknown>;
  if (typeof record.type !== "string") return null;

  return {
    email: typeof record.email === "string" && record.email !== "" ? record.email : null,
    planType: typeof record.planType === "string" ? record.planType : null,
    type: record.type,
  };
}
