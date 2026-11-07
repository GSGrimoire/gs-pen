// Start stream cleanup without letting a stalled cancellation delay the result.
export function discardBody(stream) {
  try {
    void stream?.cancel().catch(() => {});
  } catch {
    // A locked or already closed stream can refuse cancellation.
  }
}
