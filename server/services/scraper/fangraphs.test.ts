/**
 * Tests for Fangraphs scraper module
 *
 * Tests fetchBatterProjections (Fangraphs JSON parsing) and
 * fetchJABatterProjections (Google Sheets CSV parsing).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchBatterProjections,
  fetchJABatterProjections,
  fetchPitcherProjections,
  FANGRAPHS_BATTERS_URL,
  FANGRAPHS_PITCHERS_URL,
  JA_PROJECTIONS_BATTERS_URL,
} from './fangraphs';
import { AppError } from '../../lib/errors';

// Mock logger
vi.mock('../../lib/logger', () => ({
  log: vi.fn(),
}));

// Store original fetch
const originalFetch = global.fetch;

// Sample Fangraphs __NEXT_DATA__ JSON structure
function createFangraphsHtml(players: object[]): string {
  const nextData = {
    props: {
      pageProps: {
        dehydratedState: {
          queries: [
            {
              state: {
                data: players,
              },
            },
          ],
        },
      },
    },
  };
  return `
    <html>
      <head>
        <script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>
      </head>
      <body></body>
    </html>
  `;
}

// Generate sample Fangraphs batter data
function generateFangraphsBatters(count: number): object[] {
  const batters = [];
  for (let i = 0; i < count; i++) {
    batters.push({
      PlayerName: `Player ${i + 1}`,
      Team: ['NYY', 'LAD', 'BOS', 'CHC'][i % 4],
      minpos: ['OF', 'SS', '1B', '2B', 'C'][i % 5],
      G: 150,
      PA: 600 + i,
      AB: 550 + i,
      H: 150 + i,
      '1B': 100,
      '2B': 30,
      '3B': 5,
      HR: 25 + (i % 10),
      R: 90,
      RBI: 85,
      SB: 10,
      BB: 50,
      SO: 120,
      AVG: 0.273 + (i % 10) * 0.001,
      OBP: 0.350,
      SLG: 0.480,
      wOBA: 0.355,
      'wRC+': 115 + (i % 20),
    });
  }
  return batters;
}

// Generate sample JA Projections CSV
function generateJAProjectionsCsv(count: number): string {
  const header = 'Player,Team,MLBID,Pos,$,PA,AB,R,HR,RBI,SB,AVG,OBP,SLG,OPS,K%,BB%,SO,BB,Deep $';
  const rows = [header];
  for (let i = 0; i < count; i++) {
    rows.push(
      `Player ${i + 1},${['NYY', 'LAD', 'BOS', 'CHC'][i % 4]},${100000 + i},${['OF', 'SS', '1B', '2B', 'C'][i % 5]},10.5,${600 + i},${550 + i},90,${25 + (i % 10)},85,10,0.${273 + (i % 10)},0.350,0.480,0.830,20%,10%,120,50,8.5`
    );
  }
  return rows.join('\n');
}

// Generate sample Fangraphs pitcher data
function generateFangraphsPitchers(count: number): object[] {
  const pitchers = [];
  for (let i = 0; i < count; i++) {
    pitchers.push({
      PlayerName: `Pitcher ${i + 1}`,
      Team: ['NYY', 'LAD', 'BOS', 'CHC'][i % 4],
      IP: 150.0 + (i % 50),
      W: 10 + (i % 5),
      L: 5 + (i % 3),
      SV: i % 10 === 0 ? 30 : 0,
      K: 150 + (i % 50),
      BB: 40 + (i % 20),
      HR: 15 + (i % 10),
      ERA: 3.50 + (i % 10) * 0.1,
      WHIP: 1.15 + (i % 10) * 0.01,
      FIP: 3.40 + (i % 10) * 0.1,
    });
  }
  return pitchers;
}

describe('fangraphs module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('URL constants', () => {
    it('should export FANGRAPHS_BATTERS_URL with correct format', () => {
      expect(FANGRAPHS_BATTERS_URL).toContain('fangraphs.com/projections');
      expect(FANGRAPHS_BATTERS_URL).toContain('stats=bat');
      expect(FANGRAPHS_BATTERS_URL).toContain('type=steamer');
    });

    it('should export FANGRAPHS_PITCHERS_URL with correct format', () => {
      expect(FANGRAPHS_PITCHERS_URL).toContain('fangraphs.com/projections');
      expect(FANGRAPHS_PITCHERS_URL).toContain('stats=pit');
      expect(FANGRAPHS_PITCHERS_URL).toContain('type=steamer');
    });

    it('should export JA_PROJECTIONS_BATTERS_URL with correct format', () => {
      expect(JA_PROJECTIONS_BATTERS_URL).toContain('docs.google.com/spreadsheets');
      expect(JA_PROJECTIONS_BATTERS_URL).toContain('export?format=csv');
    });
  });

  describe('fetchBatterProjections (Fangraphs)', () => {
    it('should fetch and parse batters successfully', async () => {
      const mockBatters = generateFangraphsBatters(550);
      const mockHtml = createFangraphsHtml(mockBatters);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      const batters = await fetchBatterProjections();

      expect(global.fetch).toHaveBeenCalledWith(
        FANGRAPHS_BATTERS_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
          }),
        })
      );
      expect(batters.length).toBe(550);
    });

    it('should correctly map all batter fields', async () => {
      const mockBatters = generateFangraphsBatters(550);
      const mockHtml = createFangraphsHtml(mockBatters);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      const batters = await fetchBatterProjections();
      const firstBatter = batters[0];

      expect(firstBatter.name).toBe('Player 1');
      expect(firstBatter.team).toBe('NYY');
      expect(firstBatter.positions).toBe('OF');
      expect(firstBatter.pa).toBe(600);
      expect(firstBatter.ab).toBe(550);
      expect(firstBatter.h).toBe(150);
      expect(firstBatter.hr).toBe(25);
      expect(firstBatter.r).toBe(90);
      expect(firstBatter.rbi).toBe(85);
      expect(firstBatter.sb).toBe(10);
      expect(firstBatter.bb).toBe(50);
      expect(firstBatter.so).toBe(120);
      expect(firstBatter.avg).toBe('0.273');
      expect(firstBatter.obp).toBe('0.350');
      expect(firstBatter.slg).toBe('0.480');
      expect(firstBatter.woba).toBe('0.355');
      expect(firstBatter.wrcPlus).toBe(115);
      expect(firstBatter.scrapeId).toBe(0);
    });

    it('should throw AppError on HTTP failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(fetchBatterProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        statusCode: 502,
      });
    });

    it('should throw AppError when __NEXT_DATA__ not found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><body>No data</body></html>',
      });

      await expect(fetchBatterProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        message: expect.stringContaining('__NEXT_DATA__'),
      });
    });

    it('should throw AppError when JSON is invalid', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><script id="__NEXT_DATA__">invalid json</script></html>',
      });

      await expect(fetchBatterProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        message: expect.stringContaining('Invalid JSON'),
      });
    });

    it('should throw AppError when player data array not found', async () => {
      const badNextData = { props: { pageProps: {} } };
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => `<html><script id="__NEXT_DATA__">${JSON.stringify(badNextData)}</script></html>`,
      });

      await expect(fetchBatterProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        message: expect.stringContaining('Player data array not found'),
      });
    });

    it('should throw AppError when insufficient batters', async () => {
      const mockBatters = generateFangraphsBatters(100); // Less than 500
      const mockHtml = createFangraphsHtml(mockBatters);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      await expect(fetchBatterProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        message: expect.stringContaining('Insufficient batters'),
      });
    });

    it('should handle missing fields with defaults', async () => {
      const mockBatters = [
        {
          PlayerName: 'Test Player',
          Team: '',
          minpos: '',
          // All other fields missing
        },
      ];
      // Add 549 more complete batters to meet minimum
      for (let i = 1; i < 550; i++) {
        mockBatters.push({
          PlayerName: `Player ${i}`,
          Team: 'NYY',
          minpos: 'OF',
          PA: 600,
          AB: 550,
          H: 150,
          HR: 25,
          R: 90,
          RBI: 85,
          SB: 10,
          BB: 50,
          SO: 120,
          AVG: 0.273,
          OBP: 0.350,
          SLG: 0.480,
          wOBA: 0.355,
          'wRC+': 115,
        } as object);
      }
      const mockHtml = createFangraphsHtml(mockBatters);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      const batters = await fetchBatterProjections();
      const firstBatter = batters[0];

      expect(firstBatter.name).toBe('Test Player');
      expect(firstBatter.team).toBe(null);
      expect(firstBatter.positions).toBe('DH');
      expect(firstBatter.pa).toBe(0);
      expect(firstBatter.avg).toBe('0.000');
      expect(firstBatter.wrcPlus).toBe(0);
    });

    it('should format decimal stats to exactly 3 decimal places', async () => {
      const mockBatters = [
        {
          PlayerName: 'Decimal Test',
          Team: 'NYY',
          minpos: 'OF',
          PA: 600,
          AB: 550,
          H: 150,
          HR: 25,
          R: 90,
          RBI: 85,
          SB: 10,
          BB: 50,
          SO: 120,
          AVG: 0.27,     // 2 decimal places - should become "0.270"
          OBP: 0.3,      // 1 decimal place - should become "0.300"
          SLG: 0.4567,   // 4 decimal places - should round to "0.457"
          wOBA: 0.35555, // 5 decimal places - should round to "0.356"
          'wRC+': 115,
        },
      ];
      // Add more to meet minimum
      for (let i = 1; i < 550; i++) {
        mockBatters.push({
          PlayerName: `Player ${i}`,
          Team: 'NYY',
          minpos: 'OF',
          PA: 600,
          AB: 550,
          H: 150,
          HR: 25,
          R: 90,
          RBI: 85,
          SB: 10,
          BB: 50,
          SO: 120,
          AVG: 0.273,
          OBP: 0.350,
          SLG: 0.480,
          wOBA: 0.355,
          'wRC+': 115,
        } as object);
      }
      const mockHtml = createFangraphsHtml(mockBatters);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      const batters = await fetchBatterProjections();
      const firstBatter = batters[0];

      // All should be exactly 3 decimal places
      expect(firstBatter.avg).toBe('0.270');
      expect(firstBatter.obp).toBe('0.300');
      expect(firstBatter.slg).toBe('0.457');
      expect(firstBatter.woba).toBe('0.356');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchBatterProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        message: expect.stringContaining('Network error'),
      });
    });
  });

  describe('fetchJABatterProjections (Google Sheets)', () => {
    it('should fetch and parse JA Projections CSV successfully', async () => {
      const mockCsv = generateJAProjectionsCsv(550);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockCsv,
      });

      const batters = await fetchJABatterProjections();

      expect(global.fetch).toHaveBeenCalledWith(
        JA_PROJECTIONS_BATTERS_URL,
        expect.objectContaining({
          redirect: 'follow',
        })
      );
      expect(batters.length).toBe(550);
    });

    it('should correctly map JA Projections fields', async () => {
      const mockCsv = generateJAProjectionsCsv(550);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockCsv,
      });

      const batters = await fetchJABatterProjections();
      const firstBatter = batters[0];

      expect(firstBatter.name).toBe('Player 1');
      expect(firstBatter.team).toBe('NYY');
      expect(firstBatter.positions).toBe('OF');
      expect(firstBatter.pa).toBe(600);
      expect(firstBatter.ab).toBe(550);
      expect(firstBatter.hr).toBe(25);
      expect(firstBatter.r).toBe(90);
      expect(firstBatter.rbi).toBe(85);
      expect(firstBatter.sb).toBe(10);
      expect(firstBatter.bb).toBe(50);
      expect(firstBatter.so).toBe(120);
      // JA Projections doesn't have wOBA/wRC+ - should default
      expect(firstBatter.woba).toBe('0.000');
      expect(firstBatter.wrcPlus).toBe(0);
    });

    it('should calculate hits from AB * AVG', async () => {
      const mockCsv = generateJAProjectionsCsv(550);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockCsv,
      });

      const batters = await fetchJABatterProjections();
      const firstBatter = batters[0];

      // H = AB * AVG = 550 * 0.273 = 150.15 -> 150
      expect(firstBatter.h).toBe(150);
    });

    it('should normalize positions (remove P from batters)', async () => {
      const csvWithPitcher = `Player,Team,MLBID,Pos,$,PA,AB,R,HR,RBI,SB,AVG,OBP,SLG,OPS,K%,BB%,SO,BB,Deep $
Shohei Ohtani,LAD,660271,"UT, P",21.89,658,564,124,48,94,25,0.278,0.377,0.605,0.982,24.2%,13.2%,160,87,16.44`;
      // Add more batters to meet minimum
      let fullCsv = csvWithPitcher;
      for (let i = 1; i < 550; i++) {
        fullCsv += `\nPlayer ${i},NYY,${100000 + i},OF,10.5,600,550,90,25,85,10,0.273,0.350,0.480,0.830,20%,10%,120,50,8.5`;
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => fullCsv,
      });

      const batters = await fetchJABatterProjections();

      expect(batters[0].positions).toBe('UT'); // P removed
    });

    it('should throw AppError on HTTP failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(fetchJABatterProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        statusCode: 502,
      });
    });

    it('should throw AppError when missing required columns', async () => {
      const invalidCsv = 'Name,Team\nPlayer 1,NYY';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => invalidCsv,
      });

      await expect(fetchJABatterProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        message: expect.stringContaining('Missing required column'),
      });
    });

    it('should throw AppError when insufficient batters', async () => {
      const mockCsv = generateJAProjectionsCsv(100); // Less than 500

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockCsv,
      });

      await expect(fetchJABatterProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        message: expect.stringContaining('Insufficient batters'),
      });
    });

    it('should handle quoted fields with commas', async () => {
      const csvWithQuotes = `Player,Team,MLBID,Pos,$,PA,AB,R,HR,RBI,SB,AVG,OBP,SLG,OPS,K%,BB%,SO,BB,Deep $
"O'Neill, Tyler",BOS,641933,OF,5.5,450,400,60,20,55,5,0.250,0.320,0.450,0.770,25%,8%,100,36,4.0`;
      // Add more batters to meet minimum
      let fullCsv = csvWithQuotes;
      for (let i = 1; i < 550; i++) {
        fullCsv += `\nPlayer ${i},NYY,${100000 + i},OF,10.5,600,550,90,25,85,10,0.273,0.350,0.480,0.830,20%,10%,120,50,8.5`;
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => fullCsv,
      });

      const batters = await fetchJABatterProjections();

      expect(batters[0].name).toBe("O'Neill, Tyler");
    });
  });

  describe('fetchPitcherProjections (Fangraphs)', () => {
    it('should fetch and parse pitchers successfully', async () => {
      const mockPitchers = generateFangraphsPitchers(350);
      const mockHtml = createFangraphsHtml(mockPitchers);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      const pitchers = await fetchPitcherProjections();

      expect(global.fetch).toHaveBeenCalledWith(
        FANGRAPHS_PITCHERS_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
          }),
        })
      );
      expect(pitchers.length).toBe(350);
    });

    it('should correctly map all pitcher fields', async () => {
      const mockPitchers = generateFangraphsPitchers(350);
      const mockHtml = createFangraphsHtml(mockPitchers);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      const pitchers = await fetchPitcherProjections();
      const firstPitcher = pitchers[0];

      expect(firstPitcher.name).toBe('Pitcher 1');
      expect(firstPitcher.team).toBe('NYY');
      expect(firstPitcher.ip).toBe('150.0');
      expect(firstPitcher.w).toBe(10);
      expect(firstPitcher.l).toBe(5);
      expect(firstPitcher.sv).toBe(30);
      expect(firstPitcher.k).toBe(150);
      expect(firstPitcher.bb).toBe(40);
      expect(firstPitcher.hr).toBe(15);
      expect(firstPitcher.era).toBe('3.50');
      expect(firstPitcher.whip).toBe('1.15');
      expect(firstPitcher.fip).toBe('3.40');
      expect(firstPitcher.scrapeId).toBe(0);
    });

    it('should format IP with 1 decimal place', async () => {
      const mockPitchers = [{
        PlayerName: 'Test Pitcher',
        Team: 'NYY',
        IP: 180,  // No decimal
        W: 12,
        L: 7,
        SV: 0,
        K: 210,
        BB: 45,
        HR: 22,
        ERA: 3.456,  // More than 2 decimals
        WHIP: 1.123,
        FIP: 3.281,
      }];
      // Add more pitchers to meet minimum
      for (let i = 1; i < 350; i++) {
        mockPitchers.push({
          PlayerName: `Pitcher ${i}`,
          Team: 'NYY',
          IP: 150,
          W: 10,
          L: 5,
          SV: 0,
          K: 150,
          BB: 40,
          HR: 15,
          ERA: 3.50,
          WHIP: 1.15,
          FIP: 3.40,
        });
      }
      const mockHtml = createFangraphsHtml(mockPitchers);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      const pitchers = await fetchPitcherProjections();
      const firstPitcher = pitchers[0];

      expect(firstPitcher.ip).toBe('180.0');  // 1 decimal
      expect(firstPitcher.era).toBe('3.46');  // 2 decimals, rounded
      expect(firstPitcher.whip).toBe('1.12'); // 2 decimals, rounded
      expect(firstPitcher.fip).toBe('3.28');  // 2 decimals, rounded
    });

    it('should throw AppError on HTTP failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(fetchPitcherProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        statusCode: 502,
      });
    });

    it('should throw AppError when __NEXT_DATA__ not found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><body>No data</body></html>',
      });

      await expect(fetchPitcherProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        message: expect.stringContaining('__NEXT_DATA__'),
      });
    });

    it('should throw AppError when JSON is invalid', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><script id="__NEXT_DATA__">invalid json</script></html>',
      });

      await expect(fetchPitcherProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        message: expect.stringContaining('Invalid JSON'),
      });
    });

    it('should throw AppError when player data array not found', async () => {
      const badNextData = { props: { pageProps: {} } };
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => `<html><script id="__NEXT_DATA__">${JSON.stringify(badNextData)}</script></html>`,
      });

      await expect(fetchPitcherProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        message: expect.stringContaining('Player data array not found'),
      });
    });

    it('should throw AppError when insufficient pitchers', async () => {
      const mockPitchers = generateFangraphsPitchers(100); // Less than 300
      const mockHtml = createFangraphsHtml(mockPitchers);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      await expect(fetchPitcherProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        message: expect.stringContaining('Insufficient pitchers'),
      });
    });

    it('should handle missing fields with defaults', async () => {
      const mockPitchers = [
        {
          PlayerName: 'Test Pitcher',
          Team: '',
          // All other fields missing
        },
      ];
      // Add 349 more complete pitchers to meet minimum
      for (let i = 1; i < 350; i++) {
        mockPitchers.push({
          PlayerName: `Pitcher ${i}`,
          Team: 'NYY',
          IP: 150,
          W: 10,
          L: 5,
          SV: 0,
          K: 150,
          BB: 40,
          HR: 15,
          ERA: 3.50,
          WHIP: 1.15,
          FIP: 3.40,
        } as object);
      }
      const mockHtml = createFangraphsHtml(mockPitchers);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      const pitchers = await fetchPitcherProjections();
      const firstPitcher = pitchers[0];

      expect(firstPitcher.name).toBe('Test Pitcher');
      expect(firstPitcher.team).toBe(null);
      expect(firstPitcher.ip).toBe('0.0');
      expect(firstPitcher.w).toBe(0);
      expect(firstPitcher.l).toBe(0);
      expect(firstPitcher.sv).toBe(0);
      expect(firstPitcher.k).toBe(0);
      expect(firstPitcher.bb).toBe(0);
      expect(firstPitcher.hr).toBe(0);
      expect(firstPitcher.era).toBe('0.00');
      expect(firstPitcher.whip).toBe('0.00');
      expect(firstPitcher.fip).toBe('0.00');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchPitcherProjections()).rejects.toMatchObject({
        code: 'SCRAPE_FAILED',
        message: expect.stringContaining('Network error'),
      });
    });
  });
});
