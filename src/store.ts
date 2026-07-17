import createDebug from "debug";
import envPaths from "env-paths";
import { createStorage } from "unstorage";
import fsLiteDriver from "unstorage/drivers/fs-lite";

import type { DuoResponse } from "./entities.ts";

const debug = createDebug("unduo:store");

const SECRET_KEY = "secret";
// The `.json` suffix makes unstorage serialize/parse this value automatically.
const RESPONSE_KEY = "response.json";

/**
 * Resolve the directory used to persist activation state: an explicit override,
 * then `$UNDUO_DIR`, then the platform's per-user data directory.
 */
export function resolveStoreDir(override?: string): string {
  if (override !== undefined && override !== "") {
    return override;
  }

  const fromEnv = process.env["UNDUO_DIR"];
  if (fromEnv !== undefined && fromEnv !== "") {
    return fromEnv;
  }

  return envPaths("unduo", { suffix: "" }).data;
}

/** Create a filesystem-backed storage rooted at `dir`. */
function createStore(dir: string) {
  return createStorage({ driver: fsLiteDriver({ base: dir }) });
}

/** Persist the base32 secret and the validated activation response. */
export async function saveActivation(
  dir: string,
  secret: string,
  response: DuoResponse,
): Promise<void> {
  const storage = createStore(dir);
  await storage.setItem(SECRET_KEY, secret);
  await storage.setItem(RESPONSE_KEY, response);
  debug("saved activation state to %s", dir);
}

/** Read the persisted base32 secret, throwing a helpful error if absent. */
export async function loadSecret(dir: string): Promise<string> {
  const secret = await createStore(dir).getItem<string>(SECRET_KEY);
  if (secret === null) {
    throw new Error(`No activation secret found in ${dir}. Run \`unduo --save\` first.`);
  }
  return secret.trim();
}

/** Read the persisted activation response, throwing if absent. */
export async function loadResponse(dir: string): Promise<DuoResponse> {
  const response = await createStore(dir).getItem<DuoResponse>(RESPONSE_KEY);
  if (response === null) {
    throw new Error(`No activation response found in ${dir}. Run \`unduo --save\` first.`);
  }
  return response;
}
