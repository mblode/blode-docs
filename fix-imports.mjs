import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function fixImports(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      const filePath = join(entry.parentPath || entry.path, entry.name);
      let content = await readFile(filePath, 'utf-8');

      // Fix relative imports that don't end with .js
      const updated = content.replace(
        /from ['"](\.\.\?\/[^'"]+?)(?<!\.js)['"]/g,
        'from "$1.js"'
      );

      if (updated !== content) {
        await writeFile(filePath, updated, 'utf-8');
        console.log(`Fixed: ${filePath}`);
      }
    }
  }
}

await fixImports('packages/db/src');
console.log('Done!');
