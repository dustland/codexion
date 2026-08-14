import { describe, expect, it } from "vitest";
import { parseAccountIdentity } from "../src/usage/account.js";

describe("parseAccountIdentity", () => {
  it("reads a ChatGPT account without exposing authentication material", () => {
    expect(
      parseAccountIdentity({
        account: {
          email: "person@example.com",
          planType: "plus",
          token: "must-not-be-returned",
          type: "chatgpt",
        },
      }),
    ).toEqual({ email: "person@example.com", planType: "plus", type: "chatgpt" });
  });

  it("supports accounts without an email address", () => {
    expect(parseAccountIdentity({ account: { type: "apiKey" } })).toEqual({
      email: null,
      planType: null,
      type: "apiKey",
    });
  });
});
