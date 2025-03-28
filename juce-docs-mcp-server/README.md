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

### Adding the MCP service to Cursor (tested 2025-03-11)

1. Open Cursor / Settings / Cursor Settings
2. Select MCP
3. Set the `Name` to JUCE Docs (or whatever), and set the `Type` to `Command`
3. Set the `Command` to `node /path/to/juce-docs-mcp-server/dist/index.js`,
   replacing `/path/to/juce-docs-mcp-server` with the actual path into your clone
5. Restart Cursor to apply the changes (it will internally run `node .../dist/index.js`)

Note that Cursor sends MCP requests to _your local server_ that you started with `npm start` above.

### Available Resources

- `juce://class/{className}` - Get documentation for a specific JUCE class
- `juce://classes` - List all available JUCE classes

### Available Tools

- `/search-juce-classes` - Search for JUCE classes by name
- `/get-juce-class-docs` - Get documentation for a specific JUCE class

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

2. **Tools** use names beginning with `/` and support a following
   argument, i.e., `/tool-name arg-string`, and provide interactive
   commands that perform an action. MCP tools start with `/` to
   distinguish them from resources. This is similar to how slash
   commands work in many applications such as `Claude Code` or
   `aider`.  Note that in an IDE chat, the `arg-string` can include
   spaces and is terminated by end-of-line (according to Claude 3.7).

In summary, when connected to an MCP client (such as via Cursor chat),
you can access "resources" in the format `protocol://path` and "tools"
in the format `/tool-name arg string`.

## Examples

1. List all available classes: `juce://classes`
2. Get documentation for a specific class: `juce://class/ValueTree`
3. Search for all Audio classes: `/search-juce-classes Audio`
4. Get documentation for specific classes: `/get-juce-class-docs AudioProcessor`

## Changing the JUCE Doc URL

In `juce-docs-mcp-server/src/juce-docs.ts`, edit the line
 ```
 const BASE_URL = 'https://ccrma.stanford.edu/~jos/juce_modules';
 ```
More up-to-date possibilities include 
 ```
 const BASE_URL = 'https://docs.juce.com/develop';
 const BASE_URL = 'https://docs.juce.com/master';
 ```

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

The server fetches documentation from the JUCE documentation hosted at Stanford CCRMA
(https://ccrma.stanford.edu/~jos/juce_modules/), but of course you can change that, as noted above.
It processes the HTML documentation in real-time:

1. Class list is fetched from the annotated class list page
2. Individual class documentation is parsed from class-specific pages
3. Documentation is formatted as markdown for consistent display
4. Results are cached in memory during server runtime

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
