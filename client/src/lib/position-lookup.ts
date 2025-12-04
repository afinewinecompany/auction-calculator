import Papa from 'papaparse';
import positionCsvUrl from '@assets/mlb_player_positions.csv?url';

interface PlayerPositionRecord {
  mlbamId: string;
  name: string;
  stdPos: string;
  yahooPos: string;
}

let positionCache: Map<string, string[]> | null = null;
let loadingPromise: Promise<Map<string, string[]>> | null = null;

function parsePositionString(posStr: string): string[] {
  if (!posStr || posStr.trim() === '') return ['UTIL'];
  
  const positions = posStr
    .split(/[,/]/)
    .map(p => p.trim())
    .filter(p => p.length > 0 && p !== 'P');
  
  if (positions.length === 0) {
    if (posStr.includes('P')) {
      return ['SP', 'RP'];
    }
    return ['UTIL'];
  }
  
  return positions;
}

async function loadPositionData(): Promise<Map<string, string[]>> {
  if (positionCache) {
    return positionCache;
  }
  
  if (loadingPromise) {
    return loadingPromise;
  }
  
  loadingPromise = new Promise<Map<string, string[]>>((resolve, reject) => {
    fetch(positionCsvUrl)
      .then(response => response.text())
      .then(csvText => {
        Papa.parse<string[]>(csvText, {
          complete: (results) => {
            const map = new Map<string, string[]>();
            
            if (results.data.length < 2) {
              console.warn('Position CSV has no data rows');
              positionCache = map;
              resolve(map);
              return;
            }
            
            const headers = results.data[0];
            const mlbamIdIndex = headers.findIndex(h => 
              h.toLowerCase() === 'mlbamid' || h.toLowerCase() === 'mlbam_id'
            );
            const stdPosIndex = headers.findIndex(h => 
              h.toLowerCase() === 'std_pos' || h.toLowerCase() === 'stdpos'
            );
            const yahooPosIndex = headers.findIndex(h => 
              h.toLowerCase() === 'yahoo_pos' || h.toLowerCase() === 'yahoopos'
            );
            
            if (mlbamIdIndex === -1) {
              console.warn('Could not find MLBAMID column in position CSV');
              positionCache = map;
              resolve(map);
              return;
            }
            
            const posIndex = yahooPosIndex !== -1 ? yahooPosIndex : stdPosIndex;
            
            for (let i = 1; i < results.data.length; i++) {
              const row = results.data[i];
              const mlbamId = row[mlbamIdIndex]?.trim();
              const posStr = posIndex !== -1 ? row[posIndex]?.trim() : '';
              
              if (mlbamId && mlbamId.length > 0) {
                const positions = parsePositionString(posStr);
                map.set(mlbamId, positions);
              }
            }
            
            console.log(`Loaded ${map.size} player positions from CSV`);
            positionCache = map;
            resolve(map);
          },
          error: (error: Error) => {
            console.error('Failed to parse position CSV:', error);
            positionCache = new Map();
            resolve(positionCache);
          },
        });
      })
      .catch(error => {
        console.error('Failed to fetch position CSV:', error);
        positionCache = new Map();
        resolve(positionCache);
      });
  });
  
  return loadingPromise;
}

export async function lookupPlayerPositions(
  mlbamIds: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, string[]>> {
  const positionData = await loadPositionData();
  const results = new Map<string, string[]>();
  
  for (let i = 0; i < mlbamIds.length; i++) {
    const id = mlbamIds[i];
    const positions = positionData.get(id) || ['UTIL'];
    results.set(id, positions);
    
    if (onProgress && i % 100 === 0) {
      onProgress(i + 1, mlbamIds.length);
    }
  }
  
  if (onProgress) {
    onProgress(mlbamIds.length, mlbamIds.length);
  }
  
  return results;
}

export async function getPlayerPosition(mlbamId: string): Promise<string[]> {
  const positionData = await loadPositionData();
  return positionData.get(mlbamId) || ['UTIL'];
}

export function clearPositionCache(): void {
  positionCache = null;
  loadingPromise = null;
}
