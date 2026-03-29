/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingConfig, BuildingType, TileData, Grid, Challenge } from './types';

// Map Settings
export const GRID_SIZE = 15;

// Game Settings
export const TICK_RATE_MS = 2000;
export const INITIAL_MONEY = 2000;
export const INITIAL_FUEL = 100;

export const TUTORIAL_STEPS = [
  {
    id: 1,
    text: "Welcome to Optistock Pro Academy. Your first lesson is warehouse layout. Place a Floor tile to create a safe driving surface.",
    target: BuildingType.Floor,
    count: 1
  },
  {
    id: 2,
    text: "Excellent. Now, we need an entry point for goods. Place a Loading Bay where trucks will deliver inventory.",
    target: BuildingType.LoadingBay,
    count: 1
  },
  {
    id: 3,
    text: "Goods need storage. Heavy Racks are standard for palletized inventory. Place one near the Loading Bay.",
    target: BuildingType.HeavyRack,
    count: 1
  },
  {
    id: 4,
    text: "You'll need equipment to move these goods. Place a Forklift Station to deploy your vehicle.",
    target: BuildingType.ForkliftStation,
    count: 1
  },
  {
    id: 5,
    text: "Design phase complete. Switch to SHIFT mode to begin operation. Use WASD to drive, SPACE to pick/drop, and Q/E to adjust fork height.",
    target: null,
    count: 0
  }
];

export const getPrebuiltGrid = (): TileData[][] => {
  const grid: TileData[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      let type = BuildingType.Floor;
      if (x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) type = BuildingType.None;
      // Level 1: Very simple. 1 loading bay, 1 small rack.
      if (y === 1 && x === 7) type = BuildingType.LoadingBay;
      if (y >= 5 && y <= 7 && x === 7) type = BuildingType.HeavyRack;
      if (x === 7 && y === 10) type = BuildingType.ForkliftStation;
      row.push({ x, y, buildingType: type, pallets: [false, false, false] });
    }
    grid.push(row);
  }
  return grid;
};

export const getPrebuiltGrid2 = (): TileData[][] => {
  const grid: TileData[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      let type = BuildingType.Floor;
      if (x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) type = BuildingType.None;
      // Level 2: 2 loading bays, 2 racks
      if (y === 1 && (x === 4 || x === 10)) type = BuildingType.LoadingBay;
      if (y >= 5 && y <= 9 && (x === 4 || x === 10)) type = BuildingType.HeavyRack;
      if (x === 7 && y === 12) type = BuildingType.ForkliftStation;
      row.push({ x, y, buildingType: type, pallets: [false, false, false] });
    }
    grid.push(row);
  }
  return grid;
};

export const getInwardTile = (x: number, y: number, gridSize: number) => {
  if (y === 1) return { x, y: 2 };
  if (y === gridSize - 2) return { x, y: gridSize - 3 };
  if (x === 1) return { x: 2, y };
  if (x === gridSize - 2) return { x: gridSize - 3, y };
  return { x, y: y + 1 };
};

export const getBayRotation = (x: number, y: number, gridSize: number) => {
  if (y === 1) return 0;
  if (y === gridSize - 2) return Math.PI;
  if (x === 1) return -Math.PI / 2;
  if (x === gridSize - 2) return Math.PI / 2;
  return 0;
};

export const CHALLENGES: Challenge[] = [
  {
    id: 'slot1_basic',
    slotId: 1,
    title: 'Level 1: Basic Operations',
    description: 'Receive 1 pallet from the Receiving Bay and dispatch it via the Dispatch Bay.',
    targetPallets: 1,
    timeLimit: 120,
    baseScore: 1000
  },
  {
    id: 'slot2_density',
    slotId: 2,
    title: 'Level 2: Dual Bays',
    description: 'Manage incoming pallets and dispatch 3 pallets efficiently.',
    targetPallets: 3,
    timeLimit: 240,
    baseScore: 2500
  },
  {
    id: 'slot3_speed',
    slotId: 3,
    title: 'Level 3: Full Warehouse',
    description: 'A busy day! Dispatch 5 pallets before time runs out.',
    targetPallets: 5,
    timeLimit: 300,
    baseScore: 5000
  }
];

export const getPrebuiltGrid3 = (): TileData[][] => {
  const grid: TileData[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      let type = BuildingType.Floor;
      if (x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) type = BuildingType.None;
      // Level 3: Multiple bays and racks
      if (y === 1 && (x === 3 || x === 7 || x === 11)) type = BuildingType.LoadingBay;
      if (y >= 4 && y <= 10 && (x === 3 || x === 4 || x === 7 || x === 8 || x === 11 || x === 12)) type = BuildingType.HeavyRack;
      if (x === 7 && y === 13) type = BuildingType.ForkliftStation;
      row.push({ x, y, buildingType: type, pallets: [false, false, false] });
    }
    grid.push(row);
  }
  return grid;
};

export const BUILDINGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.None]: {
    type: BuildingType.None,
    cost: 0,
    name: 'Bulldoze',
    description: 'Clear a tile',
    color: '#ef4444',
    incomeGen: 0,
    fuelConsumption: 0,
  },
  [BuildingType.Floor]: {
    type: BuildingType.Floor,
    cost: 5,
    name: 'Floor',
    description: 'Basic concrete floor',
    color: '#94a3b8', // slate-400
    incomeGen: 0,
    fuelConsumption: 0,
  },
  [BuildingType.HeavyRack]: {
    type: BuildingType.HeavyRack,
    cost: 150,
    name: 'Heavy Rack',
    description: 'High storage capacity',
    color: '#f97316', // orange-500
    incomeGen: 10,
    fuelConsumption: 0,
  },
  [BuildingType.CantileverRack]: {
    type: BuildingType.CantileverRack,
    cost: 200,
    name: 'Cantilever',
    description: 'For long items',
    color: '#3b82f6', // blue-500
    incomeGen: 15,
    fuelConsumption: 0,
  },
  [BuildingType.LoadingBay]: {
    type: BuildingType.LoadingBay,
    cost: 500,
    name: 'Receiving Bay',
    description: 'Inbound goods',
    color: '#eab308', // yellow-500
    incomeGen: 50,
    fuelConsumption: 0,
  },
  [BuildingType.Truck]: {
    type: BuildingType.Truck,
    cost: 800,
    name: 'Truck',
    description: 'Delivery vehicle',
    color: '#ef4444', // red-500
    incomeGen: 100,
    fuelConsumption: 0,
  },
  [BuildingType.ForkliftStation]: {
    type: BuildingType.ForkliftStation,
    cost: 300,
    name: 'Forklift Station',
    description: 'Recharge & maintenance',
    color: '#eab308', // yellow-500
    incomeGen: 0,
    fuelConsumption: 0,
  },
  [BuildingType.Pallet]: {
    type: BuildingType.Pallet,
    cost: 20,
    name: 'Pallet',
    description: 'Standard unit',
    color: '#78350f', // amber-900
    incomeGen: 5,
    fuelConsumption: 0,
  },
  [BuildingType.CrossDocking]: {
    type: BuildingType.CrossDocking,
    cost: 400,
    name: 'Dispatch Bay',
    description: 'Outbound goods',
    color: '#3b82f6', // blue-500
    incomeGen: 80,
    fuelConsumption: 0,
  },
};
