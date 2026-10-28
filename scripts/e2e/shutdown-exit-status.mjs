export function createShutdownExitStatus(initialCode = 0) {
  let code = initialCode;
  let finalized = false;
  let onEscalateAfterFinalize = null;

  return {
    request(nextCode) {
      if (nextCode !== 0) {
        code = nextCode;
        if (finalized) onEscalateAfterFinalize?.(code);
      }
    },
    current() {
      return code;
    },
    finalize(writeResult) {
      writeResult(code);
      finalized = true;
      onEscalateAfterFinalize = writeResult;
      return code;
    },
  };
}
