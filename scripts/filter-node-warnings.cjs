const originalEmitWarning = process.emitWarning;

process.emitWarning = function patchedEmitWarning(warning, ...args) {
  const message = typeof warning === "string" ? warning : warning?.message;

  if (message && message.includes("NODE_TLS_REJECT_UNAUTHORIZED")) {
    return;
  }

  if (message && message.includes("The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set")) {
    return;
  }

  return originalEmitWarning.call(process, warning, ...args);
};
