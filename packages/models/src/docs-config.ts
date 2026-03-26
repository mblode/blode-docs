import { z } from "zod";

const UrlOrPathSchema = z.string().min(1);

export const DocsColorsSchema = z
  .object({
    background: z.string().optional(),
    border: z.string().optional(),
    dark: z.string().optional(),
    light: z.string().optional(),
    muted: z.string().optional(),
    primary: z.string().min(1),
    surface: z.string().optional(),
  })
  .strict();

export const DocsFontsSchema = z
  .object({
    body: z.string().optional(),
    cssUrl: z.string().optional(),
    heading: z.string().optional(),
    mono: z.string().optional(),
    provider: z.enum(["google", "local", "custom"]).optional(),
  })
  .strict();

export const DocsLogoSchema = z
  .object({
    alt: z.string().optional(),
    dark: UrlOrPathSchema.optional(),
    light: UrlOrPathSchema.optional(),
  })
  .strict();

export const DocsNavLinkSchema = z
  .object({
    href: z.string().min(1),
    label: z.string().min(1),
  })
  .strict();

export const DocsNavAnchorSchema = z
  .object({
    href: z.string().min(1),
    label: z.string().min(1),
  })
  .strict();

export const DocsNavLocaleSchema = z
  .object({
    label: z.string().min(1),
    locale: z.string().optional(),
    url: z.string().min(1),
  })
  .strict();

export const DocsNavVersionSchema = z
  .object({
    label: z.string().min(1),
    url: z.string().min(1),
  })
  .strict();

export const DocsOpenApiSourceSchema = z
  .object({
    basePath: z.string().optional(),
    directory: z.string().optional(),
    include: z.array(z.string()).optional(),
    source: z.string().min(1),
  })
  .strict();

export const DocsNavGroupSchema = z
  .object({
    expanded: z.boolean().optional(),
    group: z.string().optional(),
    openapi: z.union([z.string().min(1), DocsOpenApiSourceSchema]).optional(),
    pages: z.array(z.string()).optional(),
  })
  .strict();

export const DocsNavigationSchema = z
  .object({
    global: z
      .object({
        anchors: z.array(DocsNavAnchorSchema).optional(),
        links: z.array(DocsNavLinkSchema).optional(),
      })
      .strict()
      .optional(),
    groups: z.array(DocsNavGroupSchema).optional(),
    hidden: z.array(z.string()).optional(),
    languages: z.array(DocsNavLocaleSchema).optional(),
    pages: z.array(z.string()).optional(),
    versions: z.array(DocsNavVersionSchema).optional(),
  })
  .strict();

export const DocsScriptsSchema = z
  .object({
    body: z.array(z.string()).optional(),
    head: z.array(z.string()).optional(),
  })
  .strict();

export const DocsFeatureFlagsSchema = z
  .object({
    rightToc: z.boolean().optional(),
    search: z.boolean().optional(),
    themeToggle: z.boolean().optional(),
    toc: z.boolean().optional(),
  })
  .strict();

export const DocsOpenApiProxySchema = z
  .object({
    allowedHosts: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export const LegacyDocsConfigSchema = z
  .object({
    colors: DocsColorsSchema.optional(),
    description: z.string().optional(),
    favicon: UrlOrPathSchema.optional(),
    features: DocsFeatureFlagsSchema.optional(),
    fonts: DocsFontsSchema.optional(),
    logo: DocsLogoSchema.optional(),
    metadata: z
      .object({
        defaultTitle: z.string().optional(),
        ogImage: UrlOrPathSchema.optional(),
        titleTemplate: z.string().optional(),
      })
      .strict()
      .optional(),
    name: z.string().min(1),
    navigation: DocsNavigationSchema,
    openapi: z
      .union([z.string(), z.array(z.string()), DocsOpenApiSourceSchema])
      .optional(),
    openapiProxy: DocsOpenApiProxySchema.optional(),
    scripts: DocsScriptsSchema.optional(),
    theme: z.string().optional(),
  })
  .strict();

export type LegacyDocsConfig = z.infer<typeof LegacyDocsConfigSchema>;

export const ContentTypeSchema = z.enum([
  "site",
  "blog",
  "docs",
  "courses",
  "products",
  "notes",
  "forms",
  "sheets",
  "slides",
  "todos",
]);

export type ContentType = z.infer<typeof ContentTypeSchema>;

const FrontmatterBaseSchema = z
  .object({
    description: z.string().optional(),
    title: z.string().min(1),
  })
  .passthrough();

const FrontmatterBlogSchema = FrontmatterBaseSchema.extend({
  date: z.string().min(1),
  tags: z.array(z.string()).optional(),
}).passthrough();

const FrontmatterCoursesSchema = FrontmatterBaseSchema.extend({
  order: z.number(),
}).passthrough();

const FrontmatterProductsSchema = FrontmatterBaseSchema.extend({
  currency: z.string().min(1),
  price: z.number(),
  sku: z.string().min(1),
}).passthrough();

const FrontmatterNotesSchema = FrontmatterBaseSchema.extend({
  date: z.string().min(1),
}).passthrough();

const FormFieldSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
    type: z.string().min(1),
  })
  .passthrough();

const FrontmatterFormsSchema = FrontmatterBaseSchema.extend({
  fields: z.array(FormFieldSchema).min(1),
}).passthrough();

const FrontmatterSheetsSchema = FrontmatterBaseSchema.extend({
  columns: z.array(z.string()).min(1),
}).passthrough();

const FrontmatterTodosSchema = FrontmatterBaseSchema.extend({
  date: z.string().min(1),
}).passthrough();

export const FrontmatterSchemaByType = {
  blog: FrontmatterBlogSchema,
  courses: FrontmatterCoursesSchema,
  docs: FrontmatterBaseSchema,
  forms: FrontmatterFormsSchema,
  notes: FrontmatterNotesSchema,
  products: FrontmatterProductsSchema,
  sheets: FrontmatterSheetsSchema,
  site: FrontmatterBaseSchema,
  slides: FrontmatterBaseSchema,
  todos: FrontmatterTodosSchema,
} as const;

export type FrontmatterByType = {
  [Key in ContentType]: z.infer<(typeof FrontmatterSchemaByType)[Key]>;
};

export const CollectionIndexSchema = z
  .object({
    description: z.string().optional(),
    hidden: z.boolean().optional(),
    slug: z.string().min(1),
    title: z.string().optional(),
  })
  .strict();

export const CollectionSortSchema = z
  .object({
    direction: z.enum(["asc", "desc"]).optional(),
    field: z.enum(["date", "order", "title", "price"]).optional(),
  })
  .strict();

export const CollectionConfigSchema = z
  .object({
    id: z.string().min(1),
    index: CollectionIndexSchema.optional(),
    navigation: DocsNavigationSchema.optional(),
    openapi: z
      .union([z.string(), z.array(z.string()), DocsOpenApiSourceSchema])
      .optional(),
    root: z.string().optional(),
    slugPrefix: z.string().optional(),
    sort: CollectionSortSchema.optional(),
    type: ContentTypeSchema,
  })
  .strict();

export const SiteConfigSchema = z
  .object({
    collections: z.array(CollectionConfigSchema).min(1),
    colors: DocsColorsSchema.optional(),
    description: z.string().optional(),
    favicon: UrlOrPathSchema.optional(),
    features: DocsFeatureFlagsSchema.optional(),
    fonts: DocsFontsSchema.optional(),
    logo: DocsLogoSchema.optional(),
    metadata: z
      .object({
        defaultTitle: z.string().optional(),
        ogImage: UrlOrPathSchema.optional(),
        titleTemplate: z.string().optional(),
      })
      .strict()
      .optional(),
    name: z.string().min(1),
    navigation: DocsNavigationSchema.optional(),
    openapiProxy: DocsOpenApiProxySchema.optional(),
    scripts: DocsScriptsSchema.optional(),
    theme: z.string().optional(),
  })
  .strict();

export type SiteConfig = z.infer<typeof SiteConfigSchema>;
export type CollectionConfig = z.infer<typeof CollectionConfigSchema>;
export type DocsNavigation = z.infer<typeof DocsNavigationSchema>;
export type DocsNavGroup = z.infer<typeof DocsNavGroupSchema>;
export type DocsOpenApiSource = z.infer<typeof DocsOpenApiSourceSchema>;
