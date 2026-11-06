// Claude connector (MCP server, Streamable HTTP, JSON responses).
// Add in Claude → Customize → Connectors → Add custom connector:
//   URL  https://www.magicaltouchdesign.com/api/mcp/<your key>
//   (or the URL without the key plus a header "Authorization: Bearer <key>")
// Keys are made in Admin → Hosting & renewals → Claude connector. Every
// call goes to the database function mcp_call, which checks the key and
// only allows the safe admin jobs listed below.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const S = (props: Record<string, any>, required: string[] = []) => ({ type: 'object', properties: props, required, additionalProperties: false });
const str = (d: string) => ({ type: 'string', description: d });
const num = (d: string) => ({ type: 'number', description: d });
const bool = (d: string) => ({ type: 'boolean', description: d });
const ro = { readOnlyHint: true };

const TOOLS = [
  { name: 'site_overview', description: 'Magical Touch Design at a glance: users, designs, published and draft templates, unread messages, renewals due in 30 days, searches this week.', inputSchema: S({}), annotations: ro },
  { name: 'list_services', description: 'Everything the site runs on (domain, DNS, hosting, database, email, payments, AI…) with plan, cost, renewal date, renew link and technical details.', inputSchema: S({}), annotations: ro },
  {
    name: 'update_service',
    description: 'Update a hosting/renewal entry after paying or changing plan. Only the fields you pass change.',
    inputSchema: S({ id: str('Service id from list_services'), renews_on: str('Next renewal date, YYYY-MM-DD'), cost: num('Cost per billing period'), currency: str('e.g. USD, AED'), plan: str('Plan name'), status: { type: 'string', enum: ['active', 'standby', 'cancelled', 'expired'] }, auto_renew: bool('Renews automatically'), notes: str('Short note') }, ['id']),
  },
  { name: 'list_messages', description: 'Admin inbox: customer messages, festival reminders, renewal warnings.', inputSchema: S({ unread_only: bool('Only unread (default true)'), limit: num('Max items (default 20)') }), annotations: ro },
  { name: 'mark_message_read', description: 'Mark one inbox message as read.', inputSchema: S({ id: str('Message id') }, ['id']) },
  { name: 'search_templates', description: 'Find templates by name, search words or tag. Returns id, slug, category, status, size, tags.', inputSchema: S({ query: str('Words to look for (empty = newest)'), status: { type: 'string', enum: ['published', 'draft', 'review'] }, limit: num('Max items (default 20)') }), annotations: ro },
  { name: 'set_template_status', description: 'Publish a template (it must have a design and a picture) or take it back to draft. Public page: https://www.magicaltouchdesign.com/templates/<slug>', inputSchema: S({ id: str('Template id'), status: { type: 'string', enum: ['published', 'draft'] } }, ['id', 'status']) },
  {
    name: 'update_template_info',
    description: "Change a template's name, description, search words, tags, occasion or home-page feature flag (not the design itself).",
    inputSchema: S({ id: str('Template id'), name: str('New name'), description: str('Description'), keywords: str('Search words, comma separated'), tags: { type: 'array', items: { type: 'string' }, description: 'Full new tag list' }, occasion: str('e.g. Diwali'), featured: bool('Show on the home page') }, ['id']),
  },
  { name: 'top_searches', description: 'What visitors searched for on the site, with how many templates each search found.', inputSchema: S({ days: num('Look back this many days (default 30)'), limit: num('Max items (default 20)') }), annotations: ro },
  { name: 'upcoming_festivals', description: 'Festivals and occasions coming up (from Admin → Festivals), to plan templates and posts.', inputSchema: S({ days: num('Days ahead (default 90)'), limit: num('Max items (default 20)') }), annotations: ro },
  { name: 'landing_pages', description: 'SEO landing pages with status, views and searches in the last 30 days.', inputSchema: S({ limit: num('Max items (default 20)') }), annotations: ro },
];

const INSTRUCTIONS =
  'Admin tools for magicaltouchdesign.com, a free online design tool. Use site_overview first for a summary. Never claim a change worked unless the tool returned updated: 1. Template pages live at https://www.magicaltouchdesign.com/templates/<slug>; the admin panel is https://www.magicaltouchdesign.com/admin.';

function keyFrom(req: NextRequest, params: { key?: string[] }) {
  const fromPath = params.key?.[0];
  const auth = req.headers.get('authorization') || '';
  const fromHeader = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  return (fromPath || fromHeader || '').trim();
}

async function callTool(key: string, name: string, args: any) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/mcp_call`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_key: key, p_tool: name, p_args: args || {} }),
    cache: 'no-store',
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(body?.message || `Database error ${r.status}`);
  return body;
}

async function handle(msg: any, key: string): Promise<any | null> {
  const { id, method, params } = msg || {};
  const reply = (result: any) => ({ jsonrpc: '2.0', id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });
  if (id === undefined || id === null) return null; // notifications need no answer
  switch (method) {
    case 'initialize':
      return reply({
        protocolVersion: params?.protocolVersion || '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'magical-touch-admin', title: 'Magical Touch Design admin', version: '1.0.0' },
        instructions: INSTRUCTIONS,
      });
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call': {
      const name = params?.name;
      if (!TOOLS.some((t) => t.name === name)) return fail(-32602, `Unknown tool: ${name}`);
      try {
        const data = await callTool(key, name, params?.arguments || {});
        return reply({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: Array.isArray(data) ? { items: data } : data });
      } catch (e: any) {
        return reply({ content: [{ type: 'text', text: `Error: ${e?.message || 'failed'}` }], isError: true });
      }
    }
    default:
      return fail(-32601, `Method not found: ${method}`);
  }
}

export async function POST(req: NextRequest, { params }: { params: { key?: string[] } }) {
  const key = keyFrom(req, params);
  if (!/^mt_[a-f0-9]{64}$/.test(key)) {
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Missing or invalid connector key. Make one in Admin → Hosting & renewals → Claude connector.' } }, { status: 401 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 });
  }
  const out = Array.isArray(body) ? (await Promise.all(body.map((m) => handle(m, key)))).filter(Boolean) : await handle(body, key);
  if (!out || (Array.isArray(out) && !out.length)) return new NextResponse(null, { status: 202 });
  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET() {
  return new NextResponse('This is the Magical Touch Design Claude connector. Use it from Claude (POST, MCP).', { status: 405, headers: { Allow: 'POST' } });
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } });
}
