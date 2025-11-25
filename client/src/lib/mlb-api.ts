const MLB_STATS_API_BASE = 'https://statsapi.mlb.com/api/v1';

interface MlbPerson {
  id: number;
  fullName: string;
  primaryPosition?: {
    code: string;
    name: string;
    type: string;
    abbreviation: string;
  };
}

interface MlbApiResponse {
  people?: MlbPerson[];
}

const POSITION_MAP: Record<string, string> = {
  '1': 'P',
  '2': 'C',
  '3': '1B',
  '4': '2B',
  '5': '3B',
  '6': 'SS',
  '7': 'OF',
  '8': 'OF',
  '9': 'OF',
  '10': 'DH',
  'P': 'P',
  'C': 'C',
  'D': 'DH',
  'O': 'OF',
  'Y': 'TWP',
};

export async function fetchPlayerPosition(mlbamId: string): Promise<string[]> {
  try {
    const response = await fetch(`${MLB_STATS_API_BASE}/people/${mlbamId}`);
    if (!response.ok) {
      console.warn(`Failed to fetch player ${mlbamId}: ${response.status}`);
      return ['UTIL'];
    }
    
    const data: MlbApiResponse = await response.json();
    const person = data.people?.[0];
    
    if (!person?.primaryPosition) {
      return ['UTIL'];
    }
    
    const posCode = person.primaryPosition.code;
    const posAbbrev = person.primaryPosition.abbreviation;
    
    if (posAbbrev && ['C', '1B', '2B', '3B', 'SS', 'SP', 'RP', 'P', 'OF', 'DH'].includes(posAbbrev)) {
      if (posAbbrev === 'P') {
        return ['SP', 'RP'];
      }
      return [posAbbrev];
    }
    
    const mappedPos = POSITION_MAP[posCode];
    if (mappedPos) {
      return [mappedPos];
    }
    
    return ['UTIL'];
  } catch (error) {
    console.error(`Error fetching position for player ${mlbamId}:`, error);
    return ['UTIL'];
  }
}

export async function fetchMultiplePlayerPositions(
  mlbamIds: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();
  const batchSize = 10;
  const delay = 100;
  
  for (let i = 0; i < mlbamIds.length; i += batchSize) {
    const batch = mlbamIds.slice(i, i + batchSize);
    
    const promises = batch.map(async (id) => {
      const positions = await fetchPlayerPosition(id);
      return { id, positions };
    });
    
    const batchResults = await Promise.all(promises);
    
    for (const { id, positions } of batchResults) {
      results.set(id, positions);
    }
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, mlbamIds.length), mlbamIds.length);
    }
    
    if (i + batchSize < mlbamIds.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}
