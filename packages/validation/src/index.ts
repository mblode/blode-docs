import {
  LegacyDocsConfigSchema,
  SiteConfigSchema,
  FrontmatterSchemaByType,
} from "@repo/models";
import type {
  ContentType,
  FrontmatterByType,
  LegacyDocsConfig,
  SiteConfig,
} from "@repo/models";

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

const formatIssues = (issues: { path: PropertyKey[]; message: string }[]) =>
  issues.map((issue) => {
    const path = issue.path.length
      ? issue.path.map((part) => String(part)).join(".")
      : "root";
    return `${path}: ${issue.message}`;
  });

export const validateSiteConfig = (
  input: unknown
): ValidationResult<SiteConfig> => {
  const result = SiteConfigSchema.safeParse(input);
  if (result.success) {
    return { data: result.data, success: true };
  }

  const issues = formatIssues(result.error.issues);
  return { errors: issues, success: false };
};

export const validateLegacyDocsConfig = (
  input: unknown
): ValidationResult<LegacyDocsConfig> => {
  const result = LegacyDocsConfigSchema.safeParse(input);
  if (result.success) {
    return { data: result.data, success: true };
  }

  const issues = formatIssues(result.error.issues);
  return { errors: issues, success: false };
};

export const validateFrontmatter = <Type extends ContentType>(
  type: Type,
  input: unknown
): ValidationResult<FrontmatterByType[Type]> => {
  const schema = FrontmatterSchemaByType[type];
  const result = schema.safeParse(input);
  if (result.success) {
    return { data: result.data as FrontmatterByType[Type], success: true };
  }

  const issues = formatIssues(result.error.issues);
  return { errors: issues, success: false };
};
