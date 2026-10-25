import { env } from 'cloudflare:workers';
import html from '../web/index.html?raw';
import { ownerAuthorized, securityHeaders } from '../server/site-service.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!ownerAuthorized(request, env)) return new Response('Owner sign-in required. Open /signin-with-chatgpt?return_to=/', {status:403, headers:securityHeaders('text/plain')});
  return new Response(html, {headers:securityHeaders('text/html; charset=utf-8')});
}
