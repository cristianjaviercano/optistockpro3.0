/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree, ThreeElements } from '@react-three/fiber';
import { MapControls, Environment, SoftShadows, Instance, Instances, Float, useTexture, Outlines, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';
import { Grid, BuildingType, TileData, GameMode } from '../types';
import { GRID_SIZE, BUILDINGS } from '../constants';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;
const gridToWorld = (x: number, y: number) => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET] as [number, number, number];

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const sphereGeo = new THREE.SphereGeometry(1, 8, 8);

// --- Warehouse Components ---

const HeavyRack = ({ color, pallets, forkliftPos, tilePos, gameMode }: { color: string, pallets?: boolean[], forkliftPos: {x: number, y: number}, tilePos: {x: number, y: number}, gameMode: GameMode }) => {
  const dist = Math.sqrt(Math.pow(forkliftPos.x - tilePos.x, 2) + Math.pow(forkliftPos.y - tilePos.y, 2));
  
  // Transparency logic: 
  // 1. Only in Forklift mode
  // 2. If forklift is near (radius 2.5)
  // 3. If forklift is "behind" the rack from the camera's perspective (blocking view)
  const isNear = dist < 2.5;
  const isBlocking = tilePos.x >= Math.floor(forkliftPos.x) && tilePos.y >= Math.floor(forkliftPos.y) && dist < 5;
  
  const shouldBeTransparent = gameMode === GameMode.Forklift && (isNear || isBlocking);
  const opacity = shouldBeTransparent ? 0.25 : 1;
  const transparent = shouldBeTransparent;

  return (
    <group position={[0, 0.2, 0]}>
      {/* Vertical supports */}
      <mesh geometry={boxGeo} position={[-0.45, 0.45, -0.45]} scale={[0.1, 1.3, 0.1]} castShadow receiveShadow>
        <meshStandardMaterial color="#475569" transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh geometry={boxGeo} position={[0.45, 0.45, -0.45]} scale={[0.1, 1.3, 0.1]} castShadow receiveShadow>
        <meshStandardMaterial color="#475569" transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh geometry={boxGeo} position={[-0.45, 0.45, 0.45]} scale={[0.1, 1.3, 0.1]} castShadow receiveShadow>
        <meshStandardMaterial color="#475569" transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh geometry={boxGeo} position={[0.45, 0.45, 0.45]} scale={[0.1, 1.3, 0.1]} castShadow receiveShadow>
        <meshStandardMaterial color="#475569" transparent={transparent} opacity={opacity} />
      </mesh>
      
      {/* Shelves and Pallets */}
      {[0, 1, 2].map((level) => (
        <group key={level} position={[0, 0.1 + level * 0.4, 0]}>
          <mesh geometry={boxGeo} scale={[1, 0.05, 1]} castShadow receiveShadow>
            <meshStandardMaterial color={color} transparent={transparent} opacity={opacity} />
          </mesh>
          {pallets && pallets[level] && (
            <group position={[0, 0.1, 0]} scale={[0.8, 0.8, 0.8]}>
              <Pallet color="#78350f" stored />
            </group>
          )}
        </group>
      ))}
    </group>
  );
};

const CantileverRack = ({ color, pallets, forkliftPos, tilePos, gameMode }: { color: string, pallets?: boolean[], forkliftPos: {x: number, y: number}, tilePos: {x: number, y: number}, gameMode: GameMode }) => {
  const dist = Math.sqrt(Math.pow(forkliftPos.x - tilePos.x, 2) + Math.pow(forkliftPos.y - tilePos.y, 2));
  const isNear = dist < 2.5;
  const isBlocking = tilePos.x >= Math.floor(forkliftPos.x) && tilePos.y >= Math.floor(forkliftPos.y) && dist < 5;
  
  const shouldBeTransparent = gameMode === GameMode.Forklift && (isNear || isBlocking);
  const opacity = shouldBeTransparent ? 0.25 : 1;
  const transparent = shouldBeTransparent;

  return (
    <group position={[0, 0.2, 0]}>
      <mesh geometry={boxGeo} position={[0, 0.4, -0.4]} scale={[0.2, 1.2, 0.2]} castShadow receiveShadow>
        <meshStandardMaterial color="#475569" transparent={transparent} opacity={opacity} />
      </mesh>
      
      {/* Level 0 */}
      <group position={[0, 0.1, 0]}>
        <mesh geometry={boxGeo} scale={[0.1, 0.05, 0.8]} castShadow receiveShadow>
          <meshStandardMaterial color={color} transparent={transparent} opacity={opacity} />
        </mesh>
        {pallets && pallets[0] && (
          <group position={[0, 0.1, 0]} scale={[0.7, 0.7, 0.7]}>
            <Pallet color="#78350f" stored />
          </group>
        )}
      </group>

      {/* Level 1 */}
      <group position={[0, 0.5, 0]}>
        <mesh geometry={boxGeo} scale={[0.1, 0.05, 0.8]} castShadow receiveShadow>
          <meshStandardMaterial color={color} transparent={transparent} opacity={opacity} />
        </mesh>
        {pallets && pallets[1] && (
          <group position={[0, 0.1, 0]} scale={[0.7, 0.7, 0.7]}>
            <Pallet color="#78350f" stored />
          </group>
        )}
      </group>
    </group>
  );
};

const LoadingBay = ({ color }: { color: string }) => (
  <group position={[0, 0.2, 0]}>
    <mesh geometry={boxGeo} position={[0, 0.4, 0]} scale={[1, 0.8, 0.1]} castShadow receiveShadow>
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    <mesh geometry={boxGeo} position={[0, 0.4, -0.05]} scale={[0.8, 0.6, 0.01]} castShadow receiveShadow>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
    </mesh>
    <mesh geometry={boxGeo} position={[0, -0.15, 0.3]} scale={[1.2, 0.1, 0.6]} castShadow receiveShadow>
      <meshStandardMaterial color="#475569" />
    </mesh>
  </group>
);

const Truck = ({ color }: { color: string }) => (
  <group position={[0, 0.2, 0]}>
    {/* Cab */}
    <mesh geometry={boxGeo} position={[0, 0.25, 0.35]} scale={[0.6, 0.5, 0.3]} castShadow receiveShadow>
      <meshStandardMaterial color={color} />
    </mesh>
    {/* Trailer */}
    <mesh geometry={boxGeo} position={[0, 0.35, -0.1]} scale={[0.7, 0.7, 0.8]} castShadow receiveShadow>
      <meshStandardMaterial color="white" />
    </mesh>
    {/* Wheels */}
    {[[-0.3, 0, 0.3], [0.3, 0, 0.3], [-0.3, 0, -0.3], [0.3, 0, -0.3]].map((pos, i) => (
      <mesh key={i} geometry={cylinderGeo} position={pos as any} scale={[0.15, 0.1, 0.15]} rotation={[0, 0, Math.PI/2]} castShadow>
        <meshStandardMaterial color="black" />
      </mesh>
    ))}
  </group>
);

const Pallet = ({ color, stored }: { color: string, stored?: boolean }) => (
  <group position={[0, 0.1, 0]}>
    <mesh geometry={boxGeo} scale={[0.8, 0.1, 0.8]} castShadow receiveShadow>
      <meshStandardMaterial color={color} />
    </mesh>
    <mesh geometry={boxGeo} position={[0, 0.25, 0]} scale={[0.7, 0.4, 0.7]} castShadow receiveShadow>
      <meshStandardMaterial color="#d4d4d8" />
    </mesh>
    {stored && (
      <mesh position={[0, 0.5, 0]} scale={[0.1, 0.1, 0.1]}>
        <sphereGeometry />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} />
      </mesh>
    )}
  </group>
);

const Smoke = ({ position }: { position: [number, number, number] }) => {
  const ref = useRef<THREE.Group>(null);
  const particles = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      speed: 0.3 + Math.random() * 0.4,
      offset: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.2,
    }));
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      const p = particles[i];
      const time = (state.clock.elapsedTime + p.offset) % 1.5;
      const progress = time / 1.5;
      
      child.position.y = progress * p.speed * 2;
      child.position.x = Math.sin(time * 3) * 0.05 + progress * p.drift;
      child.position.z = Math.cos(time * 3) * 0.05 + progress * p.drift;
      
      const scale = (1 - progress) * 0.15;
      child.scale.setScalar(scale);
      (child as any).material.opacity = (1 - progress) * 0.4;
    });
  });

  return (
    <group ref={ref} position={position}>
      {particles.map((p) => (
        <mesh key={p.id} geometry={sphereGeo}>
          <meshBasicMaterial color="#64748b" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
};

const DropEffect = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.scale.x += delta * 5;
      meshRef.current.scale.z += delta * 5;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity -= delta * 2;
    }
  });

  return (
    <mesh ref={meshRef} position={[position[0], position[1] + 0.1, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.4, 32]} />
      <meshBasicMaterial color="#4ade80" transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  );
};

const LightBeam = ({ position }: { position: [number, number, number] }) => (
  <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
    <coneGeometry args={[0.3, 2, 16, 1, true]} />
    <meshBasicMaterial color="#fef9c3" transparent opacity={0.05} side={THREE.DoubleSide} />
  </mesh>
);

const Forklift = ({ position, rotation, carryingPallet, forksLevel, gameMode }: { position: [number, number, number], rotation: number, carryingPallet: boolean, forksLevel: number, gameMode: GameMode }) => {
  const groupRef = useRef<THREE.Group>(null);
  const lightTarget = useRef<THREE.Group>(null);
  const [targetObj, setTargetObj] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    if (lightTarget.current) {
      setTargetObj(lightTarget.current);
    }
  }, []);
  
  useFrame((state) => {
    if (groupRef.current && (gameMode === GameMode.Forklift || gameMode === GameMode.Tutorial)) {
      // Vibration
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 30) * 0.005;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      {/* Body */}
      <mesh geometry={boxGeo} position={[0, 0.15, 0]} scale={[0.5, 0.3, 0.8]} castShadow receiveShadow>
        <meshStandardMaterial color="#eab308" />
      </mesh>
      
      {/* Headlights (Now at the front, pointing forward) */}
      <group position={[0, 0.2, 0.4]}>
        <group ref={lightTarget} position={[0, -0.2, 5]} />
        <spotLight 
          position={[-0.2, 0, 0]} 
          angle={0.6} 
          penumbra={0.8} 
          intensity={3} 
          distance={10} 
          target={targetObj || undefined}
          color="#fef9c3"
          castShadow
        />
        <spotLight 
          position={[0.2, 0, 0]} 
          angle={0.6} 
          penumbra={0.8} 
          intensity={3} 
          distance={10} 
          target={targetObj || undefined}
          color="#fef9c3"
          castShadow
        />
        
        {/* Visual Beams */}
        <group>
          <LightBeam position={[-0.2, 0, 1]} />
          <LightBeam position={[0.2, 0, 1]} />
        </group>

        <mesh position={[-0.2, 0, 0]} scale={[0.1, 0.1, 0.05]}>
          <boxGeometry />
          <meshStandardMaterial color="#fef9c3" emissive="#fef9c3" emissiveIntensity={2} />
        </mesh>
        <mesh position={[0.2, 0, 0]} scale={[0.1, 0.1, 0.05]}>
          <boxGeometry />
          <meshStandardMaterial color="#fef9c3" emissive="#fef9c3" emissiveIntensity={2} />
        </mesh>
      </group>

      {/* Exhaust & Smoke (Now at the back) */}
      <group position={[0, 0.3, -0.4]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.05, 0.05, 0.2]}>
          <cylinderGeometry />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {(gameMode === GameMode.Forklift || gameMode === GameMode.Tutorial) && <Smoke position={[0, 0.1, 0]} />}
      </group>

      {/* Mast */}
      <mesh geometry={boxGeo} position={[0, 0.6, 0.4]} scale={[0.4, 1.2, 0.1]} castShadow receiveShadow>
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Forks - Height based on forksLevel */}
      <group position={[0, forksLevel * 0.4, 0]}>
        <mesh geometry={boxGeo} position={[-0.15, 0.05, 0.6]} scale={[0.1, 0.02, 0.4]} castShadow receiveShadow>
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh geometry={boxGeo} position={[0.15, 0.05, 0.6]} scale={[0.1, 0.02, 0.4]} castShadow receiveShadow>
          <meshStandardMaterial color="#475569" />
        </mesh>
        {carryingPallet && (
          <group position={[0, 0.1, 0.6]}>
            <Pallet color="#78350f" />
          </group>
        )}
      </group>
      {/* Wheels */}
      {[[-0.25, 0, 0.25], [0.25, 0, 0.25], [-0.25, 0, -0.25], [0.25, 0, -0.25]].map((pos, i) => (
        <mesh key={i} geometry={cylinderGeo} position={pos as any} scale={[0.1, 0.05, 0.1]} rotation={[0, 0, Math.PI/2]} castShadow>
          <meshStandardMaterial color="black" />
        </mesh>
      ))}
    </group>
  );
};

// --- Main Map Component ---

interface IsoMapProps {
  grid: Grid;
  onTileClick: (x: number, y: number) => void;
  hoveredTool: BuildingType;
  gameMode: GameMode;
  forkliftPos: {x: number, y: number};
  setForkliftPos: (pos: {x: number, y: number}) => void;
  forkliftRotation: number;
  setForkliftRotation: (rot: number | ((prev: number) => number)) => void;
  carryingPallet: boolean;
  setCarryingPallet: (carrying: boolean) => void;
  fuel: number;
  onForkliftAction: () => void;
  forksLevel: number;
  setForksLevel: (level: number | ((prev: number) => number)) => void;
  setGrid: (grid: Grid | ((prev: Grid) => Grid)) => void;
  addNewsItem: (text: string, type?: 'positive' | 'negative' | 'neutral') => void;
  dropEffect: { x: number, y: number, id: number } | null;
}

const RoadMarkings = () => {
  const markings = useMemo(() => {
    const items = [];
    for (let i = 0; i < GRID_SIZE; i += 2) {
      items.push(
        <mesh key={`h-${i}`} position={[i - WORLD_OFFSET, -0.39, -WORLD_OFFSET - 0.5]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <planeGeometry args={[0.1, 0.5]} />
          <meshBasicMaterial color="#eab308" transparent opacity={0.5} />
        </mesh>
      );
      items.push(
        <mesh key={`v-${i}`} position={[-WORLD_OFFSET - 0.5, -0.39, i - WORLD_OFFSET]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} raycast={() => null}>
          <planeGeometry args={[0.1, 0.5]} />
          <meshBasicMaterial color="#eab308" transparent opacity={0.5} />
        </mesh>
      );
    }
    return items;
  }, []);

  return <group>{markings}</group>;
};

const ForkliftLogic: React.FC<{
  gameMode: GameMode;
  fuel: number;
  forkliftRotation: number;
  setForkliftRotation: (rot: number | ((prev: number) => number)) => void;
  forkliftPos: {x: number, y: number};
  setForkliftPos: (pos: {x: number, y: number}) => void;
  grid: Grid;
  keys: React.MutableRefObject<Record<string, boolean>>;
  setGrid: (grid: Grid | ((prev: Grid) => Grid)) => void;
  addNewsItem: (text: string, type?: 'positive' | 'negative' | 'neutral') => void;
}> = ({ gameMode, fuel, forkliftRotation, setForkliftRotation, forkliftPos, setForkliftPos, grid, keys, setGrid, addNewsItem }) => {
  useFrame((state, delta) => {
    if ((gameMode === GameMode.Forklift || gameMode === GameMode.Tutorial) && fuel > 0) {
      let dx = 0;
      let dy = 0;
      const speed = 5 * delta;
      const rotSpeed = 3 * delta;

      if (keys.current['w'] || keys.current['arrowup']) {
        dx = Math.sin(forkliftRotation) * speed;
        dy = Math.cos(forkliftRotation) * speed;
      }
      if (keys.current['s'] || keys.current['arrowdown']) {
        dx = -Math.sin(forkliftRotation) * speed;
        dy = -Math.cos(forkliftRotation) * speed;
      }
      if (keys.current['a'] || keys.current['arrowleft']) {
        setForkliftRotation(prev => (prev as number) + rotSpeed);
      }
      if (keys.current['d'] || keys.current['arrowright']) {
        setForkliftRotation(prev => (prev as number) - rotSpeed);
      }

      if (dx !== 0 || dy !== 0) {
        // Apply movement limits
        const newX = Math.max(0, Math.min(GRID_SIZE - 1, forkliftPos.x + dx));
        const newY = Math.max(0, Math.min(GRID_SIZE - 1, forkliftPos.y + dy));
        
        // Define Hitbox radius
        const radius = 0.35;
        const corners = [
          {x: newX - radius, y: newY - radius},
          {x: newX + radius, y: newY - radius},
          {x: newX - radius, y: newY + radius},
          {x: newX + radius, y: newY + radius}
        ];
        
        let hasCollision = false;
        let hitPalletX = -1;
        let hitPalletY = -1;
        
        const unmovableTypes = [
          BuildingType.HeavyRack, 
          BuildingType.CantileverRack, 
          BuildingType.Truck,
          BuildingType.CrossDocking
        ];

        for (const corner of corners) {
          const cx = Math.round(corner.x);
          const cy = Math.round(corner.y);
          if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) continue;
          
          const tile = grid[cy]?.[cx];
          if (tile && unmovableTypes.includes(tile.buildingType)) {
            hasCollision = true;
          } else if (tile && tile.buildingType === BuildingType.Pallet) {
            hitPalletX = cx;
            hitPalletY = cy;
          }
        }

        if (hasCollision) {
          return; // Cannot move this frame
        }
        
        if (hitPalletX !== -1 && hitPalletY !== -1) {
          // Push logic
          const pushDirX = Math.sign(dx);
          const pushDirY = Math.sign(dy);
          const nextTileX = hitPalletX + (Math.abs(dx) > Math.abs(dy) ? pushDirX : 0);
          const nextTileY = hitPalletY + (Math.abs(dy) > Math.abs(dx) ? pushDirY : 0);
          
          if (nextTileX >= 0 && nextTileX < GRID_SIZE && nextTileY >= 0 && nextTileY < GRID_SIZE) {
            const nextTile = grid[nextTileY]?.[nextTileX];
            const driveableTypes = [BuildingType.Floor, BuildingType.None, BuildingType.LoadingBay, BuildingType.ForkliftStation];
            
            if (nextTile && driveableTypes.includes(nextTile.buildingType)) {
              // Valid push
              setGrid(prev => {
                const newGrid = prev.map(row => [...row]);
                const palletTile = newGrid[hitPalletY][hitPalletX];
                const destTile = newGrid[nextTileY][nextTileX];
                
                const nextBaseType = destTile.buildingType;
                const restoreBaseType = palletTile.baseType || BuildingType.Floor;
                
                newGrid[nextTileY][nextTileX] = { ...destTile, buildingType: BuildingType.Pallet, baseType: nextBaseType, pallets: [true, false, false] };
                newGrid[hitPalletY][hitPalletX] = { ...palletTile, buildingType: restoreBaseType, pallets: [false, false, false], baseType: BuildingType.Floor };
                return newGrid;
              });
              setForkliftPos({ x: newX, y: newY });
            }
          }
          return; // Stop moving if attempting to push
        }

        // Driveable: Move
        setForkliftPos({ x: newX, y: newY });
      }
    }
  });
  return null;
};

const IsoMap: React.FC<IsoMapProps> = ({ 
  grid, onTileClick, hoveredTool, gameMode, 
  forkliftPos, setForkliftPos, forkliftRotation, setForkliftRotation,
  carryingPallet, setCarryingPallet, fuel, onForkliftAction,
  forksLevel, setForksLevel, setGrid, addNewsItem, dropEffect
}) => {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const handleKey = (key: string, isDown: boolean) => {
      keys.current[key.toLowerCase()] = isDown;
      if (isDown) {
        if (key === ' ' && (gameMode === GameMode.Forklift || gameMode === GameMode.Tutorial)) {
          onForkliftAction();
        }
        if (key === 'q' && (gameMode === GameMode.Forklift || gameMode === GameMode.Tutorial)) {
          setForksLevel(prev => Math.min(2, (prev as number) + 1));
        }
        if (key === 'e' && (gameMode === GameMode.Forklift || gameMode === GameMode.Tutorial)) {
          setForksLevel(prev => Math.max(0, (prev as number) - 1));
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => handleKey(e.key, true);
    const handleKeyUp = (e: KeyboardEvent) => handleKey(e.key, false);
    const handleVirtualKeyDown = (e: any) => handleKey(e.detail, true);
    const handleVirtualKeyUp = (e: any) => handleKey(e.detail, false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('virtual-keydown', handleVirtualKeyDown as EventListener);
    window.addEventListener('virtual-keyup', handleVirtualKeyUp as EventListener);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('virtual-keydown', handleVirtualKeyDown as EventListener);
      window.removeEventListener('virtual-keyup', handleVirtualKeyUp as EventListener);
    };
  }, [gameMode, onForkliftAction, setForksLevel]);

  const showPreview = (gameMode === GameMode.Design || gameMode === GameMode.Tutorial) && hoveredTile && hoveredTool !== BuildingType.None;
  const previewPos = hoveredTile ? gridToWorld(hoveredTile.x, hoveredTile.y) : [0,0,0];

  return (
    <div className="absolute inset-0 bg-slate-900 touch-none">
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
        <OrthographicCamera makeDefault zoom={45} position={[20, 20, 20]} near={-100} far={200} />
        
        <MapControls 
          enableRotate={gameMode === GameMode.Design || gameMode === GameMode.Tutorial}
          enableZoom={true}
          minZoom={20}
          maxZoom={120}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={0.1}
          target={[0,-0.5,0]}
        />

        <ambientLight intensity={0.5} color="#cceeff" />
        <directionalLight
          castShadow
          position={[15, 20, 10]}
          intensity={2}
          color="#fffbeb"
          shadow-mapSize={[2048, 2048]}
        />
        <Environment preset="city" />

        <ForkliftLogic 
          gameMode={gameMode}
          fuel={fuel}
          forkliftRotation={forkliftRotation}
          setForkliftRotation={setForkliftRotation}
          forkliftPos={forkliftPos}
          setForkliftPos={setForkliftPos}
          grid={grid}
          keys={keys}
          setGrid={setGrid}
          addNewsItem={addNewsItem}
        />

        <RoadMarkings />

        <group>
          {grid.map((row, y) =>
            row.map((tile, x) => {
              const [wx, _, wz] = gridToWorld(x, y);
              const config = BUILDINGS[tile.buildingType];
              
              return (
                <React.Fragment key={`${x}-${y}`}>
                  {/* Floor Tile */}
                  <mesh 
                    position={[wx, -0.4, wz]} 
                    receiveShadow castShadow
                    onPointerEnter={() => (gameMode === GameMode.Design || gameMode === GameMode.Tutorial) && setHoveredTile({x, y})}
                    onPointerOut={() => setHoveredTile(null)}
                    onPointerDown={() => onTileClick(x, y)}
                  >
                    <boxGeometry args={[1, 0.2, 1]} />
                    <meshStandardMaterial color={tile.buildingType === BuildingType.None ? "#1e293b" : "#475569"} />
                  </mesh>

                  {/* Building Visual */}
                  <group 
                    position={[wx, -0.3, wz]}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onTileClick(x, y);
                    }}
                  >
                    {tile.buildingType === BuildingType.HeavyRack && (
                      <HeavyRack 
                        color={config.color} 
                        pallets={tile.pallets} 
                        forkliftPos={forkliftPos} 
                        tilePos={{x, y}} 
                        gameMode={gameMode}
                      />
                    )}
                    {tile.buildingType === BuildingType.CantileverRack && (
                      <CantileverRack 
                        color={config.color} 
                        pallets={tile.pallets}
                        forkliftPos={forkliftPos} 
                        tilePos={{x, y}} 
                        gameMode={gameMode}
                      />
                    )}
                    {tile.buildingType === BuildingType.LoadingBay && <LoadingBay color={config.color} />}
                    {tile.buildingType === BuildingType.Truck && <Truck color={config.color} />}
                    {tile.buildingType === BuildingType.Pallet && <Pallet color={config.color} />}
                    {tile.buildingType === BuildingType.ForkliftStation && (
                      <group>
                        <mesh geometry={boxGeo} scale={[0.8, 0.1, 0.8]}>
                          <meshStandardMaterial color={config.color} />
                        </mesh>
                        <mesh geometry={boxGeo} position={[0, 0.2, 0]} scale={[0.1, 0.4, 0.1]}>
                          <meshStandardMaterial color="#475569" />
                        </mesh>
                        <mesh geometry={sphereGeo} position={[0, 0.45, 0]} scale={[0.1, 0.1, 0.1]}>
                          <meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.5} />
                        </mesh>
                      </group>
                    )}
                    {tile.buildingType === BuildingType.CrossDocking && (
                      <group>
                        <mesh geometry={boxGeo} scale={[0.9, 0.05, 0.9]}>
                          <meshStandardMaterial color={config.color} />
                        </mesh>
                        <mesh geometry={boxGeo} position={[0, 0.01, 0]} scale={[0.8, 0.01, 0.8]}>
                          <meshStandardMaterial color="#334155" />
                        </mesh>
                      </group>
                    )}
                  </group>
                </React.Fragment>
              )
            })
          )}

          {/* Forklift */}
          {(gameMode === GameMode.Forklift || gameMode === GameMode.Tutorial) && (
            <Forklift 
              position={gridToWorld(forkliftPos.x, forkliftPos.y)} 
              rotation={forkliftRotation} 
              carryingPallet={carryingPallet} 
              forksLevel={forksLevel}
              gameMode={gameMode}
            />
          )}

          {/* Drop Effect */}
          {dropEffect && (
            <DropEffect key={dropEffect.id} position={gridToWorld(dropEffect.x, dropEffect.y)} />
          )}

          {/* Placement Preview */}
          {showPreview && hoveredTile && (
            <group position={[previewPos[0], -0.3, previewPos[2]]}>
              <Float speed={3} rotationIntensity={0} floatIntensity={0.1}>
                {hoveredTool === BuildingType.HeavyRack && (
                  <HeavyRack 
                    color={BUILDINGS[hoveredTool].color} 
                    forkliftPos={forkliftPos} 
                    tilePos={hoveredTile} 
                    gameMode={gameMode}
                  />
                )}
                {hoveredTool === BuildingType.CantileverRack && (
                  <CantileverRack 
                    color={BUILDINGS[hoveredTool].color} 
                    forkliftPos={forkliftPos} 
                    tilePos={hoveredTile} 
                    gameMode={gameMode}
                  />
                )}
                {hoveredTool === BuildingType.LoadingBay && <LoadingBay color={BUILDINGS[hoveredTool].color} />}
                {hoveredTool === BuildingType.Truck && <Truck color={BUILDINGS[hoveredTool].color} />}
                {hoveredTool === BuildingType.Pallet && <Pallet color={BUILDINGS[hoveredTool].color} />}
              </Float>
            </group>
          )}

          {/* Cursor */}
          {hoveredTile && (gameMode === GameMode.Design || gameMode === GameMode.Tutorial) && (
            <mesh position={[gridToWorld(hoveredTile.x, hoveredTile.y)[0], -0.29, gridToWorld(hoveredTile.x, hoveredTile.y)[2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="white" transparent opacity={0.2} />
              <Outlines thickness={0.05} color="white" />
            </mesh>
          )}
        </group>
        
        <SoftShadows size={10} samples={8} />
      </Canvas>
    </div>
  );
};

export default IsoMap;
