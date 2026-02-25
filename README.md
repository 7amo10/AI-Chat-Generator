<div align="center">

<br />

```
  █████╗ ██╗     ██████╗██╗  ██╗ █████╗ ████████╗
 ██╔══██╗██║    ██╔════╝██║  ██║██╔══██╗╚══██╔══╝
 ███████║██║    ██║     ███████║███████║   ██║
 ██╔══██║██║    ██║     ██╔══██║██╔══██║   ██║
 ██║  ██║██║    ╚██████╗██║  ██║██║  ██║   ██║
 ╚═╝  ╚═╝╚═╝     ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝
  ██████╗ ███████╗███╗   ██╗███████╗██████╗  █████╗ ████████╗ ██████╗ ██████╗
 ██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔══██╗██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗
 ██║  ███╗█████╗  ██╔██╗ ██║█████╗  ██████╔╝███████║   ██║   ██║   ██║██████╔╝
 ██║   ██║██╔══╝  ██║╚██╗██║██╔══╝  ██╔══██╗██╔══██║   ██║   ██║   ██║██╔══██╗
 ╚██████╔╝███████╗██║ ╚████║███████╗██║  ██║██║  ██║   ██║   ╚██████╔╝██║  ██║
  ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
```

<br />

**A personal static site generator for archiving AI brainstorming sessions and study plans.**  
Built with Astro 5, React, Three.js, and Tailwind CSS.  
Fully integrated with GitHub Copilot via the Model Context Protocol.

<br />

[![CI](https://github.com/7amo10/AI-Chat-Generator/actions/workflows/ci.yml/badge.svg)](https://github.com/7amo10/AI-Chat-Generator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Astro](https://img.shields.io/badge/Astro-5-FF5D01?logo=astro&logoColor=white)](https://astro.build)
[![MCP](https://img.shields.io/badge/MCP-enabled-6366f1)](https://modelcontextprotocol.io)

<br />

</div>

---



## Overview

AI Chat Generator turns your Copilot conversations and study plans into a navigable, searchable static website. Every session is stored as a typed MDX file. An MCP server exposes eight tools that let Copilot create files, append messages, toggle milestone status, and rebuild the site from natural language prompts.

<div align="center">
<br />

| Homepage timeline | Plan editor | Documentation |
|:---:|:---:|:---:|
| Three.js wave background | Notion-style inline editing | Full MCP reference |

<br />
</div>



---

## Features

- **MCP Server** — 8 Copilot tools for content creation and management via stdio
- **Inline plan editing** — Notion-style edit mode on every plan page, with auto-save to disk
- **Timeline homepage** — vertical git-commit timeline of all sessions, sorted by date
- **Three.js background** — scroll-reactive wave particle field with mouse parallax
- **Dark / Light mode** — CSS variable theming with localStorage persistence and zero FOUC
- **Syntax highlighting** — Shiki-powered code blocks with copy-to-clipboard
- **Content collections** — Astro's type-safe MDX collections with Zod schema validation
- **Documentation page** — full setup and MCP reference at `/docs`
- **CI pipeline** — GitHub Actions workflow for tests, type check, and build

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Astro 5 |
| UI islands | React 19 |
| Styling | Tailwind CSS 3 |
| 3D graphics | Three.js + @react-three/fiber |
| Animation | Framer Motion |
| Content | MDX + Astro Content Collections |
| Schema | Zod |
| MCP protocol | @modelcontextprotocol/sdk |
| Server adapter | @astrojs/node (standalone) |
| Tests | Vitest |

---

## Prerequisites

- Node.js 18 or later
- VS Code with the GitHub Copilot extension
- Git

---

## Installation

**1. Clone the repository**

```bash
git clone https://github.com/your-username/ai-chat-generator.git
cd ai-chat-generator
```

**2. Install dependencies**

```bash
npm install
```

**3. Start the development server**

```bash
npm run dev
```

Open `http://localhost:4321` in your browser.

---

## MCP Server Setup

The MCP server lets GitHub Copilot call tools to create and manage content directly from the VS Code chat panel.

**Configure the server path**

Edit `.vscode/mcp.json` and update the `command` field to the absolute path of your Node.js binary:

```json
{
  "servers": {
    "ai-chat-generator": {
      "type": "stdio",
      "command": "/home/YOU/.nvm/versions/node/v22.x.x/bin/node",
      "args": ["/absolute/path/to/ai-chat-generator/mcp/server.mjs"],
      "env": {}
    }
  }
}
```

Use `which node` (in a terminal where nvm is active) to find the correct path. VS Code spawns the MCP server in an isolated shell where `nvm` is not loaded, so a relative or `node` reference will not work.

**Reload VS Code** after editing `mcp.json`:

```
Ctrl+Shift+P > Developer: Reload Window
```

**Available MCP tools**

| Tool | Description |
|---|---|
| `create_chat` | Create a new MDX chat session file |
| `add_message` | Append a user or AI message to a chat |
| `list_entries` | List all chats and/or plans |
| `get_entry` | Read the full content of a file |
| `create_plan` | Create a new study plan MDX file |
| `update_frontmatter` | Update YAML frontmatter fields |
| `build_site` | Run `npm run build` |
| `delete_entry` | Delete a chat or plan file |

**Example Copilot prompts**

```
"Create a new chat log titled 'React performance deep-dive' with tags [react, perf]"
"List all my study plans"
"Mark the first milestone in jpf-gsoc-mastery-plan.mdx as complete"
"Build the site"
```

---

## CLI Reference

```bash
npm run dev                          # Start local dev server
npm run build                        # Build static site to dist/
npm run preview                      # Preview the built site
npm test                             # Run unit tests
npm run test:coverage                # Run tests with coverage report
npm run lint                         # Run ESLint

npm run chat   -- "Title"            # Create a new chat MDX file
npm run plan   -- "Title"            # Create a new plan MDX file
npm run ls                           # List all chats and plans
npm run ls     -- chats              # List only chats
npm run ls     -- plans              # List only plans
npm run add    -- <file.mdx> user    # Append a User message (stdin)
npm run add    -- <file.mdx> ai      # Append an AI message (stdin)
npm run open   -- <file.mdx>         # Print file content to terminal
```

---

## Content Schema

**Chat session frontmatter** (`src/content/chats/*.mdx`):

```yaml
---
title: "Session Title"
date: 2026-02-25
tags: ["topic", "subtopic"]
tldr: "One-line summary"
action_items:
  - task: "Follow-up task description"
    done: false
---
```

**Study plan frontmatter** (`src/content/plans/*.mdx`):

```yaml
---
title: "Plan Title"
date: 2026-02-25
tags: ["topic"]
tldr: "One-line summary"
difficulty: "intermediate"     # beginner | intermediate | advanced
duration: "3 months"
milestones:
  - title: "Phase 1"
    weeks: "Weeks 1-4"
    status: "not-started"      # not-started | in-progress | complete
---
```

---

## Project Structure

```
ai-chat-generator/
├── src/
│   ├── components/          React islands and Astro UI components
│   ├── content/
│   │   ├── chats/           Chat session MDX files
│   │   └── plans/           Study plan MDX files
│   ├── layouts/             BaseLayout with navbar and theme toggle
│   ├── pages/               Route pages including docs and API routes
│   └── styles/              Global CSS with theme token system
├── mcp/
│   ├── server.mjs           MCP server entry point
│   └── utils.mjs            Pure utility functions (tested)
├── scripts/                 CLI scaffolding helpers
├── tests/                   Vitest unit tests
├── .github/
│   └── workflows/ci.yml     CI pipeline
├── .vscode/
│   └── mcp.json             MCP server configuration
└── astro.config.mjs
```

---

## Running Tests

```bash
npm test                   # Single run
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
```

Tests cover the MCP utility functions (`mcp/utils.mjs`) and plan serialization helpers.

---

## Deployment

Build the production output:

```bash
npm run build
# Output written to dist/
```

The `@astrojs/node` adapter is required for the inline editing API route. Deploy to any Node.js-compatible platform: **Vercel**, **Railway**, **Fly.io**, or **Render**.

For a fully static deployment (no inline editing), remove the adapter, set `output: 'static'` in `astro.config.mjs`, and deploy to GitHub Pages or Netlify.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, commit conventions, and PR process.

---

## Code of Conduct

This project follows the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md). All contributors are expected to uphold these standards.

---

## License

[MIT](LICENSE)
