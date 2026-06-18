import assert from "node:assert/strict";

import { buildApiApp } from "../app.mjs";
import { createServices, runCase } from "./helpers/route-test-helpers.mjs";

await runCase("GET /health returns ok", async () => {
  const app = buildApiApp({
    services: createServices(),
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/account/delete rejects requests without authorization", async () => {
  const app = buildApiApp({
    services: createServices(),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/account/delete",
      payload: {
        confirmation: "owner@example.com",
      },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, "authorization_required");
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/account/delete rejects wrong confirmation email", async () => {
  let deleteCalled = false;

  const app = buildApiApp({
    services: createServices({
      async deleteAccount() {
        deleteCalled = true;
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/account/delete",
      headers: {
        authorization: "Bearer valid-token",
      },
      payload: {
        confirmation: "wrong@example.com",
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error, "confirmation_mismatch");
    assert.equal(deleteCalled, false);
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/account/delete deletes the verified account on exact confirmation", async () => {
  const deletedUserIds = [];

  const app = buildApiApp({
    services: createServices({
      async deleteAccount(userId) {
        deletedUserIds.push(userId);
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/account/delete",
      headers: {
        authorization: "Bearer valid-token",
      },
      payload: {
        confirmation: "owner@example.com",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.deepEqual(deletedUserIds, ["user-123"]);
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/account/sign-out-everywhere rejects requests without authorization", async () => {
  const app = buildApiApp({
    services: createServices(),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/account/sign-out-everywhere",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, "authorization_required");
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/account/sign-out-everywhere revokes sessions for the verified account", async () => {
  const revokedTokens = [];

  const app = buildApiApp({
    services: createServices({
      async signOutEverywhere(accessToken) {
        revokedTokens.push(accessToken);
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/account/sign-out-everywhere",
      headers: {
        authorization: "Bearer valid-token",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.deepEqual(revokedTokens, ["valid-token"]);
  } finally {
    await app.close();
  }
});
