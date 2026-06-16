/**
 * @typedef {Object} ApiModuleJob
 * @property {string} id
 * @property {string} queue
 * @property {string | undefined} [description]
 * @property {number | undefined} [attempts]
 * @property {number | undefined} [backoffMs]
 * @property {boolean | number | undefined} [removeOnComplete]
 * @property {boolean | number | undefined} [removeOnFail]
 */

/**
 * @typedef {(context: {
 *   job: import("bullmq").Job,
 *   services: Record<string, unknown>,
 *   logger: { info: (...args: unknown[]) => void, error: (...args: unknown[]) => void }
 * }) => Promise<unknown> | unknown} ApiModuleJobHandler
 */

/**
 * @typedef {Object} ApiModuleManifest
 * @property {string} id
 * @property {string} label
 * @property {(app: import("fastify").FastifyInstance) => Promise<void> | void} [registerRoutes]
 * @property {ApiModuleJob[] | undefined} [jobs]
 * @property {Record<string, ApiModuleJobHandler> | undefined} [jobHandlers]
 */

/**
 * Keep API module manifests explicit and typed enough for future queue integration.
 *
 * @param {ApiModuleManifest} manifest
 * @returns {ApiModuleManifest}
 */
export function defineApiModule(manifest) {
  return manifest;
}
