import path from "node:path";

const preloadPath = path.join(process.cwd(), "scripts", "filter-node-warnings.cjs");

export function withFilteredNodeWarnings(env) {
  const existingNodeOptions = env.NODE_OPTIONS?.trim();
  const preloadOption = `--require=${preloadPath}`;
  const nextEnv = {
    ...env,
  };

  if (nextEnv.FORCE_COLOR !== undefined) {
    delete nextEnv.NO_COLOR;
  }

  return {
    ...nextEnv,
    NODE_OPTIONS: existingNodeOptions
      ? `${existingNodeOptions} ${preloadOption}`
      : preloadOption,
  };
}
