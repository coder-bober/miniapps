"use client";

import { Alert, Box, Button, Card, Group, Image, Loader, Stack, Text, Title } from "@mantine/core";
import { useCallback, useEffect, useState, useTransition, type ChangeEvent } from "react";

import { useWorkspaceShellContext, type WorkspaceSummary } from "@/core/workspaces/workspace-shell-context";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import type { WorkspaceFile } from "@/shared/api/workspace-files";

type WorkspaceContext = Pick<WorkspaceSummary, "id" | "slug">;

type WorkspaceFilesCardProps = {
  dictionary: SiteDictionary["app"]["workspace"];
};

export function WorkspaceFilesCard({ dictionary }: WorkspaceFilesCardProps) {
  const { currentWorkspace, loading: workspaceLoading, error: workspaceError } = useWorkspaceShellContext();
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, startUploadTransition] = useTransition();
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!currentWorkspace) {
      return {
        ok: false as const,
        message: workspaceError ?? dictionary.filesLoadFailed,
        files: [] as WorkspaceFile[],
      };
    }

    try {
      const searchParams = createWorkspaceSearchParams(currentWorkspace);
      const response = await fetch(`/api/workspace-files?${searchParams.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | { files?: WorkspaceFile[]; message?: string }
        | null;

      if (!response.ok) {
        return {
          ok: false as const,
          message: payload?.message ?? dictionary.filesLoadFailed,
          files: [] as WorkspaceFile[],
        };
      }

      return {
        ok: true as const,
        files: payload?.files ?? [],
      };
    } catch {
      return {
        ok: false as const,
        message: dictionary.filesLoadFailed,
        files: [] as WorkspaceFile[],
      };
    }
  }, [currentWorkspace, dictionary.filesLoadFailed, workspaceError]);

  const loadFiles = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const result = await fetchFiles();

      if (!result.ok) {
        setError(result.message);
        setFiles([]);
      } else {
        setFiles(result.files);
      }

      if (!silent) {
        setLoading(false);
      }

      return result;
    },
    [fetchFiles],
  );

  useEffect(() => {
    if (workspaceLoading) {
      setLoading(true);
      return;
    }

    if (!currentWorkspace) {
      setFiles([]);
      setError(workspaceError ?? dictionary.filesLoadFailed);
      setLoading(false);
      return;
    }

    void loadFiles();
  }, [currentWorkspace, dictionary.filesLoadFailed, loadFiles, workspaceError, workspaceLoading]);

  const waitForThumbnail = useCallback(
    async (fileId: string) => {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const result = await fetchFiles();

        if (result.ok) {
          setFiles(result.files);

          const refreshedFile = result.files.find((file) => file.id === fileId);

          if (refreshedFile?.thumbnail) {
            return;
          }
        }

        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
    },
    [fetchFiles],
  );

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setMessage(null);

    startUploadTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("workspaceSlug", currentWorkspace?.slug ?? "default");
        if (currentWorkspace?.id) {
          formData.set("workspaceId", currentWorkspace.id);
        }
        formData.set("file", file);

        const response = await fetch("/api/workspace-files", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json().catch(() => null)) as
          | { file?: WorkspaceFile; message?: string }
          | null;

        const uploadedFile = payload?.file;

        if (!response.ok || !uploadedFile) {
          setError(payload?.message ?? dictionary.filesUploadFailed);
          return;
        }

        setFiles((currentFiles) => [uploadedFile, ...currentFiles]);
        setMessage(dictionary.filesUploadComplete);
        event.target.value = "";

        if (uploadedFile.kind === "image" && !uploadedFile.thumbnail) {
          void waitForThumbnail(uploadedFile.id);
        }
      } catch {
        setError(dictionary.filesUploadFailed);
      }
    });
  }

  async function handleDelete(fileId: string) {
    setDeletingFileId(fileId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/workspace-files/${fileId}?${createWorkspaceSearchParams({
          id: currentWorkspace?.id ?? null,
          slug: currentWorkspace?.slug ?? "default",
        }).toString()}`,
        {
        method: "DELETE",
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? dictionary.filesDeleteFailed);
        return;
      }

      setFiles((currentFiles) => currentFiles.filter((file) => file.id !== fileId));
      setMessage(dictionary.filesDeleteComplete);
    } catch {
      setError(dictionary.filesDeleteFailed);
    } finally {
      setDeletingFileId(null);
    }
  }

  return (
    <Card
      radius={24}
      p={{ base: "lg", md: "xl" }}
      style={{
        background: "var(--surface-strong)",
        border: "1px solid var(--line)",
      }}
    >
      <Stack gap="md">
        <div>
          <Title order={3}>{dictionary.filesTitle}</Title>
          <Text c="dimmed" mt="xs">
            {dictionary.filesDescription}
          </Text>
        </div>

        <Group align="end">
          <div style={{ flex: 1 }}>
            <Text fw={600}>{dictionary.filesUploadLabel}</Text>
            <Text size="sm" c="dimmed" mt={4}>
              {dictionary.filesUploadHint}
            </Text>
          </div>
          <Button component="label" color="teal" loading={uploading}>
            {dictionary.filesUploadSubmit}
            <input hidden type="file" onChange={handleUpload} />
          </Button>
        </Group>

        {error ? <Alert color="red">{error}</Alert> : null}
        {message ? <Alert color="teal">{message}</Alert> : null}

        {loading ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : files.length === 0 ? (
          <Text c="dimmed">{dictionary.filesEmpty}</Text>
        ) : (
          <Stack gap="sm">
            {files.map((file) => (
              <Card
                key={file.id}
                radius={18}
                p="md"
                style={{ border: "1px solid var(--line)" }}
              >
                <Group justify="space-between" align="flex-start">
                  <Group align="flex-start" gap="md" style={{ flex: 1 }}>
                    {file.thumbnail ? (
                      <Image
                        src={`/api/workspace-files/${file.id}/thumbnail?${createWorkspaceSearchParams({
                          id: currentWorkspace?.id ?? null,
                          slug: currentWorkspace?.slug ?? "default",
                        }).toString()}`}
                        alt={file.originalName}
                        w={84}
                        h={84}
                        radius="md"
                        fit="cover"
                      />
                    ) : (
                      <Box
                        w={84}
                        h={84}
                        style={{
                          borderRadius: "0.75rem",
                          border: "1px solid var(--line)",
                          background: "var(--surface)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Text size="xs" c="dimmed">
                          {file.kind.toUpperCase()}
                        </Text>
                      </Box>
                    )}
                    <div>
                      <Text fw={600}>{file.originalName}</Text>
                      <Text size="sm" c="dimmed">
                        {file.mimeType} · {formatFileSize(file.sizeBytes)}
                      </Text>
                      <Text size="sm" c="dimmed" mt={4}>
                        {formatThumbnailStatus(file, dictionary)}
                      </Text>
                    </div>
                  </Group>
                  <Button
                    color="red"
                    variant="subtle"
                    loading={deletingFileId === file.id}
                    onClick={() => void handleDelete(file.id)}
                  >
                    {dictionary.filesDeleteSubmit}
                  </Button>
                </Group>
              </Card>
            ))}
          </Stack>
        )}

        <Stack gap="xs">
          {dictionary.filesChecklist.map((item) => (
            <Text key={item} c="dimmed">
              - {item}
            </Text>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

function createWorkspaceSearchParams(workspace: WorkspaceContext) {
  const searchParams = new URLSearchParams({
    workspaceSlug: workspace.slug,
  });

  if (workspace.id) {
    searchParams.set("workspaceId", workspace.id);
  }

  return searchParams;
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatThumbnailStatus(
  file: WorkspaceFile,
  dictionary: SiteDictionary["app"]["workspace"],
) {
  if (file.thumbnail) {
    return dictionary.filesThumbnailCompleted;
  }

  if (file.thumbnailStatus === "failed") {
    return file.thumbnailError ?? dictionary.filesThumbnailFailed;
  }

  if (file.thumbnailStatus === "skipped") {
    return file.thumbnailError ?? dictionary.filesThumbnailSkipped;
  }

  if (file.thumbnailStatus === "pending") {
    return dictionary.filesThumbnailPending;
  }

  return file.kind === "image"
    ? dictionary.filesThumbnailPending
    : dictionary.filesThumbnailSkipped;
}
