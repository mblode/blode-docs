import type { SiteConfig } from "@repo/models";
import { createFsSource, loadSiteConfig } from "@repo/previewing";

import { CliError, EXIT_CODES } from "./errors.js";

const CONFIG_FILE = "docs.json";

export interface ValidatedSiteConfigResult {
  config: SiteConfig;
  warnings: string[];
}

const getSiteConfigHint = (errors: string[]): string => {
  if (errors.includes(`${CONFIG_FILE} not found.`)) {
    return `Make sure ${CONFIG_FILE} exists in the selected docs directory or pass the docs directory explicitly.`;
  }

  return `Fix the ${CONFIG_FILE} errors above and try again.`;
};

export const loadValidatedSiteConfig = async (
  root: string
): Promise<ValidatedSiteConfigResult> => {
  const result = await loadSiteConfig(createFsSource(root));

  if (!result.ok) {
    throw new CliError(
      result.errors.join("\n"),
      EXIT_CODES.VALIDATION,
      getSiteConfigHint(result.errors)
    );
  }

  return {
    config: result.config,
    warnings: result.warnings,
  };
};
