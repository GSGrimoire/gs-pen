/// <reference types="vite/client" />
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    GS_PEN_OWNER_EMAIL: string;
    GS_PEN_OWNER_ID?: string;
    GS_PEN_RESEARCH_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
