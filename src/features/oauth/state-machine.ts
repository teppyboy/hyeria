export type OAuthFlowKind = "wait" | "device";

export type OAuthStatusResult = "wait" | "ok" | "error" | "unknown";

export type OAuthErrorReason = "provider-error" | "unknown-status" | "expired";

/**
 * Holds only the provider id and flow kind. Auth URLs, device codes and tokens
 * are never stored here.
 */
export type OAuthState =
  | { status: "idle" }
  | { status: "starting"; providerId: string }
  | { status: "awaiting-user"; providerId: string; flow: OAuthFlowKind }
  | { status: "polling"; providerId: string; flow: OAuthFlowKind }
  | { status: "success"; providerId: string }
  | { status: "error"; providerId: string; reason: OAuthErrorReason }
  | { status: "cancelled"; providerId: string };

export type OAuthEvent =
  | { type: "start"; providerId: string }
  | { type: "auth-url"; flow: OAuthFlowKind }
  | { type: "poll" }
  | { type: "status"; result: OAuthStatusResult }
  | { type: "cancel" }
  | { type: "expire" };

/** Events that do not apply to the current state are ignored and return the same state. */
export function reduceOAuthState(state: OAuthState, event: OAuthEvent): OAuthState {
  switch (state.status) {
    case "idle":
      return event.type === "start" ? { status: "starting", providerId: event.providerId } : state;

    case "starting":
      if (event.type === "auth-url") {
        return { status: "awaiting-user", providerId: state.providerId, flow: event.flow };
      }
      return inFlightEvent(state, state.providerId, event);

    case "awaiting-user":
      if (event.type === "poll") {
        return { status: "polling", providerId: state.providerId, flow: state.flow };
      }
      return inFlightEvent(state, state.providerId, event);

    case "polling":
      if (event.type === "status") {
        return statusResult(state, event.result);
      }
      return inFlightEvent(state, state.providerId, event);

    case "success":
    case "error":
    case "cancelled":
      return state;
  }
}

function statusResult(
  state: Extract<OAuthState, { status: "polling" }>,
  result: OAuthStatusResult,
): OAuthState {
  switch (result) {
    case "wait":
      return state;
    case "ok":
      return { status: "success", providerId: state.providerId };
    case "error":
      return { status: "error", providerId: state.providerId, reason: "provider-error" };
    case "unknown":
      return { status: "error", providerId: state.providerId, reason: "unknown-status" };
  }
}

/** Cancel and expire apply to any non-terminal state. */
function inFlightEvent(state: OAuthState, providerId: string, event: OAuthEvent): OAuthState {
  if (event.type === "cancel") {
    return { status: "cancelled", providerId };
  }
  if (event.type === "expire") {
    return { status: "error", providerId, reason: "expired" };
  }
  return state;
}
