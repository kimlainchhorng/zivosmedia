import { writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export const endpoints = ['/rest/v1/stories', '/rest/v1/food_orders', '/rest/v1/rpc/list_own_customer_payout_methods', '/rest/v1/rpc/is_driver'];
export const rateSql = `select splitByChar('?', log_attributes['request.path'])[1] as endpoint,
 count() as requests,
 countIf(toInt32OrZero(log_attributes['response.status_code']) between 400 and 499) as errors4xx
 from logs where source = 'edge_logs'
 and splitByChar('?', log_attributes['request.path'])[1] in (${endpoints.map(p => `'${p}'`).join(',')})
 group by endpoint limit 4`;
export function assessRates(rows) {
  if (!Array.isArray(rows)) throw new Error('Monitoring response unavailable');
  const results = new Map();
  for (const row of rows) {
    if (!endpoints.includes(row.endpoint) || results.has(row.endpoint)) throw new Error('Unexpected monitoring endpoint');
    const requests = Number(row.requests), errors4xx = Number(row.errors4xx);
    if (!Number.isSafeInteger(requests) || !Number.isSafeInteger(errors4xx) || requests < 0 || errors4xx < 0 || errors4xx > requests) throw new Error('Invalid monitoring counts');
    results.set(row.endpoint, { endpoint: row.endpoint, requests, errors4xx, rate: requests ? errors4xx / requests : null,
      alert: errors4xx >= 3 && errors4xx / requests >= 0.05 });
  }
  return endpoints.map(endpoint => results.get(endpoint) || { endpoint, requests: 0, errors4xx: 0, rate: null, alert: false });
}
export async function collectRates(token, fetcher = fetch) {
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is required');
  const end = new Date(), start = new Date(end.getTime() - 15 * 60_000);
  const url = new URL('https://api.supabase.com/v1/projects/slirphzzwcogdbkeicff/analytics/endpoints/logs');
  url.searchParams.set('sql', rateSql);url.searchParams.set('iso_timestamp_start', start.toISOString());url.searchParams.set('iso_timestamp_end', end.toISOString());
  const response = await fetcher(url, { headers: { Authorization: 'Bearer ' + token, apikey: token }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Monitoring API unavailable (HTTP ${response.status})`);
  const body = await response.json();if (body.error) throw new Error('Monitoring query failed');
  return { start: start.toISOString(), end: end.toISOString(), endpoints: assessRates(body.result) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await collectRates(process.env.SUPABASE_ACCESS_TOKEN);
    await mkdir('artifacts/monitoring', { recursive: true });
    await writeFile('artifacts/monitoring/api-error-rates.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    if (result.endpoints.some(row => row.alert)) process.exitCode = 1;
  } catch (error) { console.error(error instanceof Error ? error.message : 'Monitoring unavailable');process.exitCode = 2; }
}
