"use client";

import { Alert, Button, Card, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { useEffect, useState, useTransition } from "react";

import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import type { ModuleLabErrorResponse, ModuleLabStatusResponse } from "@/shared/api/module-lab";

type ModuleLabCardProps = {
  dictionary: SiteDictionary["app"]["moduleLab"];
  canRunJob: boolean;
  workspaceId: string | null;
  workspaceName: string | null;
};

function resolveModuleLabErrorMessage(
  dictionary: SiteDictionary["app"]["moduleLab"],
  payload: ModuleLabErrorResponse | null,
  fallback: string,
) {
  if (!payload) {
    return fallback;
  }

  if (payload.error === "authorization_required" || payload.error === "invalid_session") {
    return dictionary.sessionExpiredNotice;
  }

  if (payload.error === "module_capability_required") {
    if (payload.requiredCapability === "module-lab.read") {
      return dictionary.accessDeniedNotice;
    }

    if (payload.requiredCapability === "module-lab.run_job") {
      return dictionary.readOnlyNotice;
    }
  }

  return fallback;
}

export function ModuleLabCard({ dictionary, canRunJob, workspaceId, workspaceName }: ModuleLabCardProps) {
  const [status, setStatus] = useState<ModuleLabStatusResponse | null>(null);
  const [message, setMessage] = useState("Module lab ping");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, startTransition] = useTransition();

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      setStatus(null);

      try {
        const targetUrl = workspaceId
          ? `/api/module-lab?bbb=${encodeURIComponent(workspaceId)}`
          : "/api/module-lab";
        const response = await fetch(targetUrl, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | ModuleLabStatusResponse
          | ModuleLabErrorResponse
          | null;

        if (!response.ok || !payload || !("module" in payload)) {
          setError(
            resolveModuleLabErrorMessage(
              dictionary,
              payload && "error" in payload ? payload : null,
              dictionary.statusLoadFailed,
            ),
          );
          return;
        }

        setStatus(payload);
      } catch {
        setError(dictionary.statusLoadFailed);
      } finally {
        setLoading(false);
      }
    })();
  }, [dictionary, workspaceId]);

  function handleSubmit() {
    if (!canRunJob) {
      setError(dictionary.readOnlyNotice);
      return;
    }

    setError(null);
    setFeedback(null);

    startTransition(async () => {
      try {
        const targetUrl = workspaceId
          ? `/api/module-lab?bbb=${encodeURIComponent(workspaceId)}`
          : "/api/module-lab";
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ message }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok?: true; message?: string }
          | ModuleLabErrorResponse
          | null;

        if (!response.ok || !payload) {
          setError(
            resolveModuleLabErrorMessage(
              dictionary,
              payload && "error" in payload ? payload : null,
              dictionary.actionFailed,
            ),
          );
          return;
        }

        setFeedback(payload.message ?? dictionary.actionSuccess);
      } catch {
        setError(dictionary.actionFailed);
      }
    });
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
          <Title order={3}>{dictionary.cardTitle}</Title>
          <Text c="dimmed" mt="xs">
            {dictionary.cardDescription}
          </Text>
          {workspaceName ? (
            <Text c="dimmed" mt="xs">
              {dictionary.workspaceContextNotice.replace("{workspace}", workspaceName)}
            </Text>
          ) : null}
        </div>

        <TextInput
          label={dictionary.actionLabel}
          value={message}
          disabled={!canRunJob}
          onChange={(event) => setMessage(event.currentTarget.value)}
        />

        <Group>
          <Button color="teal" disabled={!canRunJob} loading={submitting} onClick={handleSubmit}>
            {dictionary.actionSubmit}
          </Button>
        </Group>

        {!canRunJob ? <Alert color="yellow">{dictionary.readOnlyNotice}</Alert> : null}
        {error ? <Alert color="red">{error}</Alert> : null}
        {feedback ? <Alert color="teal">{feedback}</Alert> : null}

        <Stack gap="xs">
          <Title order={4}>{dictionary.statusTitle}</Title>
          {loading ? (
            <Text c="dimmed">Loading...</Text>
          ) : status ? (
            <Stack gap="xs">
              <Text fw={600}>
                {status.module.label} ({status.module.id})
              </Text>
              <Text size="sm" c="dimmed">
                {dictionary.jobsTitle}
              </Text>
              {status.jobs.map((job) => (
                <Text key={job.id} c="dimmed">
                  - {job.id} [{job.queue}]
                </Text>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed">{dictionary.idleState}</Text>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
