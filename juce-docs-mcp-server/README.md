# JUCE Documentation MCP Server

An MCP (Model Context Protocol) server that provides access to JUCE Framework C++ class documentation.

## Features

- Fetch documentation for specific JUCE classes
- List all available JUCE classes
- Search for classes by name
- Format documentation as markdown
- Expose documentation through MCP resources and tools
- Default docs source: `https://docs.juce.com/master`
- Switch docs source at runtime (master/develop/custom URL/local path)
- Optional local docs setup from a JUCE checkout path

## Installation

```bash
# Clone the repository
git clone https://github.com/josmithiii/mcp-servers-jos.git
cd mcp-servers-jos/juce-docs-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Quick Start (Simple Setup)

If you want the easiest setup, follow these steps exactly.

1. Build once:

```bash
cd /path/to/mcp-servers-jos/juce-docs-mcp-server
npm install
npm run build
```

2. Add this MCP server to your client:

```bash
# Codex
codex mcp add juce-docs -- node "$(pwd)/dist/index.js"

# Claude Code
claude mcp add --scope user juce-docs -- node "$(pwd)/dist/index.js"
```

3. Check current docs source (default is JUCE `master`):

- Run tool `get-juce-docs-config` with args:

```json
{}
```

4. If you want JUCE develop docs instead of master:

- Run tool `set-juce-docs-source` with args:

```json
{
  "source": "develop"
}
```

5. If you want local docs from your JUCE checkout (faster, no docs network fetches):

- Run tool `setup-local-juce-docs` with args:

```json
{
  "jucePath": "~/Code/JUCE",
  "generateIfMissing": true
}
```

`generateIfMissing` is only needed if local docs are not generated yet.

6. Switch back to hosted stable docs anytime:

- Run tool `set-juce-docs-source` with args:

```json
{
  "source": "master"
}
```

Notes:

- You only need `npm run build` again after pulling/changing this server code.
- Your docs source choice is saved and reused on next startup.
- Local docs follow whatever branch/tag your local JUCE checkout is on. If you checkout a beta/develop branch in `~/Code/JUCE`, then regenerate docs, this MCP server will use those docs.

### Single-Command Terminal Setup (Set Source While Adding MCP)

If you want to configure docs source in one terminal command (without calling MCP tools in chat),
set environment variables when adding the server.

Goal: add the MCP server and choose docs source up front.

- Use `master` for stable hosted JUCE docs.
- Use `local-path` for local JUCE docs (faster, no docs network fetches, follows your local JUCE branch after docs regeneration).

Claude CLI note: put `juce-docs` before `-e` flags.

- Correct pattern: `claude mcp add --scope user juce-docs -e KEY=value -- node "$(pwd)/dist/index.js"`

`set-juce-docs-source` options are:

- `source=master`
- `source=develop`
- `source=custom-url` with `url`
- `source=local-path` with `localDocsPath`

Equivalent one-line terminal commands:

```bash
# Codex: stable JUCE docs (master)
codex mcp add juce-docs --env JUCE_DOCS_SOURCE=master -- node "$(pwd)/dist/index.js"

# Codex: develop docs
codex mcp add juce-docs --env JUCE_DOCS_SOURCE=develop -- node "$(pwd)/dist/index.js"

# Codex: custom docs URL
codex mcp add juce-docs \
  --env JUCE_DOCS_SOURCE=custom-url \
  --env JUCE_DOCS_BASE_URL=https://docs.juce.com/develop \
  -- node "$(pwd)/dist/index.js"

# Codex: local docs path (no docs network fetches)
codex mcp add juce-docs \
  --env JUCE_DOCS_SOURCE=local-path \
  --env JUCE_DOCS_LOCAL_PATH="$HOME/Code/JUCE/docs/doxygen/doc" \
  -- node "$(pwd)/dist/index.js"
```

```bash
# Claude Code: stable JUCE docs (master)
claude mcp add --scope user juce-docs -e JUCE_DOCS_SOURCE=master -- node "$(pwd)/dist/index.js"

# Claude Code: develop docs
claude mcp add --scope user juce-docs -e JUCE_DOCS_SOURCE=develop -- node "$(pwd)/dist/index.js"

# Claude Code: custom docs URL
claude mcp add --scope user juce-docs \
  -e JUCE_DOCS_SOURCE=custom-url \
  -e JUCE_DOCS_BASE_URL=https://docs.juce.com/develop \
  -- node "$(pwd)/dist/index.js"

# Claude Code: local docs path
claude mcp add --scope user juce-docs \
  -e JUCE_DOCS_SOURCE=local-path \
  -e JUCE_DOCS_LOCAL_PATH="$HOME/Code/JUCE/docs/doxygen/doc" \
  -- node "$(pwd)/dist/index.js"
```

Most common copy/paste options:

For local JUCE docs (from your local JUCE checkout, e.g. master branch):

```bash
# Codex
codex mcp add juce-docs \
  --env JUCE_DOCS_SOURCE=local-path \
  --env JUCE_DOCS_LOCAL_PATH="$HOME/Code/JUCE/docs/doxygen/doc" \
  -- node "$(pwd)/dist/index.js"

# Claude
claude mcp add --scope user juce-docs \
  -e JUCE_DOCS_SOURCE=local-path \
  -e JUCE_DOCS_LOCAL_PATH="$HOME/Code/JUCE/docs/doxygen/doc" \
  -- node "$(pwd)/dist/index.js"
```

If you want hosted master docs instead:

```bash
# Codex
codex mcp add juce-docs --env JUCE_DOCS_SOURCE=master -- node "$(pwd)/dist/index.js"

# Claude
claude mcp add --scope user juce-docs -e JUCE_DOCS_SOURCE=master -- node "$(pwd)/dist/index.js"
```

If `juce-docs` is already added, remove then re-add:

```bash
codex mcp remove juce-docs
claude mcp remove --scope user juce-docs
```

### Add to MCP Clients (Auto-Start, Recommended)

When configured as a `stdio` MCP server, Codex/Claude/Cursor start this server
automatically when needed. You do not need to run `npm start` manually.

```bash
# from juce-docs-mcp-server directory
codex mcp add juce-docs -- node "$(pwd)/dist/index.js"
claude mcp add --scope user juce-docs -- node "$(pwd)/dist/index.js"
```

Build/install cadence:

- Run `npm install` once per clone (or when dependencies change)
- Run `npm run build` after pulling/changing TypeScript source

### Running the Server Manually (Optional)

```bash
npm start
```

This starts the MCP server using `stdio`. Manual start is mainly useful for local
debugging or direct testing.

### Adding the MCP service to Cursor (tested 2025-03-11)

1. Open Cursor / Settings / Cursor Settings
2. Select MCP
3. Set the `Name` to JUCE Docs (or whatever), and set the `Type` to `Command`
4. Set the `Command` to `node /path/to/juce-docs-mcp-server/dist/index.js`,
   replacing `/path/to/juce-docs-mcp-server` with the actual path into your clone
5. Restart Cursor to apply the changes (it will internally run `node .../dist/index.js`)

Cursor will start the configured command automatically; no separate `npm start`
process is required.

### Adding the MCP service to Visual Studio (Tested 2026-01-13)

Visual Studio 2022/2026 with GitHub Copilot extension supports MCP through a built-in configuration.

1. **Access Settings**: In the Copilot Chat window, click the **Wrench** icon, then click the **"+" (Add Source)** to manage MCP servers.
2. **Configuration**: Visual Studio uses a specific JSON structure. When prompted to edit `.mcp.json`, use the following template (ensure forward slashes `/` are used for paths):

```json
{
  "inputs": [],
  "servers": {
    "juce-expert": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:/path/to/juce-docs-mcp-server/dist/index.js"
      ],
      "env": {
        "NODE_PATH": "C:/path/to/juce-docs-mcp-server/node_modules"
      }
    }
  }
}

```

3. **Important Note on "Description"**:
Unlike some other MCP clients, **Visual Studio requires a non-empty `description` field for every tool**. If a tool's description is missing, Visual Studio will fail to load it with a `System.ArgumentException`. Ensure your `index.ts` definitions include description strings.
4. **Troubleshooting**: If tools are not appearing, try reloading the Copilot Chat window or clearing the Copilot cache folder located in your solution's `.vs` directory.

### Available Resources

- `juce://class/{className}` - Get documentation for a specific JUCE class
- `juce://classes` - List all available JUCE classes

### Available Tools

- `search-juce-classes` - Search for JUCE classes by name
- `get-juce-class-docs` - Get documentation for a specific JUCE class
- `get-juce-docs-config` - Show current docs source and how to switch it
- `set-juce-docs-source` - Switch docs source (master/develop/custom/local)
- `setup-local-juce-docs` - Point to a local JUCE checkout and optionally generate docs

### Available Prompts

- `explore-juce` - Interactive exploration of JUCE framework components
  - Use without arguments for an overview of main components
  - Add a topic to explore specific functionality (e.g., `explore-juce audio`)

### Resources and Tools

In addition to prompts that direct your LLM (such as in Cursor) to use
the MCP internally, you can also query it directly via "resource" and
"tool" names:

1. **Resources** look like URLs that directly fetch specific content. They
   follow a URI-like pattern with the format `protocol://path`. These
   are defined in the server as direct resource endpoints.  Example:
   `juce://classes`

2. **Tools** are MCP function calls by name (for example:
   `search-juce-classes`, `set-juce-docs-source`) plus arguments.
   Depending on the MCP client UI, these may also appear as slash-style
   commands.

In summary, when connected to an MCP client (such as via Cursor chat),
you can access "resources" in the format `protocol://path` and "tools"
by tool name plus arguments (with some clients also supporting slash-style syntax).

## Examples

1. List all available classes: `juce://classes`
2. Get documentation for a specific class: `juce://class/ValueTree`
3. Search for all Audio classes: `search-juce-classes` with `{ "query": "Audio" }`
4. Get docs for a class: `get-juce-class-docs` with `{ "className": "AudioProcessor" }`

## Docs Source Configuration

This server defaults to official JUCE **master** docs:

```text
https://docs.juce.com/master
```

You can switch sources without editing code by calling MCP tools:

1. `get-juce-docs-config` to inspect current config
2. `set-juce-docs-source` with one of:
   - `source=master`
   - `source=develop`
   - `source=custom-url` + `url=https://...`
   - `source=local-path` + `localDocsPath=/path/to/docs`
3. `setup-local-juce-docs` with:
   - `jucePath=/path/to/JUCE`
   - `generateIfMissing=true` (optional)

Configuration is persisted in:

```text
~/.juce-docs-mcp-server/config.json
```

You can override config via environment variables:

- `JUCE_DOCS_SOURCE=master|develop|custom-url|local-path`
- `JUCE_DOCS_BASE_URL=https://...` (for `custom-url`)
- `JUCE_DOCS_LOCAL_PATH=/path/to/docs` (for `local-path`)
- `JUCE_DOCS_CONFIG_PATH=/custom/path/config.json` (optional config location)

## Tips for Effective JUCE Development

When working on a JUCE project, here's how to get the most out of the JUCE Documentation MCP Server:

### Quick Reference Workflows

1. **Exploring Components**
   - Start with `/search-juce-classes` followed by a general category (Audio, GUI, etc.)
   - Use `explore-juce audio` (or other domain) to get an overview of related classes

2. **Implementation Help**
   - When implementing a specific feature, use `juce://class/ClassName` to get detailed documentation
   - Look for code examples in the class documentation

3. **Method Reference**
   - The class documentation includes all methods with signatures and descriptions
   - Use this when you need to understand parameter types or return values

### Integration with Your Development Process

1. **Keep Cursor Open Alongside Your IDE**
   - Have Cursor with the MCP server running in a separate window
   - This gives you instant access to documentation without leaving your code editor

2. **Use During Planning Phases**
   - Before implementing a feature, explore available classes with `/search-juce-classes`
   - This helps you understand the JUCE approach before writing code

3. **Debugging Assistance**
   - When encountering unexpected behavior, check the class documentation
   - Look for notes about edge cases or implementation details

### Specific JUCE Development Tips

1. **Audio Processing**
   - Start with `AudioProcessor` for plugin development
   - Use `AudioSource` for playback applications
   - Check `dsp::` namespace classes for efficient signal processing

2. **GUI Development**
   - Base all custom components on the `Component` class
   - Use `AudioAppComponent` to combine audio and GUI functionality
   - Look at `LookAndFeel` for styling

3. **Plugin Development**
   - Reference `AudioProcessor` and `AudioProcessorEditor` for the core plugin architecture
   - Check `AudioProcessorValueTreeState` for parameter management

## Implementation Details

The server processes JUCE Doxygen HTML in real-time from either:

- Official hosted docs (`master`, `develop`, or custom URL)
- A local docs directory (no network required)

It extracts:

1. Class list is fetched from the annotated class list page
2. Individual class documentation is parsed from class-specific pages
3. Documentation is formatted as markdown for consistent display
4. Class list results are cached in memory during server runtime

## Error Handling

Common issues and solutions:

1. **Class Not Found**: If a class name is invalid or not found, the server will return a clear error message
2. **Connection Issues**: If the JUCE documentation site is unreachable, check your internet connection
3. **Server Start Failure**: Ensure the correct Node.js version is installed and the build step completed successfully
4. **Cursor Integration**: If the server isn't working in Cursor, verify the command path in MCP settings is correct

## Development

```bash
# Run in development mode with auto-recompilation
npm run dev
```

[Developer Notes](./README-DEV.md)

## License

MIT
