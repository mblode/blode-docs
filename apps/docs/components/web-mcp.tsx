"use client";

import { useEffect } from "react";

type JSONSchemaObject = {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
  additionalProperties?: boolean;
};

type WebMCPTool = {
  name: string;
  description: string;
  inputSchema: JSONSchemaObject;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

type NavigatorModelContext = {
  provideContext?: (context: { tools: WebMCPTool[] }) => void | Promise<void>;
};

const buildTools = (): WebMCPTool[] => [
  {
    description:
      "Return the shell command that scaffolds a new Blode.md docs site with the given project slug.",
    execute: async ({ slug, template }) => {
      const projectSlug = typeof slug === "string" && slug ? slug : "my-docs";
      const variant =
        template === "starter" || template === "minimal" ? template : "minimal";
      return {
        command: `npx blodemd new docs --slug ${projectSlug} --template ${variant} -y`,
      };
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        slug: {
          description: "Project slug (lowercase, hyphen-separated).",
          type: "string",
        },
        template: {
          description: "Template to use: 'minimal' or 'starter'.",
          type: "string",
        },
      },
      required: ["slug"],
      type: "object",
    },
    name: "blodemd_scaffold_command",
  },
  {
    description:
      "Return the shell command that deploys a local Blode.md docs directory to the given project.",
    execute: async ({ directory, project }) => {
      const dir = typeof directory === "string" && directory ? directory : "docs";
      const projectSlug = typeof project === "string" && project ? project : "my-docs";
      return {
        command: `npx blodemd push ${dir} --project ${projectSlug}`,
      };
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        directory: {
          description: "Local directory containing the docs.",
          type: "string",
        },
        project: {
          description: "Target Blode.md project slug.",
          type: "string",
        },
      },
      required: ["project"],
      type: "object",
    },
    name: "blodemd_deploy_command",
  },
  {
    description: "Open the Blode.md dashboard in the current tab.",
    execute: async () => {
      if (typeof window !== "undefined") {
        window.location.assign("/app");
      }
      return { ok: true };
    },
    inputSchema: {
      additionalProperties: false,
      properties: {},
      type: "object",
    },
    name: "blodemd_open_dashboard",
  },
];

export function WebMcpTools() {
  useEffect(() => {
    const nav = navigator as Navigator & {
      modelContext?: NavigatorModelContext;
    };
    if (!nav.modelContext?.provideContext) {
      return;
    }
    void nav.modelContext.provideContext({ tools: buildTools() });
  }, []);

  return null;
}
