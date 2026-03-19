import { v4 as uuidv4 } from 'uuid';
import { Grid, TileData, MathType, MathFamily, PowerUpType } from '../types';
import { MATH_FAMILIES } from '../constants';

export class GameService {
  static createInitialGrid(size: number, allowedTypes: MathType[]): Grid {
    let grid: Grid = Array(size).fill(null).map(() => Array(size).fill(null));
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let tile: TileData;
        do {
          tile = this.generateRandomTile(x, y, allowedTypes);
          grid[y][x] = tile;
        } while (this.hasMatchAt(grid, x, y));
      }
    }
    
    return grid;
  }

  static generateRandomTile(x: number, y: number, allowedTypes: MathType[]): TileData {
    const families = MATH_FAMILIES.filter(f => 
      f.expressions.some(e => allowedTypes.includes(e.type))
    );
    
    const family = families[Math.floor(Math.random() * families.length)];
    const expressions = family.expressions.filter(e => allowedTypes.includes(e.type));
    const expression = expressions[Math.floor(Math.random() * expressions.length)];
    
    // 5% chance for a power-up
    const powerUps: PowerUpType[] = ['ROW_CLEAR', 'COLUMN_CLEAR', 'BOMB'];
    const powerUp = Math.random() < 0.05 ? powerUps[Math.floor(Math.random() * powerUps.length)] : undefined;

    return {
      id: uuidv4(),
      value: family.targetValue,
      display: expression.display,
      mathType: expression.type,
      familyId: family.id,
      powerUp,
      isMatched: false,
      x,
      y
    };
  }

  static hasMatchAt(grid: Grid, x: number, y: number): boolean {
    const tile = grid[y][x];
    if (!tile) return false;
    const size = grid.length;

    // Horizontal check
    let hCount = 1;
    // Check left
    for (let i = x - 1; i >= 0 && grid[y][i]?.familyId === tile.familyId; i--) hCount++;
    // Check right
    for (let i = x + 1; i < size && grid[y][i]?.familyId === tile.familyId; i++) hCount++;
    if (hCount >= 3) return true;
    
    // Vertical check
    let vCount = 1;
    // Check up
    for (let i = y - 1; i >= 0 && grid[i][x]?.familyId === tile.familyId; i--) vCount++;
    // Check down
    for (let i = y + 1; i < size && grid[i][x]?.familyId === tile.familyId; i++) vCount++;
    if (vCount >= 3) return true;

    return false;
  }

  static findMatches(grid: Grid): { x: number, y: number }[] {
    const matches: Set<string> = new Set();
    const size = grid.length;

    // Horizontal
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size - 2; x++) {
        const t1 = grid[y][x];
        const t2 = grid[y][x+1];
        const t3 = grid[y][x+2];
        if (t1 && t2 && t3 && t1.familyId === t2.familyId && t2.familyId === t3.familyId) {
          matches.add(`${x},${y}`);
          matches.add(`${x+1},${y}`);
          matches.add(`${x+2},${y}`);
        }
      }
    }

    // Vertical
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size - 2; y++) {
        const t1 = grid[y][x];
        const t2 = grid[y+1][x];
        const t3 = grid[y+2][x];
        if (t1 && t2 && t3 && t1.familyId === t2.familyId && t2.familyId === t3.familyId) {
          matches.add(`${x},${y}`);
          matches.add(`${x},${y+1}`);
          matches.add(`${x},${y+2}`);
        }
      }
    }

    return Array.from(matches).map(s => {
      const [x, y] = s.split(',').map(Number);
      return { x, y };
    });
  }

  static applyPowerUps(grid: Grid, matchedCoords: { x: number, y: number }[]): { x: number, y: number }[] {
    const allAffected = new Set<string>();
    const size = grid.length;

    const addCoord = (x: number, y: number) => allAffected.add(`${x},${y}`);

    matchedCoords.forEach(({ x, y }) => {
      addCoord(x, y);
      const tile = grid[y][x];
      if (!tile?.powerUp) return;

      if (tile.powerUp === 'ROW_CLEAR') {
        for (let i = 0; i < size; i++) addCoord(i, y);
      } else if (tile.powerUp === 'COLUMN_CLEAR') {
        for (let i = 0; i < size; i++) addCoord(x, i);
      } else if (tile.powerUp === 'BOMB') {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) addCoord(nx, ny);
          }
        }
      }
    });

    return Array.from(allAffected).map(s => {
      const [x, y] = s.split(',').map(Number);
      return { x, y };
    });
  }

  static dropTiles(grid: Grid): { newGrid: Grid } {
    const size = grid.length;
    let newGrid = grid.map(row => [...row]);

    for (let x = 0; x < size; x++) {
      let emptySpot = size - 1;
      for (let y = size - 1; y >= 0; y--) {
        if (newGrid[y][x] !== null) {
          const tile = newGrid[y][x]!;
          newGrid[y][x] = null;
          newGrid[emptySpot][x] = { ...tile, x, y: emptySpot };
          emptySpot--;
        }
      }
    }

    return { newGrid };
  }

  static fillTop(grid: Grid, allowedTypes: MathType[]): { newGrid: Grid } {
    const size = grid.length;
    let newGrid = grid.map(row => [...row]);

    // Fill from top to bottom, left to right
    // This allows hasMatchAt (which checks left and up) to effectively prevent matches
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (newGrid[y][x] === null) {
          let tile: TileData;
          let attempts = 0;
          do {
            tile = this.generateRandomTile(x, y, allowedTypes);
            newGrid[y][x] = tile;
            attempts++;
          } while (this.hasMatchAt(newGrid, x, y) && attempts < 20);
        }
      }
    }

    return { newGrid };
  }

  static refillGrid(grid: Grid, allowedTypes: MathType[]): { newGrid: Grid, score: number } {
    const size = grid.length;
    let newGrid = grid.map(row => [...row]);
    let score = 0;

    // 1. Mark matched tiles as null
    const matches = this.findMatches(newGrid);
    if (matches.length === 0) return { newGrid, score: 0 };

    const affected = this.applyPowerUps(newGrid, matches);
    score = affected.length * 10;

    affected.forEach(({ x, y }) => {
      newGrid[y][x] = null;
    });

    // 2. Drop tiles
    const { newGrid: droppedGrid } = this.dropTiles(newGrid);
    newGrid = droppedGrid;

    // 3. Fill new tiles from top
    const { newGrid: refilledGrid } = this.fillTop(newGrid, allowedTypes);
    newGrid = refilledGrid;

    return { newGrid, score };
  }

  static areAdjacent(p1: { x: number, y: number }, p2: { x: number, y: number }): boolean {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }
}
