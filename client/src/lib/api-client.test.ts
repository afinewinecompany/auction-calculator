import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBatterProjections, fetchPitcherProjections } from './api-client';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('api-client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('module existence', () => {
    it('should export fetchBatterProjections function', async () => {
      const apiClient = await import('./api-client');
      expect(typeof apiClient.fetchBatterProjections).toBe('function');
    });

    it('should export fetchPitcherProjections function', async () => {
      const apiClient = await import('./api-client');
      expect(typeof apiClient.fetchPitcherProjections).toBe('function');
    });
  });

  describe('fetchBatterProjections', () => {
    it('should call the correct API endpoint with default system', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            meta: { lastUpdated: '2024-01-15T04:00:00Z', count: 0 },
          }),
      });

      await fetchBatterProjections();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/projections/batters?system=steamer');
    });

    it('should call the correct API endpoint with specified system', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            meta: { lastUpdated: '2024-01-15T04:00:00Z', count: 0 },
          }),
      });

      await fetchBatterProjections('ja_projections');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/projections/batters?system=ja_projections');
    });

    it('should fetch and transform batter projections correctly', async () => {
      const mockBatter = {
        name: 'Aaron Judge',
        team: 'NYY',
        positions: 'OF',
        pa: 600,
        ab: 520,
        h: 150,
        hr: 45,
        r: 100,
        rbi: 110,
        sb: 5,
        bb: 75,
        so: 150,
        avg: '0.288',
        obp: '0.380',
        slg: '0.580',
        woba: '0.410',
        wrcPlus: 165,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [mockBatter],
            meta: { lastUpdated: '2024-01-15T04:00:00Z', count: 1 },
          }),
      });

      const result = await fetchBatterProjections();

      expect(result.projections).toHaveLength(1);
      expect(result.projections[0]).toEqual({
        name: 'Aaron Judge',
        team: 'NYY',
        positions: ['OF'],
        stats: {
          PA: 600,
          AB: 520,
          H: 150,
          HR: 45,
          R: 100,
          RBI: 110,
          SB: 5,
          BB: 75,
          SO: 150,
          AVG: 0.288,
          OBP: 0.38,
          SLG: 0.58,
          wOBA: 0.41,
          'wRC+': 165,
        },
      });
      expect(result.lastUpdated).toBe('2024-01-15T04:00:00Z');
      expect(result.count).toBe(1);
    });

    it('should parse multiple positions separated by comma', async () => {
      const mockBatter = {
        name: 'Test Player',
        team: 'NYY',
        positions: '1B,DH',
        pa: 100,
        ab: 90,
        h: 30,
        hr: 10,
        r: 20,
        rbi: 25,
        sb: 0,
        bb: 10,
        so: 30,
        avg: '0.333',
        obp: '0.400',
        slg: '0.600',
        woba: '0.400',
        wrcPlus: 150,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [mockBatter],
            meta: { lastUpdated: '2024-01-15T04:00:00Z', count: 1 },
          }),
      });

      const result = await fetchBatterProjections();

      expect(result.projections[0].positions).toEqual(['1B', 'DH']);
    });

    it('should parse multiple positions separated by slash', async () => {
      const mockBatter = {
        name: 'Test Player',
        team: 'NYY',
        positions: 'SS/2B',
        pa: 100,
        ab: 90,
        h: 30,
        hr: 5,
        r: 20,
        rbi: 20,
        sb: 10,
        bb: 10,
        so: 20,
        avg: '0.333',
        obp: '0.400',
        slg: '0.500',
        woba: '0.380',
        wrcPlus: 140,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [mockBatter],
            meta: { lastUpdated: '2024-01-15T04:00:00Z', count: 1 },
          }),
      });

      const result = await fetchBatterProjections();

      expect(result.projections[0].positions).toEqual(['SS', '2B']);
    });

    it('should handle null team as undefined', async () => {
      const mockBatter = {
        name: 'Test Player',
        team: null,
        positions: 'OF',
        pa: 100,
        ab: 90,
        h: 30,
        hr: 10,
        r: 20,
        rbi: 25,
        sb: 0,
        bb: 10,
        so: 30,
        avg: '0.333',
        obp: '0.400',
        slg: '0.600',
        woba: '0.400',
        wrcPlus: 150,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [mockBatter],
            meta: { lastUpdated: '2024-01-15T04:00:00Z', count: 1 },
          }),
      });

      const result = await fetchBatterProjections();

      expect(result.projections[0].team).toBeUndefined();
    });

    it('should throw descriptive error on API failure with error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () =>
          Promise.resolve({
            error: { code: 'NO_PROJECTION_DATA', message: 'No batter projection data available' },
          }),
      });

      await expect(fetchBatterProjections()).rejects.toThrow('No batter projection data available');
    });

    it('should throw fallback error message when API error has no message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      await expect(fetchBatterProjections()).rejects.toThrow(
        'Failed to fetch batter projections (500)'
      );
    });

    it('should throw fallback error when JSON parsing fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(fetchBatterProjections()).rejects.toThrow(
        'Failed to fetch batter projections (502)'
      );
    });
  });

  describe('fetchPitcherProjections', () => {
    it('should call the correct API endpoint with default system', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            meta: { lastUpdated: '2024-01-15T04:00:00Z', count: 0 },
          }),
      });

      await fetchPitcherProjections();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/projections/pitchers?system=steamer');
    });

    it('should call the correct API endpoint with specified system', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            meta: { lastUpdated: '2024-01-15T04:00:00Z', count: 0 },
          }),
      });

      await fetchPitcherProjections('ja_projections');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/projections/pitchers?system=ja_projections');
    });

    it('should fetch and transform pitcher projections correctly', async () => {
      const mockPitcher = {
        name: 'Gerrit Cole',
        team: 'NYY',
        ip: '200.0',
        w: 15,
        l: 5,
        sv: 0,
        k: 250,
        bb: 50,
        hr: 20,
        era: '2.75',
        whip: '1.05',
        fip: '2.90',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [mockPitcher],
            meta: { lastUpdated: '2024-01-15T04:00:00Z', count: 1 },
          }),
      });

      const result = await fetchPitcherProjections();

      expect(result.projections).toHaveLength(1);
      expect(result.projections[0]).toEqual({
        name: 'Gerrit Cole',
        team: 'NYY',
        positions: ['P'],
        stats: {
          IP: 200.0,
          W: 15,
          L: 5,
          SV: 0,
          K: 250,
          BB: 50,
          HR: 20,
          ERA: 2.75,
          WHIP: 1.05,
          FIP: 2.9,
        },
      });
      expect(result.lastUpdated).toBe('2024-01-15T04:00:00Z');
      expect(result.count).toBe(1);
    });

    it('should assign P position to all pitchers', async () => {
      const mockPitcher = {
        name: 'Test Pitcher',
        team: 'BOS',
        ip: '60.0',
        w: 3,
        l: 2,
        sv: 25,
        k: 70,
        bb: 15,
        hr: 5,
        era: '3.00',
        whip: '1.10',
        fip: '3.20',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [mockPitcher],
            meta: { lastUpdated: '2024-01-15T04:00:00Z', count: 1 },
          }),
      });

      const result = await fetchPitcherProjections();

      expect(result.projections[0].positions).toEqual(['P']);
    });

    it('should handle null team as undefined', async () => {
      const mockPitcher = {
        name: 'Test Pitcher',
        team: null,
        ip: '60.0',
        w: 3,
        l: 2,
        sv: 25,
        k: 70,
        bb: 15,
        hr: 5,
        era: '3.00',
        whip: '1.10',
        fip: '3.20',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [mockPitcher],
            meta: { lastUpdated: '2024-01-15T04:00:00Z', count: 1 },
          }),
      });

      const result = await fetchPitcherProjections();

      expect(result.projections[0].team).toBeUndefined();
    });

    it('should throw descriptive error on API failure with error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () =>
          Promise.resolve({
            error: {
              code: 'NO_PROJECTION_DATA',
              message: 'No pitcher projection data available',
            },
          }),
      });

      await expect(fetchPitcherProjections()).rejects.toThrow(
        'No pitcher projection data available'
      );
    });

    it('should throw fallback error message when API error has no message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      await expect(fetchPitcherProjections()).rejects.toThrow(
        'Failed to fetch pitcher projections (500)'
      );
    });

    it('should throw fallback error when JSON parsing fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(fetchPitcherProjections()).rejects.toThrow(
        'Failed to fetch pitcher projections (502)'
      );
    });
  });
});
