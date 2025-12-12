import { describe, it, expect } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  scrapeMetadata,
  batterProjections,
  pitcherProjections,
} from './schema';
import type {
  NewScrapeMetadata,
  ScrapeMetadataRow,
  NewBatterProjection,
  BatterProjectionRow,
  NewPitcherProjection,
  PitcherProjectionRow,
} from './types/projections';

describe('Database Schema', () => {
  describe('scrapeMetadata table', () => {
    it('should have correct table name (snake_case)', () => {
      const tableName = getTableName(scrapeMetadata);
      expect(tableName).toBe('scrape_metadata');
    });

    it('should have all required columns', () => {
      const columns = Object.keys(scrapeMetadata);
      expect(columns).toContain('id');
      expect(columns).toContain('scrapeType');
      expect(columns).toContain('sourceUrl');
      expect(columns).toContain('projectionSystem');
      expect(columns).toContain('playerCount');
      expect(columns).toContain('status');
      expect(columns).toContain('errorMessage');
      expect(columns).toContain('startedAt');
      expect(columns).toContain('completedAt');
    });

    it('should have snake_case SQL column names', () => {
      expect(scrapeMetadata.scrapeType.name).toBe('scrape_type');
      expect(scrapeMetadata.sourceUrl.name).toBe('source_url');
      expect(scrapeMetadata.projectionSystem.name).toBe('projection_system');
      expect(scrapeMetadata.playerCount.name).toBe('player_count');
      expect(scrapeMetadata.errorMessage.name).toBe('error_message');
      expect(scrapeMetadata.startedAt.name).toBe('started_at');
      expect(scrapeMetadata.completedAt.name).toBe('completed_at');
    });

    it('should have id as primary key', () => {
      expect(scrapeMetadata.id.primary).toBe(true);
    });
  });

  describe('batterProjections table', () => {
    it('should have correct table name (snake_case)', () => {
      const tableName = getTableName(batterProjections);
      expect(tableName).toBe('batter_projections');
    });

    it('should have all required columns for batting stats', () => {
      const columns = Object.keys(batterProjections);
      // Core fields
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('team');
      expect(columns).toContain('positions');
      // Counting stats
      expect(columns).toContain('pa');
      expect(columns).toContain('ab');
      expect(columns).toContain('h');
      expect(columns).toContain('hr');
      expect(columns).toContain('r');
      expect(columns).toContain('rbi');
      expect(columns).toContain('sb');
      expect(columns).toContain('bb');
      expect(columns).toContain('so');
      // Rate stats
      expect(columns).toContain('avg');
      expect(columns).toContain('obp');
      expect(columns).toContain('slg');
      expect(columns).toContain('woba');
      expect(columns).toContain('wrcPlus');
      // Foreign key and timestamp
      expect(columns).toContain('scrapeId');
      expect(columns).toContain('createdAt');
    });

    it('should have snake_case SQL column names', () => {
      expect(batterProjections.scrapeId.name).toBe('scrape_id');
      expect(batterProjections.createdAt.name).toBe('created_at');
      expect(batterProjections.wrcPlus.name).toBe('wrc_plus');
    });

    it('should have foreign key to scrape_metadata', () => {
      // Check that scrapeId references scrapeMetadata
      const scrapeIdColumn = batterProjections.scrapeId;
      expect(scrapeIdColumn.notNull).toBe(true);
      // Verify foreign key exists using getTableConfig
      const tableConfig = getTableConfig(batterProjections);
      expect(tableConfig.foreignKeys.length).toBe(1);
    });

    it('should have onDelete CASCADE behavior', () => {
      // Verify the foreign key has onDelete: cascade
      const tableConfig = getTableConfig(batterProjections);
      expect(tableConfig.foreignKeys[0].onDelete).toBe('cascade');
    });
  });

  describe('pitcherProjections table', () => {
    it('should have correct table name (snake_case)', () => {
      const tableName = getTableName(pitcherProjections);
      expect(tableName).toBe('pitcher_projections');
    });

    it('should have all required columns for pitching stats', () => {
      const columns = Object.keys(pitcherProjections);
      // Core fields
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('team');
      // Pitching stats
      expect(columns).toContain('ip');
      expect(columns).toContain('w');
      expect(columns).toContain('l');
      expect(columns).toContain('sv');
      expect(columns).toContain('k');
      expect(columns).toContain('bb');
      expect(columns).toContain('hr');
      expect(columns).toContain('era');
      expect(columns).toContain('whip');
      expect(columns).toContain('fip');
      // Foreign key and timestamp
      expect(columns).toContain('scrapeId');
      expect(columns).toContain('createdAt');
    });

    it('should have snake_case SQL column names', () => {
      expect(pitcherProjections.scrapeId.name).toBe('scrape_id');
      expect(pitcherProjections.createdAt.name).toBe('created_at');
    });

    it('should have foreign key to scrape_metadata', () => {
      const scrapeIdColumn = pitcherProjections.scrapeId;
      expect(scrapeIdColumn.notNull).toBe(true);
      // Verify foreign key exists using getTableConfig
      const tableConfig = getTableConfig(pitcherProjections);
      expect(tableConfig.foreignKeys.length).toBe(1);
    });

    it('should have onDelete CASCADE behavior', () => {
      // Verify the foreign key has onDelete: cascade
      const tableConfig = getTableConfig(pitcherProjections);
      expect(tableConfig.foreignKeys[0].onDelete).toBe('cascade');
    });
  });

  describe('TypeScript types', () => {
    it('should allow valid NewScrapeMetadata', () => {
      // This test verifies TypeScript compilation - if types are wrong, this won't compile
      const newScrape: NewScrapeMetadata = {
        scrapeType: 'batters',
        sourceUrl: 'https://fangraphs.com/projections',
        projectionSystem: 'steamer',
        status: 'in_progress',
      };
      expect(newScrape.scrapeType).toBe('batters');
      expect(newScrape.sourceUrl).toBe('https://fangraphs.com/projections');
    });

    it('should allow valid NewBatterProjection', () => {
      const newBatter: NewBatterProjection = {
        name: 'Mike Trout',
        positions: 'OF',
        scrapeId: 1,
      };
      expect(newBatter.name).toBe('Mike Trout');
      expect(newBatter.scrapeId).toBe(1);
    });

    it('should allow valid NewPitcherProjection', () => {
      const newPitcher: NewPitcherProjection = {
        name: 'Shohei Ohtani',
        scrapeId: 1,
      };
      expect(newPitcher.name).toBe('Shohei Ohtani');
      expect(newPitcher.scrapeId).toBe(1);
    });

    it('should properly type ScrapeMetadataRow with id', () => {
      // Simulate a row returned from DB
      const row: ScrapeMetadataRow = {
        id: 1,
        scrapeType: 'batters',
        sourceUrl: 'https://fangraphs.com',
        projectionSystem: 'steamer',
        playerCount: 500,
        status: 'success',
        errorMessage: null,
        startedAt: new Date(),
        completedAt: new Date(),
      };
      expect(row.id).toBe(1);
      expect(row.status).toBe('success');
    });

    it('should properly type BatterProjectionRow with id', () => {
      const row: BatterProjectionRow = {
        id: 1,
        name: 'Mike Trout',
        team: 'LAA',
        positions: 'OF',
        pa: 600,
        ab: 500,
        h: 150,
        hr: 40,
        r: 100,
        rbi: 100,
        sb: 10,
        bb: 80,
        so: 120,
        avg: '0.300',
        obp: '0.400',
        slg: '0.600',
        woba: '0.420',
        wrcPlus: 180,
        scrapeId: 1,
        createdAt: new Date(),
      };
      expect(row.id).toBe(1);
      expect(row.name).toBe('Mike Trout');
    });

    it('should properly type PitcherProjectionRow with id', () => {
      const row: PitcherProjectionRow = {
        id: 1,
        name: 'Jacob deGrom',
        team: 'TEX',
        ip: '180.0',
        w: 15,
        l: 5,
        sv: 0,
        k: 230,
        bb: 30,
        hr: 15,
        era: '2.50',
        whip: '0.95',
        fip: '2.40',
        scrapeId: 1,
        createdAt: new Date(),
      };
      expect(row.id).toBe(1);
      expect(row.name).toBe('Jacob deGrom');
    });
  });
});
