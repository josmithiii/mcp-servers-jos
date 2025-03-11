import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://ccrma.stanford.edu/~jos/juce_modules';
// const BASE_URL = 'https://docs.juce.com/develop';
// const BASE_URL = 'https://docs.juce.com/master';
const INDEX_URL = `${BASE_URL}/annotated.html`;
const CLASS_URL_PATTERN = `${BASE_URL}/class{className}.html`;

/**
 * Fetches the HTML content from a URL
 */
async function fetchHtml(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

/**
 * Fetches the list of all JUCE classes from the index page
 */
export async function fetchClassList(): Promise<string[]> {
  try {
    const html = await fetchHtml(INDEX_URL);
    const $ = cheerio.load(html);
    
    // Extract class names from the class list page
    const classes: string[] = [];
    
    // Look for links in the class list
    $('.directory tr.even, .directory tr.odd').each((_, element) => {
      const link = $(element).find('td.entry a');
      const href = link.attr('href');
      if (href && href.startsWith('class') && href.endsWith('.html')) {
        // Extract class name from href (e.g., "classValueTree.html" -> "ValueTree")
        const className = href.replace(/^class/, '').replace(/\.html$/, '');
        classes.push(className);
      }
    });
    
    return classes;
  } catch (error) {
    console.error('Error fetching class list:', error);
    throw error;
  }
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

/**
 * Fetches and parses documentation for a specific JUCE class
 */
export async function fetchClassDocumentation(className: string): Promise<ClassDocumentation | null> {
  try {
    const url = CLASS_URL_PATTERN.replace('{className}', className);
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    // Extract class description
    const description = $('.contents .textblock').first().text().trim();
    
    // Extract methods
    const methods: MethodDocumentation[] = [];
    $('.memitem').each((_, element) => {
      const nameElement = $(element).find('.memname');
      if (nameElement.length) {
        const name = nameElement.text().trim().split('(')[0].trim();
        const signature = nameElement.parent().text().trim();
        const description = $(element).find('.memdoc').text().trim();
        
        methods.push({
          name,
          signature,
          description
        });
      }
    });
    
    // Extract properties (this is simplified and might need adjustment)
    const properties: PropertyDocumentation[] = [];
    $('.fieldtable tr').each((_, element) => {
      const nameElement = $(element).find('.fieldname');
      if (nameElement.length) {
        const name = nameElement.text().trim();
        const type = $(element).find('.fieldtype').text().trim();
        const description = $(element).find('.fielddoc').text().trim();
        
        properties.push({
          name,
          type,
          description
        });
      }
    });
    
    // Extract inheritance information
    let inheritance: string | undefined;
    $('.inheritance').each((_, element) => {
      inheritance = $(element).text().trim();
    });
    
    return {
      className,
      description,
      methods,
      properties,
      inheritance,
      url
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
    
    return allClasses.filter(className => 
      className.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Error searching classes:', error);
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
  markdown += `[View Online Documentation](${doc.url})\n\n`;
  
  if (doc.methods.length > 0) {
    markdown += `## Methods\n\n`;
    doc.methods.forEach(method => {
      markdown += `### ${method.name}\n\n`;
      markdown += `\`\`\`cpp\n${method.signature}\n\`\`\`\n\n`;
      markdown += `${method.description}\n\n`;
    });
  }
  
  if (doc.properties.length > 0) {
    markdown += `## Properties\n\n`;
    doc.properties.forEach(prop => {
      markdown += `### ${prop.name}\n\n`;
      markdown += `**Type:** ${prop.type}\n\n`;
      markdown += `${prop.description}\n\n`;
    });
  }
  
  return markdown;
} 
