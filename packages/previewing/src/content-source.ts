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
}
