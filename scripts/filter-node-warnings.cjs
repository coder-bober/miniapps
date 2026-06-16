const originalEmitWarning = process.emitWarning;

process.emitWarning = function patchedEmitWarning(warning, ...args) {
  const message = typeof warning === "string" ? warning : warning?.message;

  if (message && message.includes("NODE_TLS_REJECT_UNAUTHORIZED")) {
    return;
  }

  return originalEmitWarning.call(process, warning, ...args);
};
