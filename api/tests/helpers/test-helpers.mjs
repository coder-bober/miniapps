import assert from "node:assert/strict";

export async function runCase(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

export async function readJson(response) {
  return await response.json();
}

export function createSupabaseServerClientStub({
  accessToken = "token-123",
  userId = "user-123",
  user,
} = {}) {
  return async function createSupabaseServerClient() {
    return {
      auth: {
        async getSession() {
          return {
            data: {
              session: accessToken
                ? {
                    access_token: accessToken,
                  }
                : null,
            },
          };
        },
        async getUser(token) {
          assert.equal(token, accessToken);

          return {
            data: {
              user:
                user ??
                (accessToken
                  ? {
                      id: userId,
                    }
                  : null),
            },
          };
        },
      },
    };
  };
}

export function createNextProxyDependencies({
  accessToken = "token-123",
  userId = "user-123",
  user,
  internalApiUrl = "http://internal-api.test",
  fetchImplementation = async () => Response.json({ ok: true }),
} = {}) {
  return {
    createSupabaseServerClient: createSupabaseServerClientStub({
      accessToken,
      userId,
      user,
    }),
    getInternalApiUrl() {
      return internalApiUrl;
    },
    fetchImplementation,
  };
}
