/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export type Language = 'en' | 'es';

export enum BuildingType {
  None = 'None',
  Floor = 'Floor',
  HeavyRack = 'HeavyRack',
  CantileverRack = 'CantileverRack',
  LoadingBay = 'LoadingBay',
  Truck = 'Truck',
  ForkliftStation = 'ForkliftStation',
  Pallet = 'Pallet',
  CrossDocking = 'CrossDocking',
}

export enum GameMode {
  Design = 'Design',
  Forklift = 'Forklift',
  Tutorial = 'Tutorial',
}

export interface BuildingConfig {
  type: BuildingType;
  cost: number;
  name: string;
  description: string;
  color: string;
  incomeGen: number;
  fuelConsumption: number;
}

export interface TileData {
  x: number;
  y: number;
  buildingType: BuildingType;
  baseType?: BuildingType; // The original floor type beneath a pallet
  variant?: number;
  pallets?: boolean[]; // [level0, level1, level2]
}

export type Grid = TileData[][];

export interface WarehouseStats {
  money: number;
  fuel: number;
  efficiency: number;
  time: number; // in game minutes
  score: number;
}

export interface NewsItem {
  id: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral' | 'mission';
  sender?: 'Controller' | 'System';
}

export interface Challenge {
  id: string;
  slotId: number;
  title: string;
  description: string;
  targetPallets: number;
  timeLimit: number;
  baseScore: number;
}

export interface UserProgress {
  uid: string;
  displayName: string;
  totalScore: number;
  level: number;
  completedChallenges: string[];
}

export interface SaveSlot {
  id: number;
  name: string;
  grid: Grid;
  stats: WarehouseStats;
  lastSaved: string;
  isEmpty: boolean;
}
