// Used only by the isolated, loopback playtest runner. Never mounted in the town API.
export function createPlaytestClock(start = Date.now()) {
  let elapsed = 0;
  const receipts = new Map();
  return {
    now: () => start + elapsed * 1000,
    snapshot: () => ({ elapsed }),
    advance({ seconds, requestId }) {
      if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 172800)
        throw Error("Choose 1 second to 48 hours");
      if (
        typeof requestId !== "string" ||
        requestId.length < 1 ||
        requestId.length > 100
      )
        throw Error("A time-step request ID is required");
      if (receipts.has(requestId)) {
        const previous = receipts.get(requestId);
        if (previous.seconds !== seconds)
          throw Error("Time-step request already used");
        return previous.result;
      }
      if (!Number.isSafeInteger(start + (elapsed + seconds) * 1000))
        throw Error("Test clock limit reached");
      elapsed += seconds;
      const result = { elapsed };
      receipts.set(requestId, { seconds, result });
      return result;
    },
  };
}
