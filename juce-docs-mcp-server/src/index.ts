import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  fetchClassDocumentation,
  fetchClassList,
  searchClasses,
  formatClassDocumentation
} from "./juce-docs.js";

// Create an MCP server
const server = new McpServer({
  name: "JUCE Documentation Server",
  version: "1.0.0"
});

// Resource for getting documentation for a specific class
server.resource(
  "class-docs",
  new ResourceTemplate("juce://class/{className}", { list: undefined }),
  async (uri, { className }) => {
    console.log(`Fetching documentation for class: ${className}`);
    
    // Ensure className is a string
    const classNameStr = Array.isArray(className) ? className[0] : className;
    const doc = await fetchClassDocumentation(classNameStr);
    
    if (!doc) {
      return {
        contents: [{
          uri: uri.href,
          text: `Documentation for class '${classNameStr}' not found.`
        }]
      };
    }
    
    const markdown = formatClassDocumentation(doc);
    
    return {
      contents: [{
        uri: uri.href,
        text: markdown
      }]
    };
  }
);

// Resource for listing all available classes
server.resource(
  "class-list",
  "juce://classes",
  async (uri) => {
    console.log("Fetching list of all JUCE classes");
    
    const classes = await fetchClassList();
    
    return {
      contents: [{
        uri: uri.href,
        text: `# JUCE Classes\n\n${classes.map(c => `- [${c}](juce://class/${c})`).join('\n')}`
      }]
    };
  }
);

// Tool for searching classes
server.tool(
  "search-classes",
  { query: z.string() },
  async ({ query }) => {
    console.log(`Searching for classes matching: ${query}`);
    
    const results = await searchClasses(query);
    
    if (results.length === 0) {
      return {
        content: [{ 
          type: "text", 
          text: `No classes found matching '${query}'.` 
        }]
      };
    }
    
    const markdown = `# Search Results for '${query}'\n\n${results.map(c => `- [${c}](juce://class/${c})`).join('\n')}`;
    
    return {
      content: [{ type: "text", text: markdown }]
    };
  }
);

// Tool for getting class documentation
server.tool(
  "get-class-docs",
  { className: z.string() },
  async ({ className }) => {
    console.log(`Fetching documentation for class: ${className}`);
    
    const doc = await fetchClassDocumentation(className);
    
    if (!doc) {
      return {
        content: [{ 
          type: "text", 
          text: `Documentation for class '${className}' not found.` 
        }]
      };
    }
    
    const markdown = formatClassDocumentation(doc);
    
    return {
      content: [{ type: "text", text: markdown }]
    };
  }
);

// Prompt for exploring JUCE documentation
server.prompt(
  "explore-juce",
  { topic: z.string().optional() },
  ({ topic }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: topic 
          ? `Please help me understand the JUCE ${topic} functionality. What classes should I look at?` 
          : "Please help me explore the JUCE framework. What are the main components and classes I should know about?"
      }
    }]
  })
);

// Start the server
async function main() {
  try {
    console.log("Starting JUCE Documentation MCP Server...");
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.log("Server connected and ready to receive requests.");
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main(); 