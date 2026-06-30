import { defineEventHandler } from "h3";
import { proxyMealMindRequest } from "../../utils/proxy";

export default defineEventHandler((event) => proxyMealMindRequest(event, "mcp"));
