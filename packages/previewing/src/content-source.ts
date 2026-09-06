export interface CompiledMdxResult {
  compiledSource: string;
  version: number;
}

export interface ContentSource {
  readFile(relativePath: string): Promise<string>;
  listFiles(directory: string): Promise<string[]>;
  exists(relativePath: string): Promise<boolean>;
  resolveUrl?(relativePath: string): Promise<string | null> | string | null;
  readCompiledMdx?(relativePath: string): Promise<CompiledMdxResult | null>;
  /**
   * When the served content was published, ISO 8601, or null when the source
   * cannot know (a local checkout, or a manifest written before this field
   * existed). Sitemaps use it for `lastmod`, so a null must omit the tag
   * rather than substitute a build or request time.
   */
  publishedAt?(): Promise<string | null>;
}
