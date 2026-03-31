import type { SiteConfig } from "@repo/models";
import { createFsSource, loadSiteConfig } from "@repo/previewing";

import { CliError, EXIT_CODES } from "./errors.js";

const CONFIG_FILE = "docs.json";

export interface ValidatedSiteConfigResult {
  config: SiteConfig;
  warnings: string[];
}

export const loadValidatedSiteConfig = async (
  root: string
): Promise<ValidatedSiteConfigResult> => {
  const result = await loadSiteConfig(createFsSource(root));

  if (!result.ok) {
    throw new CliError(
      result.errors.join("\n"),
      EXIT_CODES.VALIDATION,
      `Make sure ${CONFIG_FILE} exists and is valid JSON.`
    );
  }

  return {
    config: result.config,
    warnings: result.warnings,
  };
};
