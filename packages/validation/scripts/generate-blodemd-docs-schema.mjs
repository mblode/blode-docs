import fs from "node:fs/promises";

const sourcePath = new URL(
  "../vendor/mintlify-docs-schema.json",
  import.meta.url
);
const outputPath = new URL("../src/blodemd-docs-schema.json", import.meta.url);

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "$schema",
  "api",
  "appearance",
  "contextual",
  "description",
  "favicon",
  "logo",
  "metadata",
  "name",
  "navbar",
  "navigation",
  "search",
  "seo",
]);

const CONTEXTUAL_OPTIONS = [
  "add-mcp",
  "aistudio",
  "assistant",
  "chatgpt",
  "claude",
  "copy",
  "cursor",
  "devin",
  "devin-mcp",
  "grok",
  "mcp",
  "perplexity",
  "view",
  "vscode",
  "windsurf",
];

const main = async () => {
  const source = JSON.parse(await fs.readFile(sourcePath, "utf8"));
  const baseVariant = structuredClone(source.anyOf?.[0]);
  if (!baseVariant || typeof baseVariant !== "object") {
    throw new Error("Expected a theme variant in mintlify-docs-schema.json.");
  }

  const properties = Object.fromEntries(
    Object.entries(baseVariant.properties ?? {}).filter(([key]) =>
      ALLOWED_TOP_LEVEL_FIELDS.has(key)
    )
  );

  if (properties.$schema) {
    properties.$schema.default = "https://blode.md/docs.json";
    properties.$schema.description = "JSON Schema URL for editor autocomplete.";
  }

  if (properties.logo) {
    properties.logo.description =
      "Your site logo. Provide a single image path or separate files for light and dark mode.";
    const objectVariant = properties.logo.anyOf?.find(
      (entry) => entry?.type === "object"
    );
    if (objectVariant?.properties?.alt) {
      delete objectVariant.properties.alt;
    }
  }

  if (properties.favicon) {
    properties.favicon.description =
      "Path to your favicon file, including the file extension. Provide a single file or separate files for light and dark mode.";
  }

  if (properties.appearance) {
    properties.appearance.description = "Light and dark mode settings.";
  }

  const contextualEnum =
    properties.contextual?.properties?.options?.items?.anyOf?.find((entry) =>
      Array.isArray(entry?.enum)
    );
  if (contextualEnum) {
    contextualEnum.enum = CONTEXTUAL_OPTIONS;
  }

  if (properties.seo) {
    properties.seo = {
      additionalProperties: false,
      description: "SEO indexing configuration.",
      properties: {
        indexing: {
          description:
            "Set `all` to index every page, or `default` to respect page-level `noindex` frontmatter.",
          enum: ["all", "default"],
          type: "string",
        },
      },
      type: "object",
    };
  }

  const schema = {
    $id: "https://blode.md/docs.json",
    $schema: source.$schema,
    additionalProperties: false,
    definitions: source.definitions,
    description:
      "Schema for Blode.md docs.json configuration files. Derived from the vendored Mintlify schema and pruned to the supported Blode.md surface.",
    properties,
    required: ["name", "navigation"],
    type: "object",
  };

  await fs.writeFile(outputPath, `${JSON.stringify(schema, null, 2)}\n`);
};

await main();
