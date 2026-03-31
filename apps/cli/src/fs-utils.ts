import fs from "node:fs/promises";
import path from "node:path";

export const writeFileIfMissing = async (
  filePath: string,
  content: string
): Promise<void> => {
  try {
    await fs.writeFile(filePath, content, { flag: "wx" });
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;

    if (code === "EEXIST") {
      const existing = await fs.stat(filePath).catch(() => null);

      if (existing?.isFile()) {
        return;
      }
    }

    throw error;
  }
};

export const writeSymlinkIfMissing = async (
  filePath: string,
  target: string,
  options?: {
    fallbackContent?: string;
    lstat?: typeof fs.lstat;
    symlink?: typeof fs.symlink;
  }
): Promise<void> => {
  const lstat = options?.lstat ?? fs.lstat;
  const symlink = options?.symlink ?? fs.symlink;

  try {
    await symlink(target, filePath);
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;

    if (code === "EEXIST") {
      const existing = await lstat(filePath).catch(() => null);

      if (existing?.isFile() || existing?.isSymbolicLink()) {
        return;
      }
    }

    if (
      options?.fallbackContent &&
      (code === "EINVAL" ||
        code === "ENOTSUP" ||
        code === "EPERM" ||
        code === "UNKNOWN")
    ) {
      await writeFileIfMissing(filePath, options.fallbackContent);
      return;
    }

    throw error;
  }
};

export const findExistingPaths = async (
  root: string,
  relativePaths: string[]
): Promise<string[]> => {
  const existingPaths = await Promise.all(
    relativePaths.map(async (relativePath) => {
      const stats = await fs
        .lstat(path.join(root, relativePath))
        .catch(() => null);

      return stats ? relativePath : null;
    })
  );

  return existingPaths
    .filter((relativePath): relativePath is string => relativePath !== null)
    .toSorted((left, right) => left.localeCompare(right));
};
