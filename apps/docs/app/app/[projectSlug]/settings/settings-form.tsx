"use client";

// oxlint-disable eslint-plugin-react-perf/jsx-no-new-function-as-prop -- deferred useCallback refactor
import type { Project, ProjectAnalytics } from "@repo/contracts";
import { LinkIcon } from "blode-icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";

const DETAILS_ANCHOR = "project-details";
const ANALYTICS_ANCHOR = "analytics";

const GA4_REGEX = /^G-[A-Z0-9]{4,20}$/;
const POSTHOG_KEY_REGEX = /^phc_[A-Za-z0-9]{20,}$/;

const SectionTitle = ({
  anchor,
  children,
}: {
  anchor: string;
  children: React.ReactNode;
}) => (
  <h4 className="inline-flex items-center gap-3 font-semibold text-xl leading-8 tracking-[-0.02em]">
    <a
      className="group inline-flex items-center gap-2 text-inherit no-underline"
      href={`#${anchor}`}
    >
      <span>{children}</span>
      <LinkIcon
        aria-hidden="true"
        className="size-4 text-muted-foreground opacity-0 transition-opacity group-focus-visible:opacity-100 group-hover:opacity-100"
      />
    </a>
  </h4>
);

interface ProjectSettingsFormProps {
  accessToken: string;
  project: Project;
}

const ProjectDetailsCard = ({
  accessToken,
  project,
}: ProjectSettingsFormProps) => {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [deploymentName, setDeploymentName] = useState(project.deploymentName);
  const [description, setDescription] = useState(project.description ?? "");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSaved, setDetailsSaved] = useState(false);

  const handleSaveDetails = useCallback(async () => {
    setDetailsError(null);
    setDetailsSaved(false);
    setSavingDetails(true);
    try {
      await apiFetch(`/projects/${project.id}`, {
        accessToken,
        body: {
          deploymentName: deploymentName.trim(),
          description: description.trim() || null,
          name: name.trim(),
        },
        method: "PATCH",
      });
      setDetailsSaved(true);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to save changes.";
      setDetailsError(message);
    } finally {
      setSavingDetails(false);
    }
  }, [accessToken, deploymentName, description, name, project.id, router]);

  return (
    <Card id={DETAILS_ANCHOR}>
      <CardHeader className="gap-2 px-6 pt-2">
        <SectionTitle anchor={DETAILS_ANCHOR}>Project Details</SectionTitle>
        <p className="text-muted-foreground text-sm">
          Slug ({project.slug}) is permanent and used in your subdomain.
        </p>
      </CardHeader>
      <CardContent className="px-6">
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="name">Project name</FieldLabel>
            <Input
              className="w-[300px] max-w-full"
              id="name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="deployment-name">Deployment name</FieldLabel>
            <Input
              className="w-[300px] max-w-full"
              id="deployment-name"
              onChange={(event) => setDeploymentName(event.target.value)}
              value={deploymentName}
            />
            <FieldDescription>
              Shown in the project topbar of deployed docs.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Input
              className="w-[300px] max-w-full"
              id="description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional"
              value={description}
            />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-between px-6">
        <div className="min-h-5 text-sm">
          {detailsError && <FieldError>{detailsError}</FieldError>}
          {!detailsError && detailsSaved && (
            <span className="text-muted-foreground">Saved.</span>
          )}
        </div>
        <Button
          disabled={savingDetails || !name.trim() || !deploymentName.trim()}
          onClick={handleSaveDetails}
          type="button"
        >
          {savingDetails ? "Saving..." : "Save"}
        </Button>
      </CardFooter>
    </Card>
  );
};

const buildAnalyticsPayload = (
  ga4Id: string,
  posthogKey: string,
  posthogHost: string
): ProjectAnalytics | null => {
  const payload: ProjectAnalytics = {};
  if (ga4Id.trim()) {
    payload.ga4 = { measurementId: ga4Id.trim() };
  }
  if (posthogKey.trim()) {
    payload.posthog = {
      projectKey: posthogKey.trim(),
      ...(posthogHost.trim() ? { host: posthogHost.trim() } : {}),
    };
  }
  return payload.ga4 || payload.posthog ? payload : null;
};

const validateAnalytics = (
  ga4Id: string,
  posthogKey: string,
  posthogHost: string
): string | null => {
  const ga4 = ga4Id.trim();
  if (ga4 && !GA4_REGEX.test(ga4)) {
    return "GA4 measurement IDs look like G-XXXXXXXXXX.";
  }
  const key = posthogKey.trim();
  if (key && !POSTHOG_KEY_REGEX.test(key)) {
    return "PostHog project keys start with phc_. Personal API keys (phx_) are not supported.";
  }
  const host = posthogHost.trim();
  if (host) {
    try {
      new URL(host);
    } catch {
      return "PostHog host must be a valid URL.";
    }
  }
  return null;
};

const AnalyticsCard = ({ accessToken, project }: ProjectSettingsFormProps) => {
  const router = useRouter();
  const initial = project.analytics ?? null;
  const [ga4Id, setGa4Id] = useState(initial?.ga4?.measurementId ?? "");
  const [posthogKey, setPosthogKey] = useState(
    initial?.posthog?.projectKey ?? ""
  );
  const [posthogHost, setPosthogHost] = useState(initial?.posthog?.host ?? "");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    const validationError = validateAnalytics(ga4Id, posthogKey, posthogHost);
    if (validationError) {
      setErrorMessage(validationError);
      setSaved(false);
      return;
    }
    setErrorMessage(null);
    setSaved(false);
    setSaving(true);
    try {
      await apiFetch(`/projects/${project.id}`, {
        accessToken,
        body: {
          analytics: buildAnalyticsPayload(ga4Id, posthogKey, posthogHost),
        },
        method: "PATCH",
      });
      setSaved(true);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to save changes.";
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }, [accessToken, ga4Id, posthogHost, posthogKey, project.id, router]);

  return (
    <Card id={ANALYTICS_ANCHOR}>
      <CardHeader className="gap-2 px-6 pt-2">
        <SectionTitle anchor={ANALYTICS_ANCHOR}>Analytics</SectionTitle>
        <p className="text-muted-foreground text-sm">
          Bring your own Google Analytics 4 or PostHog. We inject the scripts on
          every tenant page. Leave a field empty to disable that provider.
        </p>
      </CardHeader>
      <CardContent className="px-6">
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="ga4">Google Analytics 4</FieldLabel>
            <Input
              className="w-[300px] max-w-full"
              id="ga4"
              onChange={(event) => setGa4Id(event.target.value)}
              placeholder="G-XXXXXXXXXX"
              value={ga4Id}
            />
            <FieldDescription>
              Measurement ID. Find it in GA4 → Admin → Data streams.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="posthog-key">PostHog project key</FieldLabel>
            <Input
              className="w-[300px] max-w-full"
              id="posthog-key"
              onChange={(event) => setPosthogKey(event.target.value)}
              placeholder="phc_..."
              value={posthogKey}
            />
            <FieldDescription>
              Project API key. Find it in PostHog → Project settings.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="posthog-host">PostHog host</FieldLabel>
            <Input
              className="w-[300px] max-w-full"
              id="posthog-host"
              onChange={(event) => setPosthogHost(event.target.value)}
              placeholder="https://us.i.posthog.com"
              value={posthogHost}
            />
            <FieldDescription>
              Optional. Defaults to https://us.i.posthog.com. Use
              https://eu.i.posthog.com for EU cloud.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-between px-6">
        <div className="min-h-5 text-sm">
          {errorMessage && <FieldError>{errorMessage}</FieldError>}
          {!errorMessage && saved && (
            <span className="text-muted-foreground">Saved.</span>
          )}
        </div>
        <Button disabled={saving} onClick={handleSave} type="button">
          {saving ? "Saving..." : "Save"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export const ProjectSettingsForm = ({
  accessToken,
  project,
}: ProjectSettingsFormProps) => (
  <>
    <ProjectDetailsCard accessToken={accessToken} project={project} />
    <AnalyticsCard accessToken={accessToken} project={project} />
  </>
);
