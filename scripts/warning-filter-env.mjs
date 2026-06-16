import path from "node:path";

const preloadPath = path.join(process.cwd(), "scripts", "filter-node-warnings.cjs");

export function withFilteredNodeWarnings(env) {
  const existingNodeOptions = env.NODE_OPTIONS?.trim();
  const preloadOption = `--require=${preloadPath}`;

  return {
    ...env,
    NODE_OPTIONS: existingNodeOptions
      ? `${existingNodeOptions} ${preloadOption}`
      : preloadOption,
  };
}
