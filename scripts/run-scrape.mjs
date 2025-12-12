import postgres from 'postgres';
import * as cheerio from 'cheerio';

const DATABASE_URL = process.env.DATABASE_URL;
const FANGRAPHS_BATTERS_URL = 'https://www.fangraphs.com/projections?type=steamer&stats=bat&pos=&team=0&players=0&lg=all&pageitems=2000';
const FANGRAPHS_PITCHERS_URL = 'https://www.fangraphs.com/projections?type=steamer&stats=pit&pos=&team=0&players=0&lg=all&pageitems=2000';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const sql = postgres(DATABASE_URL);

async function fetchAndParse(url, type) {
  console.log(`Fetching ${type}...`);
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const scriptTag = $('#__NEXT_DATA__');
  if (!scriptTag.length) throw new Error('No __NEXT_DATA__');

  const nextData = JSON.parse(scriptTag.text());
  const data = nextData?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data;
  console.log(`Found ${data.length} ${type}`);
  return data;
}

async function main() {
  console.log('Creating scrape records...');

  // Batters
  const battersData = await fetchAndParse(FANGRAPHS_BATTERS_URL, 'batters');
  const [batterScrape] = await sql`
    INSERT INTO scrape_metadata (scrape_type, source_url, projection_system, status)
    VALUES ('batters', ${FANGRAPHS_BATTERS_URL}, 'steamer', 'in_progress')
    RETURNING id
  `;

  const batterRows = battersData.map(p => ({
    scrape_id: batterScrape.id,
    name: p.PlayerName || '',
    team: p.Team || null,
    positions: p.minpos || 'DH',
    pa: Math.round(p.PA || 0),
    ab: Math.round(p.AB || 0),
    h: Math.round(p.H || 0),
    hr: Math.round(p.HR || 0),
    r: Math.round(p.R || 0),
    rbi: Math.round(p.RBI || 0),
    sb: Math.round(p.SB || 0),
    bb: Math.round(p.BB || 0),
    so: Math.round(p.SO || 0),
    avg: (p.AVG || 0).toFixed(3),
    obp: (p.OBP || 0).toFixed(3),
    slg: (p.SLG || 0).toFixed(3),
    woba: (p.wOBA || 0).toFixed(3),
    wrc_plus: Math.round(p['wRC+'] || 0),
  }));

  // Insert in batches of 500 to avoid parameter limit
  const BATCH_SIZE = 500;
  for (let i = 0; i < batterRows.length; i += BATCH_SIZE) {
    const batch = batterRows.slice(i, i + BATCH_SIZE);
    await sql`INSERT INTO batter_projections ${sql(batch)}`;
    console.log(`Inserted batters ${i + 1} to ${Math.min(i + BATCH_SIZE, batterRows.length)}`);
  }
  await sql`UPDATE scrape_metadata SET status = 'success', player_count = ${batterRows.length}, completed_at = NOW() WHERE id = ${batterScrape.id}`;
  console.log(`Completed ${batterRows.length} batters`);

  // Pitchers
  const pitchersData = await fetchAndParse(FANGRAPHS_PITCHERS_URL, 'pitchers');
  const [pitcherScrape] = await sql`
    INSERT INTO scrape_metadata (scrape_type, source_url, projection_system, status)
    VALUES ('pitchers', ${FANGRAPHS_PITCHERS_URL}, 'steamer', 'in_progress')
    RETURNING id
  `;

  const pitcherRows = pitchersData.map(p => ({
    scrape_id: pitcherScrape.id,
    name: p.PlayerName || '',
    team: p.Team || null,
    ip: (p.IP || 0).toFixed(1),
    w: Math.round(p.W || 0),
    l: Math.round(p.L || 0),
    sv: Math.round(p.SV || 0),
    k: Math.round(p.K || 0),
    bb: Math.round(p.BB || 0),
    hr: Math.round(p.HR || 0),
    era: (p.ERA || 0).toFixed(2),
    whip: (p.WHIP || 0).toFixed(2),
    fip: (p.FIP || 0).toFixed(2),
  }));

  // Insert in batches of 500 to avoid parameter limit
  for (let i = 0; i < pitcherRows.length; i += BATCH_SIZE) {
    const batch = pitcherRows.slice(i, i + BATCH_SIZE);
    await sql`INSERT INTO pitcher_projections ${sql(batch)}`;
    console.log(`Inserted pitchers ${i + 1} to ${Math.min(i + BATCH_SIZE, pitcherRows.length)}`);
  }
  await sql`UPDATE scrape_metadata SET status = 'success', player_count = ${pitcherRows.length}, completed_at = NOW() WHERE id = ${pitcherScrape.id}`;
  console.log(`Completed ${pitcherRows.length} pitchers`);

  await sql.end();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
