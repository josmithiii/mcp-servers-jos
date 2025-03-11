# JUCE Documentation MCP Server

An MCP (Model Context Protocol) server that provides access to JUCE Framework C++ class documentation.

## Features

- Fetch documentation for specific JUCE classes
- List all available JUCE classes
- Search for classes by name
- Format documentation as markdown
- Expose documentation through MCP resources and tools

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

### Running the Server

```bash
npm start
```

This starts the MCP server using `stdio` as the transport mechanism, which allows it to be used with MCP clients like Claude Desktop App, Continue, or other MCP-compatible applications.

### Adding the MCP service to Cursor (as of 2025-03-11)

1. Open Cursor / Settings / Cursor Settings
2. Select MCP
3. Set `Name` to JUCE Docs (or whatever), and `Type` to `Command`
3. Set `Command` to `node /path/to/juce-docs-mcp-server/dist/index.js`
   Replace `/path/to/juce-docs-mcp-server` with the actual path to your cloned repository
5. Restart Cursor to apply the changes (it will internally run `node .../dist/index.js`)

### Available Resources

- `juce://class/{className}` - Get documentation for a specific JUCE class
- `juce://classes` - List all available JUCE classes

### Available Tools

- `search-classes` - Search for JUCE classes by name
- `get-class-docs` - Get documentation for a specific JUCE class

### Available Prompts

- `explore-juce` - Get help exploring JUCE framework components

### Resources and Tools

In addition to prompts that direct your LLM (such as in Cursor) to use
the MCP internally, you can also query it directly via "resource" and
"tool" names:

1. **Resources** look like URLs that directly fetch specific content. They
   follow a URI-like pattern with the format `protocol://path`. These
   are defined in the server as direct resource endpoints.  Example:
   `juce://classes`

2. **Tools** use names beginning with `/`, and provide interactive
   commands that perform an action. MCP tools conventionally start
   with / to distinguish them from resources. This is similar to how
   slash commands work in many applications such as `Claude Code` or
   `aider`.

## Examples

When connected to an MCP client (such as via Cursor chat), you can
access "resources" in the format `protocol://path` and "tools" in the
format `/tool-name`:

1. List all available classes: `juce://classes`
2. Get documentation for a specific class: `juce://class/ValueTree`
3. Search for all Audio classes: `/search-classes Audio`
4. Get documentation for specific classes: `juce://class/AudioProcessor`


## Development

```bash
# Run in development mode with auto-recompilation
npm run dev
```

## How It Works

The server fetches documentation from the JUCE documentation hosted at Stanford CCRMA:
https://ccrma.stanford.edu/~jos/juce_modules/index.html

It parses the HTML documentation and exposes it through the MCP protocol, making it easily accessible to LLM applications.

## Initial Claude Prompt in Cursor on 

I want to create an MCP server which provides an API for retrieving C++ class documentation for the JUCE Framework, using this URL for the lookups:
https://ccrma.stanford.edu/~jos/juce_modules/index.html
For example, documentation for the ValueTree class can be accessed as
https://ccrma.stanford.edu/~jos/juce_modules/classValueTree.html

## Claude's Wrap-Up Summary

Our MCP server for JUCE documentation is working correctly. Here's a summary of what we've built:

1. We've created an MCP server that provides access to JUCE Framework C++ class documentation.
2. The server exposes resources for retrieving documentation for specific classes and listing all available classes.
3. It provides tools for searching classes and getting class documentation.
4. We've included a prompt for exploring JUCE documentation.
5. We've created a test client to verify that the server works correctly.

The key components of the project are:

1. **juce-docs.ts**: Contains utility functions for fetching and parsing JUCE documentation from the Stanford CCRMA website.
2. **index.ts**: The main MCP server implementation that exposes resources, tools, and prompts.
3. **test-client.ts**: A test client that verifies the server functionality.

To use this MCP server with an MCP client like Claude Desktop App, Continue, or other MCP-compatible applications, you would:

1. Build the project: `npm run build`
2. Start the server: `npm start`
3. Connect to it from your MCP client

This MCP server makes it easy to access JUCE documentation directly
from your LLM applications, enhancing your development workflow when
working with the JUCE Framework.

## License

MIT
