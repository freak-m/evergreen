export default {
  async fetch(request, env) {
    const url     = new URL(request.url);
    const SITE    = 'evergreenhidrossemeadura.com.br';
    const origins = [`https://${SITE}`, `https://www.${SITE}`];
    const origin  = request.headers.get('Origin') || '';
    const allowed = origins.includes(origin) ? origin : origins[1];

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }});
    }
    if (!origins.includes(origin)) {
      return new Response('Forbidden', { status: 403,
        headers: { 'Access-Control-Allow-Origin': allowed } });
    }
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowed,
      'Content-Type': 'application/json',
    };

    if (request.method === 'POST') {
      try {
        const body = await request.json();
        const { event, value } = body;
        if (!event) return new Response(JSON.stringify({ ok: false }), { headers: corsHeaders });
        const key = `event:${event}:${Date.now()}`;
        await env.analytics.put(key, String(value ?? 1), { expirationTtl: 7776000 });
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      } catch {
        return new Response(JSON.stringify({ ok: false }), { status: 400, headers: corsHeaders });
      }
    }

    // ── CF Analytics ────────────────────────────────────
    const fmt = d => d.toISOString().split('T')[0];
    let days, now, start;
    const fromParam = url.searchParams.get('from');
    const toParam   = url.searchParams.get('to');
    if (fromParam && toParam) {
      start = new Date(fromParam + 'T12:00:00Z');
      now   = new Date(toParam   + 'T12:00:00Z');
      days  = Math.max(1, Math.round((now - start) / 86400000) + 1);
    } else {
      days  = Math.min(parseInt(url.searchParams.get('days') || '7'), 90);
      now   = new Date();
      start = new Date(now); start.setDate(start.getDate() - (days - 1));
    }
    const prevEnd   = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - (days - 1));

    const gql = `{viewer{zones(filter:{zoneTag:"${env.CF_ZONE_ID}"}){
      current:httpRequests1dGroups(limit:90 orderBy:[date_ASC] filter:{date_geq:"${fmt(start)}",date_leq:"${fmt(now)}"}) {
        dimensions{date} sum{pageViews requests countryMap{clientCountryName requests}} uniq{uniques}
      }
      prev:httpRequests1dGroups(limit:90 filter:{date_geq:"${fmt(prevStart)}",date_leq:"${fmt(prevEnd)}"}) {
        sum{pageViews requests} uniq{uniques}
      }
      devices:httpRequestsAdaptiveGroups(limit:10 orderBy:[count_DESC] filter:{date_geq:"${fmt(now)}",date_leq:"${fmt(now)}"}) {
        dimensions{clientDeviceType} count
      }
    }}}`;

    const cfRes  = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gql }),
    });
    const cfJson = await cfRes.json();

    let events = null;
    try {
      const kvList = await env.analytics.list({ prefix: 'event:' });
      const counts = { wa: 0, photo: 0, time_total: 0, time_count: 0, prev_wa: 0, prev_photo: 0 };
      const cutoff     = Date.now() - days * 86400000;
      const prevCutoff = cutoff - days * 86400000;
      for (const key of kvList.keys) {
        const parts  = key.name.split(':');
        const evName = parts[1];
        const ts     = parseInt(parts[2] || '0');
        const val    = parseFloat(await env.analytics.get(key.name) || '1');
        if (ts >= cutoff) {
          if (evName === 'wa')    counts.wa++;
          if (evName === 'photo') counts.photo++;
          if (evName === 'time')  { counts.time_total += val; counts.time_count++; }
        } else if (ts >= prevCutoff) {
          if (evName === 'wa')    counts.prev_wa++;
          if (evName === 'photo') counts.prev_photo++;
        }
      }
      events = {
        wa:       counts.wa,
        photo:    counts.photo,
        time_avg: counts.time_count ? Math.round(counts.time_total / counts.time_count) : 0,
        prev_wa:  counts.prev_wa,
        prev_photo: counts.prev_photo,
      };
    } catch {}

    const zoneRaw = cfJson.data?.viewer?.zones?.[0] || {};

    return new Response(JSON.stringify({
      data: { viewer: { zones: [{ current: zoneRaw.current || [], prev: zoneRaw.prev || [], devices: zoneRaw.devices || [] }] } },
      errors: cfJson.errors,
      events,
    }), { headers: corsHeaders });
  },
};
