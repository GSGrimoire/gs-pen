import { env } from 'cloudflare:workers';
import { handleSiteRequest } from '../../server/site-service.mjs';
export const dynamic = 'force-dynamic';
export const POST = (request: Request) => handleSiteRequest(request, env);
