import { describe, expect, it } from "vite-plus/test";
import {
  type OAuthEvent,
  type OAuthState,
  reduceOAuthState,
} from "../../../src/features/oauth/state-machine";

const idle: OAuthState = { status: "idle" };
const starting: OAuthState = { status: "starting", providerId: "anthropic" };
const awaitingUser: OAuthState = {
  status: "awaiting-user",
  providerId: "anthropic",
  flow: "device",
};
const polling: OAuthState = { status: "polling", providerId: "anthropic", flow: "device" };

function run(state: OAuthState, events: OAuthEvent[]): OAuthState {
  return events.reduce(reduceOAuthState, state);
}

describe("reduceOAuthState", () => {
  it("walks the happy path from idle to success", () => {
    const state = run(idle, [
      { type: "start", providerId: "anthropic" },
      { type: "auth-url", flow: "device" },
      { type: "poll" },
      { type: "status", result: "ok" },
    ]);

    expect(state).toEqual({ status: "success", providerId: "anthropic" });
  });

  it("keeps polling while the provider reports wait", () => {
    expect(reduceOAuthState(polling, { type: "status", result: "wait" })).toBe(polling);
  });

  it("moves to awaiting-user with the flow kind after the auth url is ready", () => {
    expect(reduceOAuthState(starting, { type: "auth-url", flow: "wait" })).toEqual({
      status: "awaiting-user",
      providerId: "anthropic",
      flow: "wait",
    });
  });

  it("records provider error as a terminal error", () => {
    expect(reduceOAuthState(polling, { type: "status", result: "error" })).toEqual({
      status: "error",
      providerId: "anthropic",
      reason: "provider-error",
    });
  });

  it("treats an unknown provider status as a terminal error", () => {
    expect(reduceOAuthState(polling, { type: "status", result: "unknown" })).toEqual({
      status: "error",
      providerId: "anthropic",
      reason: "unknown-status",
    });
  });

  it("cancels any in-flight flow", () => {
    for (const state of [starting, awaitingUser, polling]) {
      expect(reduceOAuthState(state, { type: "cancel" })).toEqual({
        status: "cancelled",
        providerId: "anthropic",
      });
    }
  });

  it("expires any in-flight flow into a terminal error", () => {
    for (const state of [starting, awaitingUser, polling]) {
      expect(reduceOAuthState(state, { type: "expire" })).toEqual({
        status: "error",
        providerId: "anthropic",
        reason: "expired",
      });
    }
  });

  it("ignores events that are invalid for the current state", () => {
    expect(reduceOAuthState(idle, { type: "poll" })).toBe(idle);
    expect(reduceOAuthState(idle, { type: "cancel" })).toBe(idle);
    expect(reduceOAuthState(starting, { type: "poll" })).toBe(starting);
    expect(reduceOAuthState(awaitingUser, { type: "status", result: "ok" })).toBe(awaitingUser);
    expect(reduceOAuthState(starting, { type: "start", providerId: "other" })).toBe(starting);
  });

  it("does not leave terminal states", () => {
    const terminal: OAuthState[] = [
      { status: "success", providerId: "anthropic" },
      { status: "error", providerId: "anthropic", reason: "expired" },
      { status: "cancelled", providerId: "anthropic" },
    ];
    const events: OAuthEvent[] = [
      { type: "start", providerId: "anthropic" },
      { type: "auth-url", flow: "device" },
      { type: "poll" },
      { type: "status", result: "ok" },
      { type: "cancel" },
      { type: "expire" },
    ];

    for (const state of terminal) {
      for (const event of events) {
        expect(reduceOAuthState(state, event)).toBe(state);
      }
    }
  });

  it("stores only the provider id and flow kind, never the auth url or codes", () => {
    const state = run(idle, [
      { type: "start", providerId: "anthropic" },
      { type: "auth-url", flow: "device" },
    ]);

    expect(Object.keys(state).sort()).toEqual(["flow", "providerId", "status"]);
  });
});
