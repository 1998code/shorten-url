import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Configure base URL of the running Next.js app.
// Default assumes dev server on http://localhost:3000
const BASE_URL = process.env.SHORTEN_URL_BASE || "https://shareby.vercel.app";

const shortenSchema = z.object({
  urls: z.string().min(1, "urls is required"),
  password: z.string().optional().default("")
});

const addDomainSchema = z.object({
  domain: z.string().min(1, "domain is required")
});

const checkDnsSchema = z.object({
  domain: z.string().min(1, "domain is required")
});

async function main() {
  const transport = new StdioServerTransport();
  const server = new Server({
    name: "shorten-url-mcp",
    version: "6.3.0",
  }, {
    capabilities: {
      tools: {}
    }
  });

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "shorten_url",
          description: "Shorten one or multiple URLs. Optionally include a password to protect.",
          inputSchema: {
            type: "object",
            properties: {
              urls: { type: "string", description: "One or many URLs separated by newline or comma" },
              password: { type: "string", description: "Optional password to lock link", default: "" }
            },
            required: ["urls"]
          }
        },
        {
          name: "get_count",
          description: "Get total number of stored short links (approx).",
          inputSchema: { type: "object", properties: {}, additionalProperties: false }
        },
        {
          name: "add_domain",
          description: "Add a domain to the Vercel project via API.",
          inputSchema: {
            type: "object",
            properties: {
              domain: { type: "string", description: "Domain to add (e.g. example.com)" }
            },
            required: ["domain"]
          }
        },
        {
          name: "check_dns",
          description: "Check if a domain's A record points to the expected IP ranges.",
          inputSchema: {
            type: "object",
            properties: {
              domain: { type: "string", description: "Domain to check (e.g. example.com)" }
            },
            required: ["domain"]
          }
        }
      ]
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "shorten_url": {
        const input = shortenSchema.parse(args || {});
        const res = await fetch(`${BASE_URL}/api/v6/shorten`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: input.urls, password: input.password ?? "" })
        });
        const data = await res.json();
        
        // Construct the full shortened URLs using BASE_URL
        const shortenedUrls = data.map((item: any) => ({
          key: item.key,
          url: item.url,
          shortUrl: `${BASE_URL}${item.key}`
        }));
        
        return { content: [{ type: "text", text: JSON.stringify(shortenedUrls, null, 2) }] };
      }

      case "get_count": {
        const res = await fetch(`${BASE_URL}/api/v6/count`);
        const data = await res.json();
        return { content: [{ type: "text", text: `Total URLs: ${data}` }] };
      }

      case "add_domain": {
        const input = addDomainSchema.parse(args || {});
        const url = new URL(`${BASE_URL}/api/v6/domain`);
        url.searchParams.set("add", input.domain);
        const res = await fetch(url);
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "check_dns": {
        const input = checkDnsSchema.parse(args || {});
        const url = new URL(`${BASE_URL}/api/v6/dns`);
        url.searchParams.set("domain", input.domain);
        const res = await fetch(url);
        const text = await res.text();
        const ok = res.ok;
        return { content: [{ type: "text", text: ok ? `OK: ${text}` : `ERROR: ${text}` }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


