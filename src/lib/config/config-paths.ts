/**
 * Builds a v8 config node URL from mapping keys. Each segment is one key, so `/` is rejected
 * and `.`/`..` are rejected because the server would resolve them as path traversal.
 */
export function configNodePath(segments: readonly string[]): string {
  if (segments.length === 0) throw new TypeError("Config node path needs at least one segment.");
  return `/config/${segments.map(encodeSegment).join("/")}`;
}

function encodeSegment(segment: string): string {
  if (segment === "" || segment === "." || segment === "..") {
    throw new TypeError(`Invalid config path segment: ${JSON.stringify(segment)}.`);
  }
  if (segment.includes("/")) {
    throw new TypeError("Config path segments cannot contain '/'.");
  }
  return encodeURIComponent(segment);
}
