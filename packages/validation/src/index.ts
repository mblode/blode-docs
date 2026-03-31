import {
  DocsConfigSchema,
  FrontmatterSchemaByType,
  SiteConfigSchema,
} from "@repo/models";
import type {
  ContentType,
  DocsConfig,
  FrontmatterByType,
  SiteConfig,
} from "@repo/models";

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

const formatIssues = (issues: { path: PropertyKey[]; message: string }[]) =>
  issues.map((issue) => {
    const path = issue.path.length ? issue.path.map(String).join(".") : "root";
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

export const validateDocsConfig = (
  input: unknown
): ValidationResult<DocsConfig> => {
  const result = DocsConfigSchema.safeParse(input);
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
