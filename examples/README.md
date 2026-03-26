# Examples

This folder contains end-to-end MDX examples for each content type. All examples share a single root config at `examples/config.json` so navigation, themes, and collection routing are centralized.

## How to use

1. Open `examples/config.json` to see collections, navigation, and routing.
2. Edit the `.mdx` files in each folder to update content.
3. Preview with your MDX pipeline.

## Data model overview

All content is MDX + frontmatter. The frontmatter defines metadata; the body is human-readable content.

### site

- Folder: `examples/site`
- Purpose: Landing-style content
- Frontmatter: `title`, `description`
- Files: `index.mdx`, `about.mdx`

### blog

- Folder: `examples/blog`
- Purpose: Posts and updates
- Frontmatter: `title`, `description`, `date`, `tags[]`
- Files: `2026-01-15-hello-world.mdx`

### docs

- Folder: `examples/docs`
- Purpose: Product docs and guides
- Frontmatter: `title`, `description`
- Files: `introduction.mdx`, `installation.mdx`

### courses

- Folder: `examples/courses`
- Purpose: Learning content with lessons
- Frontmatter: `title`, `description`, `order`
- Files: `getting-started/index.mdx`, `getting-started/lesson-1.mdx`

### products

- Folder: `examples/products`
- Purpose: Product catalog pages
- Frontmatter: `title`, `description`, `sku`, `price`, `currency`
- Files: `starter.mdx`

### notes

- Folder: `examples/notes`
- Purpose: Personal or team notes
- Frontmatter: `title`, `description`, `date`
- Files: `2026-01-15.mdx`

### forms

- Folder: `examples/forms`
- Purpose: Form definitions
- Frontmatter: `title`, `description`, `fields[]`
- Files: `contact.mdx`

### sheets

- Folder: `examples/sheets`
- Purpose: Lightweight sheet-like content
- Frontmatter: `title`, `description`, `columns[]`
- Files: `leads.mdx`

### slides

- Folder: `examples/slides`
- Purpose: Slide decks as MDX
- Frontmatter: `title`, `description`
- Files: `overview.mdx`

### todos

- Folder: `examples/todos`
- Purpose: Task lists
- Frontmatter: `title`, `description`, `date`
- Files: `today.mdx`

## Config

The root `examples/config.json` uses a Mintlify-like structure:

- `"$schema": "https://mintlify.com/site.json"`
- `theme`: UI theme
- `name`: site identifier
- `collections[]`: list of content collections
- `collections[].root`: folder that contains MDX for the collection
- `collections[].slugPrefix`: URL prefix for the collection routes
- `collections[].navigation.groups[].pages`: ordered list of docs pages (relative paths)

These configs are intentionally minimal to keep DX simple.
