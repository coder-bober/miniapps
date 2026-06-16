export async function registerHealthRoutes(app) {
  app.get("/health", async () => ({ ok: true }));
}
