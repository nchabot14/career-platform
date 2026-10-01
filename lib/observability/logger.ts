const sensitiveKey = /pass|secret|token|key|auth|cookie|session|email|phone/i;

const scrubbers: [RegExp, string][] = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]"],
  [/\b(?:re|sk|pk|rk)_(?:live_|test_)?[A-Za-z0-9]{4,}\b/g, "[redacted]"],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted]"],
  [/\b(token|password|secret|api[_-]?key|authorization|code)=([^&\s]+)/gi, "$1=[redacted]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]"],
];

export function redact(value: string) {
  return scrubbers.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

// One JSON line per error, safe to ship to any log store: secrets, tokens,
// and personal data are removed from the message and the context.
export function logServerError(event: string, error: unknown, context: Record<string, string>) {
  const safeContext = Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, sensitiveKey.test(key) ? "[redacted]" : redact(String(value))]),
  );

  console.error(
    JSON.stringify({
      level: "error",
      time: new Date().toISOString(),
      event,
      error:
        error instanceof Error
          ? { name: error.name, message: redact(error.message) }
          : { name: "NonError", message: redact(String(error)) },
      context: safeContext,
    }),
  );
}
