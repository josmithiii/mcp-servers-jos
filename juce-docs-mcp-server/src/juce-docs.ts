import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MASTER_BASE_URL = "https://docs.juce.com/master";
const DEVELOP_BASE_URL = "https://docs.juce.com/develop";
const DEFAULT_CONFIG_PATH = path.join(os.homedir(), ".juce-docs-mcp-server", "config.json");
const DEFAULT_LOCAL_DOCS_SUBPATH = path.join("docs", "doxygen", "doc");

type ConfigOrigin = "default" | "file" | "env";
export type DocsSourceType = "master" | "develop" | "custom-url" | "local-path";

interface PersistedDocsConfig {
  source?: DocsSourceType;
  customUrl?: string;
  localDocsPath?: string;
}

export interface DocsSourceConfig {
  source: DocsSourceType;
  baseUrl?: string;
  localDocsPath?: string;
  configPath: string;
  resolvedFrom: ConfigOrigin;
}

export interface SetDocsSourceInput {
  source: DocsSourceType;
  url?: string;
  localDocsPath?: string;
}

export interface LocalDocsSetupResult {
  docsPath: string;
  generatedDocs: boolean;
  config: DocsSourceConfig;
}

/**
 * Represents the structure of JUCE class documentation
 */
export interface ClassDocumentation {
  className: string;
  description: string;
  methods: MethodDocumentation[];
  properties: PropertyDocumentation[];
  inheritance?: string;
  url: string;
}

export interface MethodDocumentation {
  name: string;
  signature: string;
  description: string;
}

export interface PropertyDocumentation {
  name: string;
  type: string;
  description: string;
}

let activeConfig: DocsSourceConfig | null = null;
let classListCache: { key: string; classes: string[] } | null = null;

function getConfigPath(): string {
  const overridePath = process.env.JUCE_DOCS_CONFIG_PATH?.trim();
  return overridePath ? path.resolve(overridePath) : DEFAULT_CONFIG_PATH;
}

function normalizeUrl(inputUrl: string): string {
  return inputUrl.trim().replace(/\/+$/, "");
}

function normalizeClassLookupName(className: string): string {
  return className.trim().replace(/::/g, "_1_1");
}

function getClassLeafName(classIdentifier: string): string {
  const segments = classIdentifier.split("_1_1");
  return segments[segments.length - 1];
}

function docsSourceCacheKey(config: DocsSourceConfig): string {
  if (config.source === "local-path") {
    return `local:${config.localDocsPath}`;
  }
  return `remote:${config.baseUrl}`;
}

function clearCaches(): void {
  classListCache = null;
}

async function pathExists(testPath: string): Promise<boolean> {
  try {
    await access(testPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function parseEnvConfig(configPath: string): DocsSourceConfig | null {
  const sourceFromEnv = process.env.JUCE_DOCS_SOURCE?.trim().toLowerCase();
  const baseUrlFromEnv = process.env.JUCE_DOCS_BASE_URL?.trim();
  const localPathFromEnv = process.env.JUCE_DOCS_LOCAL_PATH?.trim();

  if (localPathFromEnv && localPathFromEnv.length > 0) {
    return {
      source: "local-path",
      localDocsPath: path.resolve(localPathFromEnv),
      configPath,
      resolvedFrom: "env"
    };
  }

  if (sourceFromEnv === "master") {
    return {
      source: "master",
      baseUrl: MASTER_BASE_URL,
      configPath,
      resolvedFrom: "env"
    };
  }

  if (sourceFromEnv === "develop") {
    return {
      source: "develop",
      baseUrl: DEVELOP_BASE_URL,
      configPath,
      resolvedFrom: "env"
    };
  }

  if (sourceFromEnv === "custom-url" || (baseUrlFromEnv && baseUrlFromEnv.length > 0)) {
    if (!baseUrlFromEnv || baseUrlFromEnv.length === 0) {
      console.error("JUCE_DOCS_SOURCE=custom-url set without JUCE_DOCS_BASE_URL; ignoring env override.");
      return null;
    }
    return {
      source: "custom-url",
      baseUrl: normalizeUrl(baseUrlFromEnv),
      configPath,
      resolvedFrom: "env"
    };
  }

  if (sourceFromEnv === "local-path") {
    console.error("JUCE_DOCS_SOURCE=local-path set without JUCE_DOCS_LOCAL_PATH; ignoring env override.");
    return null;
  }

  if (sourceFromEnv && !["master", "develop", "custom-url", "local-path"].includes(sourceFromEnv)) {
    console.error(`Unknown JUCE_DOCS_SOURCE value '${sourceFromEnv}'; ignoring env override.`);
  }

  return null;
}

function resolvePersistedConfig(configPath: string, persisted: PersistedDocsConfig | null): DocsSourceConfig {
  const source = persisted?.source ?? "master";

  if (source === "develop") {
    return {
      source: "develop",
      baseUrl: DEVELOP_BASE_URL,
      configPath,
      resolvedFrom: persisted ? "file" : "default"
    };
  }

  if (source === "custom-url") {
    if (!persisted?.customUrl) {
      return {
        source: "master",
        baseUrl: MASTER_BASE_URL,
        configPath,
        resolvedFrom: "default"
      };
    }
    return {
      source: "custom-url",
      baseUrl: normalizeUrl(persisted.customUrl),
      configPath,
      resolvedFrom: "file"
    };
  }

  if (source === "local-path") {
    if (!persisted?.localDocsPath) {
      return {
        source: "master",
        baseUrl: MASTER_BASE_URL,
        configPath,
        resolvedFrom: "default"
      };
    }
    return {
      source: "local-path",
      localDocsPath: path.resolve(persisted.localDocsPath),
      configPath,
      resolvedFrom: "file"
    };
  }

  return {
    source: "master",
    baseUrl: MASTER_BASE_URL,
    configPath,
    resolvedFrom: persisted ? "file" : "default"
  };
}

async function loadPersistedConfig(configPath: string): Promise<PersistedDocsConfig | null> {
  if (!(await pathExists(configPath))) {
    return null;
  }

  try {
    const raw = await readFile(configPath, "utf-8");
    return JSON.parse(raw) as PersistedDocsConfig;
  } catch (error) {
    console.error(`Failed to parse config file '${configPath}', falling back to defaults:`, error);
    return null;
  }
}

async function savePersistedConfig(configPath: string, persisted: PersistedDocsConfig): Promise<void> {
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(persisted, null, 2)}\n`, "utf-8");
}

async function ensureLocalDocsPathLooksValid(localDocsPath: string): Promise<void> {
  const annotatedPath = path.join(localDocsPath, "annotated.html");
  if (!(await pathExists(annotatedPath))) {
    throw new Error(
      `Local docs path does not look valid: '${localDocsPath}' is missing annotated.html. ` +
      "Generate docs first or provide a docs directory that contains annotated.html and class*.html."
    );
  }
}

export function getDocsConfigPath(): string {
  return getConfigPath();
}

export async function getDocsSourceConfig(): Promise<DocsSourceConfig> {
  if (activeConfig) {
    return activeConfig;
  }

  const configPath = getConfigPath();
  const envConfig = parseEnvConfig(configPath);
  if (envConfig) {
    activeConfig = envConfig;
    return envConfig;
  }

  const persistedConfig = await loadPersistedConfig(configPath);
  activeConfig = resolvePersistedConfig(configPath, persistedConfig);
  return activeConfig;
}

export async function setDocsSourceConfig(input: SetDocsSourceInput): Promise<DocsSourceConfig> {
  const configPath = getConfigPath();
  let persisted: PersistedDocsConfig;

  if (input.source === "master") {
    persisted = { source: "master" };
  } else if (input.source === "develop") {
    persisted = { source: "develop" };
  } else if (input.source === "custom-url") {
    if (!input.url) {
      throw new Error("A URL is required when source='custom-url'.");
    }
    persisted = { source: "custom-url", customUrl: normalizeUrl(input.url) };
  } else {
    if (!input.localDocsPath) {
      throw new Error("A local docs path is required when source='local-path'.");
    }
    const resolvedLocalPath = path.resolve(input.localDocsPath);
    await ensureLocalDocsPathLooksValid(resolvedLocalPath);
    persisted = { source: "local-path", localDocsPath: resolvedLocalPath };
  }

  await savePersistedConfig(configPath, persisted);
  activeConfig = resolvePersistedConfig(configPath, persisted);
  clearCaches();
  return activeConfig;
}

interface RunCommandResult {
  code: number;
  combinedOutput: string;
}

async function runCommand(command: string, args: string[], cwd: string): Promise<RunCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false });
    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, combinedOutput: output.slice(-12000) });
    });
  });
}

async function runLocalDocsBuild(doxygenDir: string): Promise<void> {
  const pythonOptions =
    process.platform === "win32"
      ? [
          { command: "py", args: ["-3", "build.py"] },
          { command: "python", args: ["build.py"] }
        ]
      : [
          { command: "python3", args: ["build.py"] },
          { command: "python", args: ["build.py"] }
        ];

  let lastError: unknown = null;
  for (const option of pythonOptions) {
    try {
      const result = await runCommand(option.command, option.args, doxygenDir);
      if (result.code === 0) {
        return;
      }
      throw new Error(
        `Command '${option.command} ${option.args.join(" ")}' exited with code ${result.code}.\n${result.combinedOutput}`
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Unable to generate local JUCE docs via build.py.\n${String(lastError)}`);
}

function resolveDocsPathFromJucePath(jucePath: string): string {
  const resolvedInput = path.resolve(jucePath);
  return path.join(resolvedInput, DEFAULT_LOCAL_DOCS_SUBPATH);
}

export async function setupLocalDocsFromJucePath(
  jucePath: string,
  generateIfMissing = false
): Promise<LocalDocsSetupResult> {
  const resolvedInput = path.resolve(jucePath);
  const directDocsPath = resolvedInput;
  const derivedDocsPath = resolveDocsPathFromJucePath(resolvedInput);

  let docsPathToUse: string | null = null;
  if (await pathExists(path.join(directDocsPath, "annotated.html"))) {
    docsPathToUse = directDocsPath;
  } else if (await pathExists(path.join(derivedDocsPath, "annotated.html"))) {
    docsPathToUse = derivedDocsPath;
  }

  let generatedDocs = false;
  if (!docsPathToUse && generateIfMissing) {
    const doxygenDir = path.join(resolvedInput, "docs", "doxygen");
    if (!(await pathExists(doxygenDir))) {
      throw new Error(
        `Could not find '${doxygenDir}'. Provide either a JUCE repo root path or an existing docs directory.`
      );
    }

    await runLocalDocsBuild(doxygenDir);
    generatedDocs = true;

    if (await pathExists(path.join(derivedDocsPath, "annotated.html"))) {
      docsPathToUse = derivedDocsPath;
    }
  }

  if (!docsPathToUse) {
    throw new Error(
      "Could not locate local JUCE docs. Expected either:\n" +
      `- ${path.join(directDocsPath, "annotated.html")}\n` +
      `- ${path.join(derivedDocsPath, "annotated.html")}\n` +
      "Set generateIfMissing=true to generate docs from a JUCE repo checkout."
    );
  }

  const config = await setDocsSourceConfig({
    source: "local-path",
    localDocsPath: docsPathToUse
  });

  return { docsPath: docsPathToUse, generatedDocs, config };
}

interface HtmlFetchResult {
  html: string | null;
  resolvedLocation: string;
}

async function fetchHtml(relativePath: string, allowNotFound = false): Promise<HtmlFetchResult> {
  const config = await getDocsSourceConfig();
  const cleanRelativePath = relativePath.replace(/^\/+/, "");

  if (config.source === "local-path") {
    const localDocsPath = config.localDocsPath;
    if (!localDocsPath) {
      throw new Error("Local docs source is configured but localDocsPath is missing.");
    }

    const filePath = path.join(localDocsPath, cleanRelativePath);
    if (!(await pathExists(filePath))) {
      if (allowNotFound) {
        return { html: null, resolvedLocation: pathToFileURL(filePath).href };
      }
      throw new Error(`Local docs file not found: ${filePath}`);
    }

    const html = await readFile(filePath, "utf-8");
    return { html, resolvedLocation: pathToFileURL(filePath).href };
  }

  const baseUrl = config.baseUrl;
  if (!baseUrl) {
    throw new Error("Remote docs source is configured but baseUrl is missing.");
  }

  const fullUrl = `${baseUrl}/${cleanRelativePath}`;
  const response = await fetch(fullUrl);
  if (!response.ok) {
    if (allowNotFound && response.status === 404) {
      return { html: null, resolvedLocation: fullUrl };
    }
    throw new Error(`Failed to fetch ${fullUrl}: ${response.status} ${response.statusText}`);
  }

  return {
    html: await response.text(),
    resolvedLocation: response.url || fullUrl
  };
}

/**
 * Fetches the list of all JUCE classes from the index page
 */
export async function fetchClassList(): Promise<string[]> {
  try {
    const config = await getDocsSourceConfig();
    const cacheKey = docsSourceCacheKey(config);

    if (classListCache && classListCache.key === cacheKey) {
      return classListCache.classes;
    }

    const { html } = await fetchHtml("annotated.html");
    if (!html) {
      throw new Error("Failed to load annotated.html");
    }

    const $ = cheerio.load(html);

    // Extract class names from the class list page
    const classes: string[] = [];

    // Look for links in the class list
    $(".directory tr.even, .directory tr.odd").each((_, element) => {
      const link = $(element).find("td.entry a");
      const href = link.attr("href");
      if (href && href.startsWith("class") && href.endsWith(".html")) {
        // Extract class name from href (e.g., "classValueTree.html" -> "ValueTree")
        const className = href.replace(/^class/, "").replace(/\.html$/, "");
        classes.push(className);
      }
    });

    classListCache = { key: cacheKey, classes };
    return classes;
  } catch (error) {
    console.error("Error fetching class list:", error);
    throw error;
  }
}

async function resolveClassIdentifier(className: string): Promise<string> {
  const allClasses = await fetchClassList();
  const normalizedLookup = normalizeClassLookupName(className);
  const normalizedLookupLower = normalizedLookup.toLowerCase();

  const exactMatch = allClasses.find((item) => item.toLowerCase() === normalizedLookupLower);
  if (exactMatch) {
    return exactMatch;
  }

  const lookupLeaf = getClassLeafName(normalizedLookup).toLowerCase();
  const leafMatch = allClasses.find((item) => getClassLeafName(item).toLowerCase() === lookupLeaf);
  if (leafMatch) {
    return leafMatch;
  }

  return normalizedLookup;
}

/**
 * Fetches and parses documentation for a specific JUCE class
 */
export async function fetchClassDocumentation(className: string): Promise<ClassDocumentation | null> {
  try {
    const normalizedLookup = normalizeClassLookupName(className);
    const resolvedClassId = await resolveClassIdentifier(normalizedLookup);
    const classCandidates = [normalizedLookup];
    if (!classCandidates.includes(resolvedClassId)) {
      classCandidates.push(resolvedClassId);
    }

    let classHtml: string | null = null;
    let classDocUrl = "";
    for (const candidate of classCandidates) {
      const result = await fetchHtml(`class${candidate}.html`, true);
      if (result.html) {
        classHtml = result.html;
        classDocUrl = result.resolvedLocation;
        break;
      }
    }

    if (!classHtml) {
      return null;
    }

    const $ = cheerio.load(classHtml);

    // Extract class description
    const description = $(".contents .textblock").first().text().trim();

    // Extract methods
    const methods: MethodDocumentation[] = [];
    $(".memitem").each((_, element) => {
      const nameElement = $(element).find(".memname");
      if (nameElement.length) {
        const name = nameElement.text().trim().split("(")[0].trim();
        const signature = nameElement.parent().text().trim();
        const methodDescription = $(element).find(".memdoc").text().trim();

        methods.push({
          name,
          signature,
          description: methodDescription
        });
      }
    });

    // Extract properties (this is simplified and might need adjustment)
    const properties: PropertyDocumentation[] = [];
    $(".fieldtable tr").each((_, element) => {
      const nameElement = $(element).find(".fieldname");
      if (nameElement.length) {
        const name = nameElement.text().trim();
        const type = $(element).find(".fieldtype").text().trim();
        const propertyDescription = $(element).find(".fielddoc").text().trim();

        properties.push({
          name,
          type,
          description: propertyDescription
        });
      }
    });

    // Extract inheritance information
    let inheritance: string | undefined;
    $(".inheritance").each((_, element) => {
      inheritance = $(element).text().trim();
    });

    return {
      className: resolvedClassId,
      description,
      methods,
      properties,
      inheritance,
      url: classDocUrl
    };
  } catch (error) {
    console.error(`Error fetching documentation for ${className}:`, error);
    return null;
  }
}

/**
 * Searches for classes matching a query string
 */
export async function searchClasses(query: string): Promise<string[]> {
  try {
    const allClasses = await fetchClassList();
    const lowerQuery = query.toLowerCase();

    return allClasses.filter((className) => className.toLowerCase().includes(lowerQuery));
  } catch (error) {
    console.error("Error searching classes:", error);
    throw error;
  }
}

/**
 * Formats class documentation as markdown
 */
export function formatClassDocumentation(doc: ClassDocumentation): string {
  let markdown = `# ${doc.className}\n\n`;

  if (doc.inheritance) {
    markdown += `**Inheritance:** ${doc.inheritance}\n\n`;
  }

  markdown += `${doc.description}\n\n`;
  markdown += `[View Documentation Source](${doc.url})\n\n`;

  if (doc.methods.length > 0) {
    markdown += "## Methods\n\n";
    doc.methods.forEach((method) => {
      markdown += `### ${method.name}\n\n`;
      markdown += `\`\`\`cpp\n${method.signature}\n\`\`\`\n\n`;
      markdown += `${method.description}\n\n`;
    });
  }

  if (doc.properties.length > 0) {
    markdown += "## Properties\n\n";
    doc.properties.forEach((prop) => {
      markdown += `### ${prop.name}\n\n`;
      markdown += `**Type:** ${prop.type}\n\n`;
      markdown += `${prop.description}\n\n`;
    });
  }

  return markdown;
}

