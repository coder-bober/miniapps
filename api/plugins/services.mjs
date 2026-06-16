export function registerApiServicesPlugin(app, services) {
  app.decorate("services", services);
}
