import type { Page } from "@playwright/test";

export type BrowserErrorCapture = {
  pageErrors: string[];
  consoleErrors: string[];
  failedRequests: string[];
};

export function attachBrowserErrorCapture(page: Page): BrowserErrorCapture {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").origin;

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    const url = request.url();
    const errorText = failure?.errorText ?? "unknown";

    if (url.includes("_rsc=") && errorText === "net::ERR_ABORTED") {
      return;
    }

     if (errorText === "net::ERR_ABORTED") {
      try {
        const parsedUrl = new URL(url);
        const isLocalAuthFormSubmit =
          parsedUrl.origin === siteOrigin &&
          request.method() === "POST" &&
          (parsedUrl.pathname.endsWith("/sign-in") || parsedUrl.pathname.endsWith("/sign-up"));

        if (isLocalAuthFormSubmit) {
          return;
        }

        const isLocalWorkspaceListAbort =
          parsedUrl.origin === siteOrigin &&
          request.method() === "GET" &&
          parsedUrl.pathname === "/api/workspaces";

        if (isLocalWorkspaceListAbort) {
          return;
        }

        const isLocalWorkspaceFilesAbort =
          parsedUrl.origin === siteOrigin &&
          request.method() === "GET" &&
          parsedUrl.pathname === "/api/workspace-files";

        if (isLocalWorkspaceFilesAbort) {
          return;
        }
      } catch {
        // Ignore URL parsing failures and fall through to normal reporting.
      }
    }

    failedRequests.push(`${request.method()} ${url} :: ${errorText}`);
  });

  return {
    pageErrors,
    consoleErrors,
    failedRequests,
  };
}
