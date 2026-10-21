const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
// Trailing page/API suffixes users paste along with the host; stripped so the client can append /v8/management once.
const TRAILING_SUFFIX = /(\/v8\/management|\/management\.html)+$/i;

export class InvalidConnectionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidConnectionInputError";
  }
}

/**
 * Returns `scheme://host[:port][/path]` without trailing slashes or a management suffix.
 * Only scheme, host and path survive: userinfo, query and hash are rejected, never read.
 */
export function normalizeApiBase(
  input: string,
  location?: Pick<Location, "protocol" | "origin" | "pathname">,
): string {
  const trimmed = input.trim();
  if (trimmed === "") {
    if (location && /^https?:$/.test(location.protocol)) {
      return stripSuffix(location.origin + location.pathname);
    }
    throw new InvalidConnectionInputError("Enter the API address.");
  }
  if (/[?#]/.test(trimmed)) {
    throw new InvalidConnectionInputError("The API address must not contain a query or fragment.");
  }
  const defaultProtocol =
    location && /^https?:$/.test(location.protocol) ? location.protocol : "http:";
  const candidate = SCHEME.test(trimmed) ? trimmed : `${defaultProtocol}//${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new InvalidConnectionInputError("The API address is not a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidConnectionInputError("The API address must use http or https.");
  }
  if (url.username !== "" || url.password !== "") {
    throw new InvalidConnectionInputError("The API address must not contain credentials.");
  }
  if (url.hostname === "") {
    throw new InvalidConnectionInputError("The API address has no host.");
  }
  return stripSuffix(url.origin + url.pathname);
}

function stripSuffix(value: string): string {
  return value.replace(/\/+$/, "").replace(TRAILING_SUFFIX, "").replace(/\/+$/, "");
}
