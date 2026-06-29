import { getRequestURL, proxyRequest, type H3Event } from "h3";
import { useRuntimeConfig } from "#imports";

type ProxyTarget = "api" | "mcp";

function configuredBaseUrl(event: H3Event, target: ProxyTarget) {
  const config = useRuntimeConfig(event);
  const configured = target === "api"
    ? process.env.MEALMIND_API_BASE_URL ?? config.apiBaseUrl
    : process.env.MEALMIND_MCP_BASE_URL ?? config.mcpBaseUrl;
  const url = new URL(String(configured));
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported ${target} proxy protocol.`);
  }
  return url;
}

export function proxyMealMindRequest(event: H3Event, target: ProxyTarget) {
  const incoming = getRequestURL(event);
  const destination = configuredBaseUrl(event, target);
  destination.pathname = incoming.pathname;
  destination.search = incoming.search;
  return proxyRequest(event, destination.toString());
}
