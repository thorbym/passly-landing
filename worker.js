// Passly — Cloudflare Worker
// Proxies waitlist form submissions to the Notion API.
//
// Setup:
//   1. Deploy this file as a Cloudflare Worker (workers.cloudflare.com)
//   2. Add a secret: NOTION_API_KEY  (Settings → Variables → Add secret)
//   3. Copy the deployed Worker URL into index.html (WORKER_URL constant)

const DATABASE_ID = '0416b2906e7e4c42b89fd271167c78e0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Bad request', { status: 400 });
    }

    const { email, benefit, fear, callback } = body;

    if (!email) {
      return new Response('Email required', { status: 400 });
    }

    const properties = {
      Email:   { title:     [{ text: { content: email } }] },
      Benefit: { rich_text: [{ text: { content: benefit  || '' } }] },
      Fear:    { rich_text: [{ text: { content: fear     || '' } }] },
    };

    if (callback) {
      properties.Callback = { select: { name: callback } };
    }

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${env.NOTION_API_KEY}`,
        'Content-Type':   'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: DATABASE_ID },
        properties,
      }),
    });

    const ok = notionRes.ok;
    return new Response(JSON.stringify({ ok }), {
      status: ok ? 200 : 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  },
};
