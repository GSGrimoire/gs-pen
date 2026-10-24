import { env } from 'cloudflare:workers';
import { handleSiteRequest } from '../../../server/site-service.mjs';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => handleSiteRequest(request, env);
export const POST = GET;
export const DELETE = GET;
