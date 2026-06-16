# Local SeaweedFS S3 Config

## Purpose

This file describes the information needed to connect the Fastify API to a local SeaweedFS S3 endpoint.

## Required Inputs

The API needs the following storage settings:

- `STORAGE_S3_ENDPOINT`
- `STORAGE_S3_REGION`
- `STORAGE_S3_BUCKET`
- `STORAGE_S3_ACCESS_KEY_ID`
- `STORAGE_S3_SECRET_ACCESS_KEY`

Useful optional settings:

- `STORAGE_S3_FORCE_PATH_STYLE`
- `STORAGE_S3_PUBLIC_BASE_URL`

## What each value means

### `STORAGE_S3_ENDPOINT`

The S3-compatible HTTP endpoint exposed by SeaweedFS.

Examples:

- `http://127.0.0.1:8333`
- `http://localhost:8333`

### `STORAGE_S3_REGION`

Use a stable region string for local development.

Example:

- `us-east-1`

### `STORAGE_S3_BUCKET`

The bucket name where workspace files will be stored.

Example:

- `workspace-files`

Create this bucket in SeaweedFS before upload features are enabled.

### `STORAGE_S3_ACCESS_KEY_ID`

The access key configured for the SeaweedFS S3 API.

### `STORAGE_S3_SECRET_ACCESS_KEY`

The secret key paired with the access key.

### `STORAGE_S3_FORCE_PATH_STYLE`

Recommended for local S3-compatible development unless your setup clearly requires virtual-host style.

Typical value:

- `true`

### `STORAGE_S3_PUBLIC_BASE_URL`

Optional.

Use this later if files become publicly readable and the app needs to derive stable public URLs.

For the first iteration, storing bucket and object key is more important than generating public URLs.

## Example `.env.api.local`

```env
STORAGE_S3_ENDPOINT=http://127.0.0.1:8333
STORAGE_S3_REGION=us-east-1
STORAGE_S3_BUCKET=workspace-files
STORAGE_S3_ACCESS_KEY_ID=seaweed-access-key
STORAGE_S3_SECRET_ACCESS_KEY=seaweed-secret-key
STORAGE_S3_FORCE_PATH_STYLE=true
```

## Practical Notes

- Keep these values in `.env.api.local`, not `.env.local`
- The web app should not need direct access to storage credentials
- The Fastify API should own storage configuration and access
- For production later, the same interface can point to a managed S3-compatible provider instead of SeaweedFS
