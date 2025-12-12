/**
 * Unit tests for projections database service.
 * Tests all 8 service functions for database operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

// Create chainable mock functions that return the chain object
function createChainableMock() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  // Create all the chain methods
  chain.insert = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve([]));
  chain.select = vi.fn(() => chain);
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve([]));
  chain.update = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);

  // Make the chain awaitable (for cases where where() is the terminal)
  (chain as Record<string, unknown>).then = (resolve: (val: unknown[]) => void) => resolve([]);

  return chain;
}

let mockChain: ReturnType<typeof createChainableMock>;

vi.mock('../../db', () => ({
  getDb: vi.fn(() => mockChain),
}));

// Mock logger
const mockLog = vi.fn();
vi.mock('../../lib/logger', () => ({
  log: (...args: unknown[]) => mockLog(...args),
}));

// Import after mocks are set up
import {
  createScrapeRecord,
  completeScrapeRecord,
  failScrapeRecord,
  insertBatterProjections,
  insertPitcherProjections,
  getLatestBatterProjections,
  getLatestPitcherProjections,
  getLatestScrapeMetadata,
} from './index';

describe('projections service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createChainableMock();
  });

  describe('createScrapeRecord', () => {
    const mockScrapeRecord = {
      id: 1,
      scrapeType: 'batters',
      sourceUrl: 'https://fangraphs.com/projections',
      projectionSystem: 'steamer',
      playerCount: null,
      status: 'in_progress',
      errorMessage: null,
      startedAt: new Date('2025-01-15T04:00:00Z'),
      completedAt: null,
    };

    it('should create a scrape record with in_progress status', async () => {
      mockChain.returning = vi.fn(() => Promise.resolve([mockScrapeRecord]));

      const result = await createScrapeRecord('batters', 'https://fangraphs.com/projections');

      expect(result.status).toBe('in_progress');
      expect(result.scrapeType).toBe('batters');
      expect(result.projectionSystem).toBe('steamer');
      expect(result.id).toBe(1);
    });

    it('should insert with correct values', async () => {
      mockChain.returning = vi.fn(() => Promise.resolve([mockScrapeRecord]));

      await createScrapeRecord('pitchers', 'https://fangraphs.com/pitchers');

      expect(mockChain.insert).toHaveBeenCalled();
      expect(mockChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          scrapeType: 'pitchers',
          sourceUrl: 'https://fangraphs.com/pitchers',
          projectionSystem: 'steamer',
          status: 'in_progress',
        })
      );
    });

    it('should throw AppError on database failure', async () => {
      mockChain.returning = vi.fn(() => Promise.reject(new Error('Database connection failed')));

      await expect(createScrapeRecord('batters', 'https://example.com'))
        .rejects.toThrow(AppError);
    });
  });

  describe('completeScrapeRecord', () => {
    it('should update scrape record with success status', async () => {
      await completeScrapeRecord(1, 523);

      expect(mockChain.update).toHaveBeenCalled();
      expect(mockChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          playerCount: 523,
        })
      );
    });

    it('should set completedAt timestamp', async () => {
      await completeScrapeRecord(1, 100);

      expect(mockChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: expect.any(Date),
        })
      );
    });

    it('should throw AppError on database failure', async () => {
      // Override where to reject
      mockChain.where = vi.fn(() => Promise.reject(new Error('Update failed')));

      await expect(completeScrapeRecord(1, 100))
        .rejects.toThrow(AppError);
    });
  });

  describe('failScrapeRecord', () => {
    it('should update scrape record with failed status', async () => {
      await failScrapeRecord(1, 'Connection timeout');

      expect(mockChain.update).toHaveBeenCalled();
      expect(mockChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'Connection timeout',
        })
      );
    });

    it('should set completedAt timestamp', async () => {
      await failScrapeRecord(1, 'Error');

      expect(mockChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: expect.any(Date),
        })
      );
    });

    it('should throw AppError on database failure', async () => {
      mockChain.where = vi.fn(() => Promise.reject(new Error('Update failed')));

      await expect(failScrapeRecord(1, 'Error'))
        .rejects.toThrow(AppError);
    });
  });

  describe('insertBatterProjections', () => {
    const mockBatters = [
      { name: 'Mike Trout', team: 'LAA', positions: 'CF', pa: 600, ab: 500, h: 150, hr: 40, r: 100, rbi: 90, sb: 10, bb: 80, so: 120, avg: '0.300', obp: '0.400', slg: '0.600', woba: '0.400', wrcPlus: 160 },
      { name: 'Shohei Ohtani', team: 'LAD', positions: 'DH', pa: 650, ab: 550, h: 170, hr: 50, r: 120, rbi: 100, sb: 20, bb: 90, so: 140, avg: '0.309', obp: '0.410', slg: '0.650', woba: '0.420', wrcPlus: 175 },
    ];

    it('should bulk insert batter projections', async () => {
      await insertBatterProjections(1, mockBatters);

      expect(mockChain.insert).toHaveBeenCalled();
      expect(mockChain.values).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Mike Trout', scrapeId: 1 }),
          expect.objectContaining({ name: 'Shohei Ohtani', scrapeId: 1 }),
        ])
      );
    });

    it('should log db_write_complete event on success', async () => {
      await insertBatterProjections(1, mockBatters);

      expect(mockLog).toHaveBeenCalledWith(
        'info',
        'db_write_complete',
        expect.objectContaining({
          table: 'batter_projections',
          count: 2,
          scrapeId: 1,
        })
      );
    });

    it('should throw AppError on database failure', async () => {
      mockChain.values = vi.fn(() => Promise.reject(new Error('Insert failed')));

      await expect(insertBatterProjections(1, mockBatters))
        .rejects.toThrow(AppError);
    });
  });

  describe('insertPitcherProjections', () => {
    const mockPitchers = [
      { name: 'Gerrit Cole', team: 'NYY', ip: '200.0', w: 15, l: 5, sv: 0, k: 250, bb: 40, hr: 20, era: '2.80', whip: '1.00', fip: '2.90' },
      { name: 'Jacob deGrom', team: 'TEX', ip: '180.0', w: 12, l: 4, sv: 0, k: 220, bb: 30, hr: 15, era: '2.50', whip: '0.95', fip: '2.60' },
    ];

    it('should bulk insert pitcher projections', async () => {
      await insertPitcherProjections(1, mockPitchers);

      expect(mockChain.insert).toHaveBeenCalled();
      expect(mockChain.values).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Gerrit Cole', scrapeId: 1 }),
          expect.objectContaining({ name: 'Jacob deGrom', scrapeId: 1 }),
        ])
      );
    });

    it('should log db_write_complete event on success', async () => {
      await insertPitcherProjections(1, mockPitchers);

      expect(mockLog).toHaveBeenCalledWith(
        'info',
        'db_write_complete',
        expect.objectContaining({
          table: 'pitcher_projections',
          count: 2,
          scrapeId: 1,
        })
      );
    });

    it('should throw AppError on database failure', async () => {
      mockChain.values = vi.fn(() => Promise.reject(new Error('Insert failed')));

      await expect(insertPitcherProjections(1, mockPitchers))
        .rejects.toThrow(AppError);
    });
  });

  describe('getLatestBatterProjections', () => {
    const mockScrape = {
      id: 5,
      scrapeType: 'batters',
      status: 'success',
      completedAt: new Date('2025-01-15T04:00:00Z'),
      playerCount: 523,
    };

    const mockBatters = [
      { id: 1, name: 'Mike Trout', team: 'LAA', positions: 'CF', scrapeId: 5 },
      { id: 2, name: 'Shohei Ohtani', team: 'LAD', positions: 'DH', scrapeId: 5 },
    ];

    it('should return batters from most recent successful scrape', async () => {
      // First query returns scrape metadata, second returns batters
      let callCount = 0;
      mockChain.limit = vi.fn(() => {
        callCount++;
        return callCount === 1 ? Promise.resolve([mockScrape]) : Promise.resolve([]);
      });
      mockChain.where = vi.fn(() => {
        // Return chain for orderBy, but also make it awaitable for the batters query
        const result = {
          ...mockChain,
          then: (resolve: (val: unknown[]) => void) => resolve(mockBatters),
        };
        return result;
      });

      const result = await getLatestBatterProjections();

      expect(result).not.toBeNull();
      expect(result!.data).toHaveLength(2);
      expect(result!.meta.count).toBe(2);
    });

    it('should include lastUpdated from scrape metadata', async () => {
      mockChain.limit = vi.fn(() => Promise.resolve([mockScrape]));
      mockChain.where = vi.fn(() => ({
        ...mockChain,
        then: (resolve: (val: unknown[]) => void) => resolve(mockBatters),
      }));

      const result = await getLatestBatterProjections();

      expect(result!.meta.lastUpdated).toEqual(mockScrape.completedAt);
    });

    it('should return null if no successful scrape exists', async () => {
      mockChain.limit = vi.fn(() => Promise.resolve([]));

      const result = await getLatestBatterProjections();

      expect(result).toBeNull();
    });

    it('should throw AppError on database failure', async () => {
      mockChain.limit = vi.fn(() => Promise.reject(new Error('Query failed')));

      await expect(getLatestBatterProjections())
        .rejects.toThrow(AppError);
    });
  });

  describe('getLatestPitcherProjections', () => {
    const mockScrape = {
      id: 6,
      scrapeType: 'pitchers',
      status: 'success',
      completedAt: new Date('2025-01-15T04:02:00Z'),
      playerCount: 312,
    };

    const mockPitchers = [
      { id: 1, name: 'Gerrit Cole', team: 'NYY', scrapeId: 6 },
      { id: 2, name: 'Jacob deGrom', team: 'TEX', scrapeId: 6 },
    ];

    it('should return pitchers from most recent successful scrape', async () => {
      mockChain.limit = vi.fn(() => Promise.resolve([mockScrape]));
      mockChain.where = vi.fn(() => ({
        ...mockChain,
        then: (resolve: (val: unknown[]) => void) => resolve(mockPitchers),
      }));

      const result = await getLatestPitcherProjections();

      expect(result).not.toBeNull();
      expect(result!.data).toHaveLength(2);
      expect(result!.meta.count).toBe(2);
    });

    it('should include lastUpdated from scrape metadata', async () => {
      mockChain.limit = vi.fn(() => Promise.resolve([mockScrape]));
      mockChain.where = vi.fn(() => ({
        ...mockChain,
        then: (resolve: (val: unknown[]) => void) => resolve(mockPitchers),
      }));

      const result = await getLatestPitcherProjections();

      expect(result!.meta.lastUpdated).toEqual(mockScrape.completedAt);
    });

    it('should return null if no successful scrape exists', async () => {
      mockChain.limit = vi.fn(() => Promise.resolve([]));

      const result = await getLatestPitcherProjections();

      expect(result).toBeNull();
    });

    it('should throw AppError on database failure', async () => {
      mockChain.limit = vi.fn(() => Promise.reject(new Error('Query failed')));

      await expect(getLatestPitcherProjections())
        .rejects.toThrow(AppError);
    });
  });

  describe('getLatestScrapeMetadata', () => {
    const mockScrape = {
      id: 5,
      scrapeType: 'batters',
      sourceUrl: 'https://fangraphs.com/projections',
      projectionSystem: 'steamer',
      playerCount: 523,
      status: 'success',
      errorMessage: null,
      startedAt: new Date('2025-01-15T03:58:00Z'),
      completedAt: new Date('2025-01-15T04:00:00Z'),
    };

    it('should return most recent successful scrape for type', async () => {
      mockChain.limit = vi.fn(() => Promise.resolve([mockScrape]));

      const result = await getLatestScrapeMetadata('batters');

      expect(result).not.toBeNull();
      expect(result!.id).toBe(5);
      expect(result!.scrapeType).toBe('batters');
      expect(result!.status).toBe('success');
    });

    it('should return null if no successful scrape exists', async () => {
      mockChain.limit = vi.fn(() => Promise.resolve([]));

      const result = await getLatestScrapeMetadata('pitchers');

      expect(result).toBeNull();
    });

    it('should throw AppError on database failure', async () => {
      mockChain.limit = vi.fn(() => Promise.reject(new Error('Query failed')));

      await expect(getLatestScrapeMetadata('batters'))
        .rejects.toThrow(AppError);
    });
  });
});
