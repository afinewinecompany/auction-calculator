import type { ScoringFormat } from '@shared/schema';

export interface ScoringPreset {
  id: string;
  name: string;
  platform: string;
  description: string;
  scoringFormat: ScoringFormat;
}

export const SCORING_PRESETS: ScoringPreset[] = [
  {
    id: 'espn-roto-5x5',
    name: 'ESPN Roto 5x5',
    platform: 'ESPN',
    description: 'Standard ESPN rotisserie scoring with 5 hitting and 5 pitching categories',
    scoringFormat: {
      type: 'roto',
      hittingCategories: ['R', 'HR', 'RBI', 'SB', 'AVG'],
      pitchingCategories: ['W', 'SV', 'K', 'ERA', 'WHIP'],
    },
  },
  {
    id: 'espn-h2h-cat',
    name: 'ESPN H2H Categories',
    platform: 'ESPN',
    description: 'Head-to-head categories format with standard ESPN categories',
    scoringFormat: {
      type: 'h2h-categories',
      hittingCategories: ['R', 'HR', 'RBI', 'SB', 'AVG', 'OPS'],
      pitchingCategories: ['W', 'SV', 'K', 'ERA', 'WHIP', 'K/BB'],
    },
  },
  {
    id: 'espn-h2h-points',
    name: 'ESPN H2H Points',
    platform: 'ESPN',
    description: 'ESPN default head-to-head points scoring',
    scoringFormat: {
      type: 'h2h-points',
      hittingPoints: {
        'Single': 1,
        'Double': 2,
        'Triple': 3,
        'Home Run': 5,
        'Run': 1,
        'RBI': 1,
        'Walk': 1,
        'Stolen Base': 1,
        'Caught Stealing': -1,
        'Strikeout': 0,
        'Hit By Pitch': 1,
      },
      pitchingPoints: {
        'Inning Pitched': 3,
        'Win': 5,
        'Loss': -5,
        'Save': 5,
        'Blown Save': -3,
        'Earned Run': -2,
        'Hit Allowed': -1,
        'Walk Allowed': -1,
        'Strikeout': 1,
        'Quality Start': 3,
      },
    },
  },
  {
    id: 'yahoo-roto-5x5',
    name: 'Yahoo Roto 5x5',
    platform: 'Yahoo',
    description: 'Standard Yahoo rotisserie scoring with 5x5 categories',
    scoringFormat: {
      type: 'roto',
      hittingCategories: ['R', 'HR', 'RBI', 'SB', 'AVG'],
      pitchingCategories: ['W', 'SV', 'K', 'ERA', 'WHIP'],
    },
  },
  {
    id: 'yahoo-h2h-cat',
    name: 'Yahoo H2H Categories',
    platform: 'Yahoo',
    description: 'Yahoo head-to-head categories with standard settings',
    scoringFormat: {
      type: 'h2h-categories',
      hittingCategories: ['R', 'HR', 'RBI', 'SB', 'AVG', 'OBP'],
      pitchingCategories: ['W', 'SV', 'K', 'ERA', 'WHIP', 'HLD'],
    },
  },
  {
    id: 'yahoo-h2h-points',
    name: 'Yahoo H2H Points',
    platform: 'Yahoo',
    description: 'Yahoo default head-to-head points scoring',
    scoringFormat: {
      type: 'h2h-points',
      hittingPoints: {
        'Single': 2.6,
        'Double': 5.2,
        'Triple': 7.8,
        'Home Run': 10.4,
        'Run': 1.9,
        'RBI': 1.9,
        'Walk': 2.6,
        'Stolen Base': 4.2,
        'Caught Stealing': -2.8,
        'Strikeout': -1,
        'Hit By Pitch': 2.6,
      },
      pitchingPoints: {
        'Inning Pitched': 2.25,
        'Win': 4,
        'Loss': -2,
        'Save': 5,
        'Blown Save': -3,
        'Earned Run': -4.6,
        'Hit Allowed': -0.6,
        'Walk Allowed': -0.6,
        'Strikeout': 1,
        'Quality Start': 2,
        'Complete Game': 5,
        'Shutout': 5,
      },
    },
  },
  {
    id: 'fantrax-roto-6x6',
    name: 'Fantrax Roto 6x6',
    platform: 'Fantrax',
    description: 'Fantrax rotisserie with OBP and quality starts',
    scoringFormat: {
      type: 'roto',
      hittingCategories: ['R', 'HR', 'RBI', 'SB', 'AVG', 'OBP'],
      pitchingCategories: ['W', 'SV', 'K', 'ERA', 'WHIP', 'QS'],
    },
  },
  {
    id: 'fantrax-h2h-cat',
    name: 'Fantrax H2H Categories',
    platform: 'Fantrax',
    description: 'Fantrax head-to-head categories default',
    scoringFormat: {
      type: 'h2h-categories',
      hittingCategories: ['R', 'HR', 'RBI', 'SB', 'OBP', 'SLG'],
      pitchingCategories: ['W', 'SV', 'HLD', 'K', 'ERA', 'WHIP'],
    },
  },
  {
    id: 'fantrax-h2h-points',
    name: 'Fantrax H2H Points',
    platform: 'Fantrax',
    description: 'Fantrax default head-to-head points scoring',
    scoringFormat: {
      type: 'h2h-points',
      hittingPoints: {
        'Single': 1,
        'Double': 2,
        'Triple': 3,
        'Home Run': 4,
        'Run': 1,
        'RBI': 1,
        'Walk': 1,
        'Stolen Base': 2,
        'Caught Stealing': -1,
        'Strikeout': -0.5,
        'Hit By Pitch': 1,
      },
      pitchingPoints: {
        'Inning Pitched': 3,
        'Win': 5,
        'Loss': -3,
        'Save': 5,
        'Hold': 3,
        'Blown Save': -3,
        'Earned Run': -2,
        'Hit Allowed': -1,
        'Walk Allowed': -1,
        'Strikeout': 1,
        'Quality Start': 3,
        'Complete Game': 3,
        'Shutout': 5,
        'No Hitter': 10,
      },
    },
  },
  {
    id: 'ottoneu-points',
    name: 'Ottoneu Points',
    platform: 'Ottoneu',
    description: 'Ottoneu-style points scoring with FanGraphs projections',
    scoringFormat: {
      type: 'h2h-points',
      hittingPoints: {
        'Single': 5.6,
        'Double': 5.6,
        'Triple': 5.6,
        'Home Run': 5.6,
        'Walk': 3,
        'Hit By Pitch': 3,
        'Stolen Base': 1.9,
        'Caught Stealing': -2.8,
        'Run': 0,
        'RBI': 0,
        'Strikeout': 0,
      },
      pitchingPoints: {
        'Inning Pitched': 7.4,
        'Strikeout': 2,
        'Win': 0,
        'Loss': 0,
        'Save': 0,
        'Hold': 0,
        'Hit Allowed': -2.6,
        'Walk Allowed': -3,
        'Hit By Pitch Allowed': -3,
        'Home Run Allowed': -12.3,
        'Earned Run': 0,
      },
    },
  },
];

export function getPresetById(id: string): ScoringPreset | undefined {
  return SCORING_PRESETS.find(preset => preset.id === id);
}

export function getPresetsByPlatform(platform: string): ScoringPreset[] {
  return SCORING_PRESETS.filter(preset => preset.platform === platform);
}
