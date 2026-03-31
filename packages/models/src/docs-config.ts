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
    href: z.string().min(1).optional(),
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
    hidden: z.boolean().optional(),
    openapi: z.union([z.string().min(1), DocsOpenApiSourceSchema]).optional(),
    pages: z.array(z.string()).optional(),
  })
  .strict();

export const DocsNavTabSchema = z
  .object({
    groups: z.array(DocsNavGroupSchema).optional(),
    href: z.string().min(1).optional(),
    icon: z.string().optional(),
    label: z.string().min(1),
    pages: z.array(z.string()).optional(),
  })
  .strict()
  .refine(
    (value) =>
      Boolean(value.groups?.length || value.pages?.length || value.href),
    { message: "tab must define groups, pages, or href", path: [] }
  );

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
    tabs: z.array(DocsNavTabSchema).optional(),
    versions: z.array(DocsNavVersionSchema).optional(),
  })
  .strict();

export const DocsScriptsSchema = z
  .object({
    body: z.array(z.string()).optional(),
    head: z.array(z.string()).optional(),
  })
  .strict();

export const DocsSeoSchema = z
  .object({
    indexing: z.enum(["all", "default"]).optional(),
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

const MintlifyLogoSchema = z.union([
  UrlOrPathSchema,
  z
    .object({
      dark: UrlOrPathSchema,
      href: z.string().min(1).optional(),
      light: UrlOrPathSchema,
    })
    .strict(),
]);

const MintlifyFaviconSchema = z.union([
  UrlOrPathSchema,
  z
    .object({
      dark: UrlOrPathSchema,
      light: UrlOrPathSchema,
    })
    .strict(),
]);

const MintlifyNavbarLinkSchema = z
  .object({
    href: z.string().min(1),
    icon: z.string().optional(),
    iconType: z.string().optional(),
    label: z.string().optional(),
    type: z.enum(["discord", "github"]).optional(),
  })
  .strict();

const MintlifyNavbarPrimarySchema = z
  .object({
    href: z.string().min(1),
    label: z.string().optional(),
    type: z.enum(["button", "discord", "github"]),
  })
  .strict();

const MintlifyNavbarSchema = z
  .object({
    links: z.array(MintlifyNavbarLinkSchema).optional(),
    primary: MintlifyNavbarPrimarySchema.optional(),
  })
  .strict();

const MintlifyNavigationGlobalSchema = z
  .object({
    anchors: z
      .array(
        z
          .object({
            anchor: z.string().min(1),
            color: z
              .object({
                dark: z.string().optional(),
                light: z.string().optional(),
              })
              .strict()
              .optional(),
            hidden: z.boolean().optional(),
            href: z.string().min(1),
            icon: z.string().optional(),
            iconType: z.string().optional(),
          })
          .strict()
      )
      .optional(),
  })
  .strict();

const MintlifyNavigationGroupSchema = z
  .object({
    expanded: z.boolean().optional(),
    group: z.string().min(1),
    hidden: z.boolean().optional(),
    icon: z.string().optional(),
    pages: z.array(z.string()).optional(),
    root: z.string().optional(),
    tag: z.string().optional(),
  })
  .strict();

const MintlifyNavTabSchema = z
  .object({
    groups: z.array(MintlifyNavigationGroupSchema).optional(),
    hidden: z.boolean().optional(),
    href: z.string().min(1).optional(),
    icon: z.string().optional(),
    pages: z.array(z.string()).optional(),
    tab: z.string().min(1),
  })
  .strict();

const MintlifyNavigationSchema = z
  .object({
    global: MintlifyNavigationGlobalSchema.optional(),
    groups: z.array(MintlifyNavigationGroupSchema).optional(),
    languages: z
      .array(
        z
          .object({
            default: z.boolean().optional(),
            hidden: z.boolean().optional(),
            href: z.string().min(1),
            language: z.string().min(1),
          })
          .strict()
      )
      .optional(),
    pages: z.array(z.string()).optional(),
    tabs: z.array(MintlifyNavTabSchema).optional(),
    versions: z
      .array(
        z
          .object({
            default: z.boolean().optional(),
            hidden: z.boolean().optional(),
            href: z.string().min(1),
            version: z.string().min(1),
          })
          .strict()
      )
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      Boolean(
        value.groups?.length ||
        value.pages?.length ||
        value.tabs?.length ||
        value.languages?.length ||
        value.versions?.length
      ),
    {
      message:
        "navigation must define at least one of groups, pages, tabs, languages, or versions",
      path: [],
    }
  );

const MintlifyApiSchema = z
  .object({
    asyncapi: z
      .union([z.string(), z.array(z.string()), DocsOpenApiSourceSchema])
      .optional(),
    examples: z
      .object({
        autogenerate: z.boolean().optional(),
        defaults: z.enum(["all", "required"]).optional(),
        languages: z.array(z.string()).optional(),
        prefill: z.boolean().optional(),
      })
      .strict()
      .optional(),
    mdx: z
      .object({
        auth: z
          .object({
            method: z.enum(["basic", "bearer", "cobo", "key"]).optional(),
            name: z.string().optional(),
          })
          .strict()
          .optional(),
        server: z
          .union([z.string().min(1), z.array(z.string().min(1))])
          .optional(),
      })
      .strict()
      .optional(),
    openapi: z
      .union([z.string(), z.array(z.string()), DocsOpenApiSourceSchema])
      .optional(),
    params: z
      .object({
        expanded: z.enum(["all", "closed"]).optional(),
      })
      .strict()
      .optional(),
    playground: z
      .object({
        credentials: z.boolean().optional(),
        display: z.enum(["auth", "interactive", "none", "simple"]).optional(),
        proxy: z.boolean().optional(),
      })
      .strict()
      .optional(),
    url: z.literal("full").optional(),
  })
  .strict();

const MintlifyAppearanceSchema = z
  .object({
    default: z.enum(["dark", "light", "system"]).optional(),
    strict: z.boolean().optional(),
  })
  .strict();

const MintlifyMetadataSchema = z
  .object({
    timestamp: z.boolean().optional(),
  })
  .strict();

const MintlifySearchSchema = z
  .object({
    prompt: z.string().optional(),
  })
  .strict();

export const ContextualBuiltinOptionSchema = z.enum([
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
]);

const ContextualCustomHrefQuerySchema = z
  .object({
    key: z.string().min(1),
    value: z.string().min(1),
  })
  .strict();

const ContextualCustomHrefObjectSchema = z
  .object({
    base: z.string().min(1),
    query: z.array(ContextualCustomHrefQuerySchema),
  })
  .strict();

export const ContextualCustomOptionSchema = z
  .object({
    description: z.string().min(1),
    href: z.union([z.string().min(1), ContextualCustomHrefObjectSchema]),
    icon: z.string().min(1),
    iconType: z.string().optional(),
    title: z.string().min(1),
  })
  .strict();

export const ContextualOptionSchema = z.union([
  ContextualBuiltinOptionSchema,
  ContextualCustomOptionSchema,
]);

export const DocsContextualSchema = z
  .object({
    display: z.enum(["header", "toc"]).optional(),
    options: z.array(ContextualOptionSchema),
  })
  .strict();

export type ContextualBuiltinOption = z.infer<
  typeof ContextualBuiltinOptionSchema
>;
export type ContextualCustomOption = z.infer<
  typeof ContextualCustomOptionSchema
>;
export type ContextualOption = z.infer<typeof ContextualOptionSchema>;
export type DocsContextual = z.infer<typeof DocsContextualSchema>;

export const DocsConfigSchema = z
  .object({
    $schema: z.string().optional(),
    api: MintlifyApiSchema.optional(),
    appearance: MintlifyAppearanceSchema.optional(),
    contextual: DocsContextualSchema.optional(),
    description: z.string().optional(),
    favicon: MintlifyFaviconSchema.optional(),
    logo: MintlifyLogoSchema.optional(),
    metadata: MintlifyMetadataSchema.optional(),
    name: z.string().min(1),
    navbar: MintlifyNavbarSchema.optional(),
    navigation: MintlifyNavigationSchema,
    search: MintlifySearchSchema.optional(),
    seo: DocsSeoSchema.optional(),
  })
  .strict();

export type DocsConfig = z.infer<typeof DocsConfigSchema>;
export const MintlifyDocsConfigSchema = DocsConfigSchema;
export type MintlifyDocsConfig = DocsConfig;

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
    hidden: z.boolean().optional(),
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

export const PageModeSchema = z.enum([
  "default",
  "wide",
  "custom",
  "frame",
  "center",
]);

export type PageMode = z.infer<typeof PageModeSchema>;

const FrontmatterDocsSchema = FrontmatterBaseSchema.extend({
  deprecated: z.boolean().optional(),
  hideApiMarker: z.boolean().optional(),
  hideFooterPagination: z.boolean().optional(),
  icon: z.string().optional(),
  iconType: z
    .enum([
      "regular",
      "solid",
      "light",
      "thin",
      "sharp-solid",
      "duotone",
      "brands",
    ])
    .optional(),
  keywords: z.array(z.string()).optional(),
  mode: PageModeSchema.optional(),
  noindex: z.boolean().optional(),
  sidebarTitle: z.string().optional(),
  tag: z.string().optional(),
  url: z.string().url().optional(),
}).passthrough();

export type DocsFrontmatter = z.infer<typeof FrontmatterDocsSchema>;

export const FrontmatterSchemaByType = {
  blog: FrontmatterBlogSchema,
  courses: FrontmatterCoursesSchema,
  docs: FrontmatterDocsSchema,
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
    contextual: DocsContextualSchema.optional(),
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
    seo: DocsSeoSchema.optional(),
    theme: z.string().optional(),
  })
  .strict();

export type SiteConfig = z.infer<typeof SiteConfigSchema>;
export type CollectionConfig = z.infer<typeof CollectionConfigSchema>;
export type DocsNavigation = z.infer<typeof DocsNavigationSchema>;
export type DocsNavGroup = z.infer<typeof DocsNavGroupSchema>;
export type DocsNavTab = z.infer<typeof DocsNavTabSchema>;
export type DocsOpenApiSource = z.infer<typeof DocsOpenApiSourceSchema>;
