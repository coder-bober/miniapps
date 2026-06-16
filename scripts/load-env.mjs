import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function readEnvFile(file) {
  const envPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);

  if (!existsSync(envPath)) {
    return {};
  }

  const values = {};
  const content = readFileSync(envPath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripQuotes(line.slice(separatorIndex + 1).trim());

    if (key) {
      values[key] = value;
    }
  }

  return values;
}

export function loadEnvFiles(files, { override = false } = {}) {
  for (const file of files) {
    const values = readEnvFile(file);

    for (const [key, value] of Object.entries(values)) {
      if (key && (override || process.env[key] === undefined || process.env[key] === "")) {
        process.env[key] = value;
      }
    }
  }
}
