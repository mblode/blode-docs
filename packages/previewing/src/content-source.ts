export interface ContentSource {
  readFile(relativePath: string): Promise<string>;
  listFiles(directory: string): Promise<string[]>;
  exists(relativePath: string): Promise<boolean>;
  resolveUrl?(relativePath: string): Promise<string | null> | string | null;
}
