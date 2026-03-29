/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Grid, TileData, BuildingType, WarehouseStats, GameMode, NewsItem, SaveSlot, Challenge, UserProgress, Language, ActiveBay } from './types';
import { GRID_SIZE, BUILDINGS, TICK_RATE_MS, INITIAL_MONEY, INITIAL_FUEL, TUTORIAL_STEPS, getPrebuiltGrid, getPrebuiltGrid2, getPrebuiltGrid3, CHALLENGES, getInwardTile } from './constants';
import { translations } from './locales';
import IsoMap from './components/IsoMap';
import UIOverlay from './components/UIOverlay';
import StartScreen from './components/StartScreen';
import { auth, signOut, db, doc, getDoc, setDoc, addDoc, serverTimestamp, collection, onAuthStateChanged, updateProfile, signInAnonymously } from './firebase';
import { User as FirebaseUser } from 'firebase/auth';

const createInitialGrid = (): Grid => {
  const grid: Grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({ x, y, buildingType: BuildingType.None, pallets: [false, false, false] });
    }
    grid.push(row);
  }
  return grid;
};

const INITIAL_STATS: WarehouseStats = { 
  money: INITIAL_MONEY, 
  fuel: INITIAL_FUEL, 
  efficiency: 100, 
  day: 1,
  time: 8, // Start at 8:00 AM
  score: 0 
};

function App() {
  // --- Game State ---
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.Design);
  const [currentSlotId, setCurrentSlotId] = useState<number | null>(null);
  const [tutorialStep, setTutorialStep] = useState<number>(0);

  const [grid, setGrid] = useState<Grid>(createInitialGrid);
  const [stats, setStats] = useState<WarehouseStats>(INITIAL_STATS);
  const [selectedTool, setSelectedTool] = useState<BuildingType>(BuildingType.Floor);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  const [currentTask, setCurrentTask] = useState<{ text: string, target: number, current: number, challengeId?: string } | null>(null);
  const [xpGain, setXpGain] = useState<{ amount: number, id: number } | null>(null);

  useEffect(() => {
    if (xpGain) {
      const timer = setTimeout(() => setXpGain(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [xpGain]);
  
  // --- User & Progress State ---
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [challengeTimer, setChallengeTimer] = useState<number | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  
  // Save Slots State
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>(() => {
    const slots: SaveSlot[] = [];
    for (let i = 1; i <= 4; i++) {
      if (i === 1) {
        slots.push({
          id: i,
          name: "Level 1: Basic Operations",
          grid: getPrebuiltGrid(),
          stats: { ...INITIAL_STATS, money: 5000, day: 10 },
          lastSaved: new Date().toISOString(),
          isEmpty: false
        });
      } else if (i === 2) {
        slots.push({
          id: i,
          name: "Level 2: Dual Bays",
          grid: getPrebuiltGrid2(),
          stats: { ...INITIAL_STATS, money: 8000, day: 5 },
          lastSaved: new Date().toISOString(),
          isEmpty: false
        });
      } else if (i === 3) {
        slots.push({
          id: i,
          name: "Level 3: Full Warehouse",
          grid: getPrebuiltGrid3(),
          stats: { ...INITIAL_STATS, money: 12000, day: 2 },
          lastSaved: new Date().toISOString(),
          isEmpty: false
        });
      } else {
        slots.push({
          id: i,
          name: `Slot ${i}`,
          grid: createInitialGrid(),
          stats: INITIAL_STATS,
          lastSaved: "",
          isEmpty: true
        });
      }
    }
    return slots;
  });
  
  // Forklift State
  const [forkliftPos, setForkliftPos] = useState<{x: number, y: number}>({ x: GRID_SIZE / 2, y: GRID_SIZE / 2 });
  const [forkliftRotation, setForkliftRotation] = useState(0);
  const [carryingPallet, setCarryingPallet] = useState(false);
  const [forksLevel, setForksLevel] = useState(0); // 0, 1, 2
  const [dropEffect, setDropEffect] = useState<{x: number, y: number, id: number} | null>(null);
  const [activeBays, setActiveBays] = useState<ActiveBay[]>([]);
  const [palletsSpawned, setPalletsSpawned] = useState(0);

  // Refs for accessing state inside intervals
  const gridRef = useRef(grid);
  const statsRef = useRef(stats);
  const gameModeRef = useRef(gameMode);
  const forkliftPosRef = useRef(forkliftPos);
  const forkliftRotationRef = useRef(forkliftRotation);

  // Sync refs
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { forkliftPosRef.current = forkliftPos; }, [forkliftPos]);
  useEffect(() => { forkliftRotationRef.current = forkliftRotation; }, [forkliftRotation]);

  const addNewsItem = useCallback((text: string, type: 'positive' | 'negative' | 'neutral' | 'mission' = 'neutral', sender: 'Controller' | 'System' = 'System') => {
    setNewsFeed(prev => [...prev.slice(-12), { id: Date.now().toString() + Math.random(), text, type, sender }]);
  }, []);

  const tMsg = translations[language].messages;

  const playDropSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  }, []);

  const playPickSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  }, []);

  // --- Auth & Profile Sync ---
  const handleLogin = async (name: string) => {
    setUserProgress({
      uid: 'local',
      displayName: name,
      totalScore: 0,
      level: 1,
      completedChallenges: []
    });
  };

  const handleLogout = () => {
    setUserProgress(null);
  };

  // --- Initial Setup ---
  useEffect(() => {
    if (!gameStarted) return;
    addNewsItem(tMsg.welcome, 'positive');
  }, [gameStarted, addNewsItem, tMsg]);

  // --- Game Loop ---
  useEffect(() => {
    if (!gameStarted) return;

    const intervalId = setInterval(() => {
      // Only run game logic in Forklift mode
      if (gameModeRef.current !== GameMode.Forklift) return;

      let dailyIncome = 0;
      let fuelConsumption = 0;
      let buildingCounts: Record<string, number> = {};

      gridRef.current.flat().forEach(tile => {
        if (tile.buildingType !== BuildingType.None) {
          const config = BUILDINGS[tile.buildingType];
          dailyIncome += config.incomeGen;
          fuelConsumption += config.fuelConsumption;
          buildingCounts[tile.buildingType] = (buildingCounts[tile.buildingType] || 0) + 1;
        }
      });

      setStats(prev => {
        // Tutorial has its own logic (handled below)
        if (gameModeRef.current === GameMode.Tutorial) {
          return {
            ...prev,
            efficiency: Math.min(100, (buildingCounts[BuildingType.LoadingBay] || 0) * 20 + (buildingCounts[BuildingType.HeavyRack] || 0) * 5)
          };
        }

        const fuelDecrease = 2; // Fixed decrease per tick in shift mode
        const newFuel = Math.max(0, prev.fuel - fuelDecrease);
        
        if (newFuel === 0) {
          addNewsItem(tMsg.outOfFuel, 'negative');
        }

        return {
          ...prev,
          money: prev.money + dailyIncome,
          fuel: newFuel,
          day: prev.day + 1,
          efficiency: Math.min(100, (buildingCounts[BuildingType.LoadingBay] || 0) * 20 + (buildingCounts[BuildingType.HeavyRack] || 0) * 5)
        };
      });

      // Random events and Task generation
      if (!currentTask && !activeChallenge && Math.random() > 0.9) {
        const newTask = {
          text: "Relocate 3 units to Heavy Racks",
          target: 3,
          current: 0
        };
        setCurrentTask(newTask);
        addNewsItem(tMsg.backlog, 'mission', 'Controller');
      }

      // Challenge Timer logic
      if (activeChallenge && challengeTimer !== null) {
        setChallengeTimer(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            addNewsItem(tMsg.missionFailed, 'negative', 'Controller');
            setActiveChallenge(null);
            setGameMode(GameMode.Design);
            return 0;
          }
          return prev - 1;
        });
      }

      // Spawn pallets at Receiving Bays
      if (gameModeRef.current === GameMode.Forklift && Math.random() > 0.8) {
        // Limit pallets if in challenge, otherwise allow up to a reasonable amount
        const canSpawn = activeChallenge 
          ? palletsSpawned < activeChallenge.targetPallets 
          : gridRef.current.flat().filter(t => t.pallets?.[0]).length < 20;

        if (canSpawn) {
          const receivingBays = gridRef.current.flat().filter(t => t.buildingType === BuildingType.LoadingBay);
          if (receivingBays.length > 0) {
            const bay = receivingBays[Math.floor(Math.random() * receivingBays.length)];
            
            // Check if bay is already active
            setActiveBays(prev => {
              if (prev.some(b => b.x === bay.x && b.y === bay.y)) return prev;

              const truckId = Date.now();
              const newBay: ActiveBay = { id: truckId, x: bay.x, y: bay.y, type: 'inbound', phase: 'arriving' };
              
              // Notify truck arrival
              addNewsItem(translations[language].messages.truckArriving || "Truck arriving at Receiving Bay...", 'neutral');
              if (activeChallenge) setPalletsSpawned(p => p + 1);

              // Sequence: arriving -> unloading -> leaving -> remove
              setTimeout(() => {
                setActiveBays(current => current.map(b => b.id === truckId ? { ...b, phase: 'unloading' } : b));
                
                // Spawn pallet after unloading starts
                setTimeout(() => {
                  setGrid(gridPrev => {
                    const newGrid = gridPrev.map(row => [...row]);
                    const inward = getInwardTile(bay.x, bay.y, GRID_SIZE);
                    if (inward && newGrid[inward.y][inward.x].buildingType === BuildingType.Floor && !newGrid[inward.y][inward.x].pallets?.[0]) {
                      newGrid[inward.y][inward.x] = { ...newGrid[inward.y][inward.x], pallets: [true, false, false] };
                      addNewsItem(tMsg.truckDelivery, 'positive'); // Real delivery success message
                      addNewsItem(tMsg.newPallet, 'neutral');
                    } else {
                      addNewsItem(tMsg.bayBlocked, 'negative');
                    }
                    return newGrid;
                  });

                  // Then leave
                  setTimeout(() => {
                    setActiveBays(current => current.map(b => b.id === truckId ? { ...b, phase: 'leaving' } : b));
                    
                    // Finally remove
                    setTimeout(() => {
                      setActiveBays(current => current.filter(b => b.id !== truckId));
                    }, 2000);
                  }, 2000);
                }, 1000);
              }, 2000);

              return [...prev, newBay];
            });
          }
        }
      }

      // Time progression
      setStats(prev => {
        let newTime = prev.time + (1 / 60); // 1 in-game hour = 60 real seconds (1 minute per hour)
        let newDay = prev.day;
        if (newTime >= 18) { // Shift ends at 18:00 (6:00 PM)
          newTime = 8;
          newDay += 1;
        }
        return { ...prev, time: newTime, day: newDay };
      });

    }, TICK_RATE_MS);

    return () => clearInterval(intervalId);
  }, [gameStarted, addNewsItem, tMsg]);

  // --- Interaction Logic ---

  // Load save slots from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('optistock_save_slots');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with initial slots to ensure prebuilt levels are available if slots are empty
        setSaveSlots(prev => {
          return prev.map(initialSlot => {
            const savedSlot = parsed.find((s: any) => s.id === initialSlot.id);
            if (savedSlot && !savedSlot.isEmpty) {
              return savedSlot;
            }
            return initialSlot;
          });
        });
      } catch (e) {
        console.error("Failed to load save slots", e);
      }
    }
  }, []);

  // Persist save slots to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('optistock_save_slots', JSON.stringify(saveSlots));
  }, [saveSlots]);

  const handleTileClick = useCallback((x: number, y: number) => {
    if (!gameStarted) return;
    if (gameMode !== GameMode.Design && gameMode !== GameMode.Tutorial) return;

    const currentGrid = gridRef.current;
    const currentStats = statsRef.current;
    const tool = selectedTool;
    
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    const currentTile = currentGrid[y][x];
    const buildingConfig = BUILDINGS[tool];

    // Bulldoze logic
    if (tool === BuildingType.None) {
      if (currentTile.buildingType !== BuildingType.None) {
        const demolishCost = 10;
        if (currentStats.money >= demolishCost) {
            const newGrid = currentGrid.map(row => [...row]);
            newGrid[y][x] = { ...currentTile, buildingType: BuildingType.None };
            setGrid(newGrid);
            setStats(prev => ({ ...prev, money: prev.money - demolishCost }));
        } else {
            addNewsItem(tMsg.cannotAffordDemo, 'negative');
        }
      }
      return;
    }

    // Placement Logic
    if (currentTile.buildingType === BuildingType.None || currentTile.buildingType === BuildingType.Floor) {
      // Special check for LoadingBay and CrossDocking: must be on edges
      if (tool === BuildingType.LoadingBay || tool === BuildingType.CrossDocking) {
        const isOnEdge = x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1;
        if (!isOnEdge) {
          addNewsItem(translations[language].messages.bayOnEdge || "Bays must be placed on the warehouse edges!", 'negative');
          return;
        }
      }

      if (currentStats.money >= buildingConfig.cost) {
        setStats(prev => ({ ...prev, money: prev.money - buildingConfig.cost }));
        const newGrid = currentGrid.map(row => [...row]);
        newGrid[y][x] = { ...currentTile, buildingType: tool };
        setGrid(newGrid);

        // Tutorial Logic
        if (gameMode === GameMode.Tutorial) {
          const currentStep = TUTORIAL_STEPS[tutorialStep];
          if (currentStep && tool === currentStep.target) {
            setTutorialStep(prev => prev + 1);
            addNewsItem(tMsg.stepCompleted.replace('{step}', (tutorialStep + 1).toString()), 'positive');
            if (userProgress) {
              setUserProgress(prev => prev ? { ...prev, totalScore: prev.totalScore + 500 } : prev);
              setXpGain({ amount: 500, id: Date.now() });
            }
          } else if (currentStep && tool !== currentStep.target) {
            addNewsItem(tMsg.incorrectPlacement.replace('{building}', translations[language].buildings[currentStep.target === BuildingType.Floor ? 'floor' : currentStep.target === BuildingType.HeavyRack ? 'heavyRack' : currentStep.target === BuildingType.CantileverRack ? 'cantilever' : currentStep.target === BuildingType.LoadingBay ? 'loadingBay' : currentStep.target === BuildingType.Truck ? 'truck' : currentStep.target === BuildingType.Pallet ? 'pallet' : currentStep.target === BuildingType.ForkliftStation ? 'forkliftStation' : currentStep.target === BuildingType.CrossDocking ? 'crossDocking' : 'floor']), 'negative');
          }
        }
      } else {
        addNewsItem(tMsg.insufficientFunds.replace('{building}', translations[language].buildings[selectedTool === BuildingType.Floor ? 'floor' : selectedTool === BuildingType.HeavyRack ? 'heavyRack' : selectedTool === BuildingType.CantileverRack ? 'cantilever' : selectedTool === BuildingType.LoadingBay ? 'loadingBay' : selectedTool === BuildingType.Truck ? 'truck' : selectedTool === BuildingType.Pallet ? 'pallet' : selectedTool === BuildingType.ForkliftStation ? 'forkliftStation' : selectedTool === BuildingType.CrossDocking ? 'crossDocking' : 'floor']), 'negative');
      }
    }
  }, [selectedTool, addNewsItem, gameStarted, gameMode, tutorialStep, tMsg, language, userProgress]);

  const handleStart = (slotId: number, mode: GameMode) => {
    const slot = saveSlots.find(s => s.id === slotId);
    if (slot) {
      const startGrid = mode === GameMode.Tutorial ? createInitialGrid() : slot.grid;
      setGrid(startGrid);
      setStats(slot.stats);
      setCurrentSlotId(slotId);
      setGameMode(mode);
      
      // Find safe spawn point
      let spawnX = GRID_SIZE / 2;
      let spawnY = GRID_SIZE / 2;
      let found = false;
      for (let y = GRID_SIZE - 1; y >= 0; y--) {
        for (let x = GRID_SIZE - 1; x >= 0; x--) {
          if (startGrid[y][x].buildingType === BuildingType.Floor || startGrid[y][x].buildingType === BuildingType.ForkliftStation) {
            spawnX = x;
            spawnY = y;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      setForkliftPos({ x: spawnX, y: spawnY });
      setForksLevel(0);
      setCarryingPallet(false);
      
      if (mode === GameMode.Tutorial) {
        setTutorialStep(0);
        setStats({ ...INITIAL_STATS, money: 10000 }); // Give extra money for tutorial
        addNewsItem(tMsg.academyWelcome, 'positive');
        addNewsItem(tMsg.academyInstructions, 'neutral');
      } else if (slotId === 1 && !slot.isEmpty) {
        addNewsItem(tMsg.sampleLoaded, 'positive');
        addNewsItem(tMsg.guideLoading, 'neutral');
        addNewsItem(tMsg.guideRacks, 'neutral');
        addNewsItem(tMsg.guideStation, 'neutral');
        addNewsItem(tMsg.tipMove, 'neutral');
      }
      
      setGameStarted(true);
    }
  };

  const saveGame = useCallback(() => {
    if (currentSlotId === null) return;
    setSaveSlots(prev => {
      const newSlots = prev.map(slot => 
        slot.id === currentSlotId 
          ? { ...slot, grid, stats, lastSaved: new Date().toISOString(), isEmpty: false }
          : slot
      );
      return newSlots;
    });
    addNewsItem(tMsg.gameSaved, 'positive');
  }, [currentSlotId, grid, stats, addNewsItem, tMsg]);

  const toggleGameMode = () => {
    // Mode toggling is now handled via Save & Exit to Start Screen
    addNewsItem(tMsg.changeMode, 'neutral');
  };

  const startChallenge = (challenge: Challenge) => {
    setActiveChallenge(challenge);
    setPalletsSpawned(0);
    setChallengeTimer(challenge.timeLimit);
    const challengeTitle = translations[language].challenges[`${challenge.id}Title` as keyof typeof translations['en']['challenges']] || challenge.title;
    setCurrentTask({
      text: tMsg.missionCurrent.replace('{title}', challengeTitle).replace('{target}', challenge.targetPallets.toString()),
      target: challenge.targetPallets,
      current: 0,
      challengeId: challenge.id
    });
    setGameMode(GameMode.Forklift);
    addNewsItem(tMsg.missionInit.replace('{id}', challenge.id).replace('{target}', challenge.targetPallets.toString()), 'mission', 'Controller');
  };

  const completeChallenge = async (challenge: Challenge, score: number) => {
    // Update user progress locally
    if (userProgress) {
      const isFirstTime = !userProgress.completedChallenges.includes(challenge.id);
      const newProgress = {
        ...userProgress,
        totalScore: userProgress.totalScore + score,
        completedChallenges: isFirstTime 
          ? [...userProgress.completedChallenges, challenge.id] 
          : userProgress.completedChallenges,
        level: Math.floor((userProgress.totalScore + score) / 5000) + 1
      };
      setUserProgress(newProgress);
      setXpGain({ amount: score, id: Date.now() });
    }

    addNewsItem(tMsg.missionSuccess.replace('{id}', challenge.id).replace('{score}', score.toString()), 'positive', 'Controller');
    setActiveChallenge(null);
    setChallengeTimer(null);
    setCurrentTask(null);
    setGameMode(GameMode.Design);
  };

  const buyFuel = () => {
    if (gameMode === GameMode.Tutorial) {
      addNewsItem(tMsg.fuelInfinite, 'positive');
      return;
    }
    const fuelCost = 100;
    if (stats.money >= fuelCost) {
      setStats(prev => ({ ...prev, money: prev.money - fuelCost, fuel: Math.min(100, prev.fuel + 50) }));
      addNewsItem(tMsg.fuelPurchased, 'positive');
    } else {
      addNewsItem(tMsg.notEnoughMoneyFuel, 'negative');
    }
  };

  const onForkliftAction = useCallback(() => {
    // Check tile in front of forklift
    const currentPos = forkliftPosRef.current;
    const currentRot = forkliftRotationRef.current;
    const frontX = currentPos.x + Math.sin(currentRot) * 0.8;
    const frontY = currentPos.y + Math.cos(currentRot) * 0.8;
    
    const tileX = Math.round(frontX);
    const tileY = Math.round(frontY);
    const currentGrid = gridRef.current;
    const tile = currentGrid[tileY]?.[tileX];

    if (!tile) return;

    const level = forksLevel;
    const pallets = tile.pallets || [false, false, false];

    if (!carryingPallet) {
      // Pick up logic
      if ((tile.buildingType === BuildingType.Floor || tile.buildingType === BuildingType.LoadingBay || tile.buildingType === BuildingType.None) && pallets[0] && level === 0) {
        setCarryingPallet(true);
        const newGrid = currentGrid.map(row => [...row]);
        newGrid[tileY][tileX] = { ...tile, pallets: [false, false, false] };
        setGrid(newGrid);
        playPickSound();
        addNewsItem(tMsg.palletPickedFloor, 'neutral');
      } else if (tile.buildingType === BuildingType.HeavyRack && pallets[level]) {
        setCarryingPallet(true);
        const newGrid = currentGrid.map(row => [...row]);
        const newPallets = [...pallets];
        newPallets[level] = false;
        newGrid[tileY][tileX] = { ...tile, pallets: newPallets };
        setGrid(newGrid);
        playPickSound();
        addNewsItem(tMsg.palletPickedRack.replace('{level}', (level + 1).toString()), 'neutral');
      } else if (tile.buildingType === BuildingType.Truck) {
        addNewsItem(tMsg.truckEmpty, 'neutral');
      } else {
        addNewsItem(tMsg.nothingToPick, 'neutral');
      }
    } else {
      // Drop off logic
      if ((tile.buildingType === BuildingType.Floor || tile.buildingType === BuildingType.LoadingBay || tile.buildingType === BuildingType.None) && !pallets[0] && level === 0) {
        // Check if this floor tile is an inward tile for a CrossDocking bay
        const adjacentCrossDocking = [
          { x: tileX, y: tileY - 1 },
          { x: tileX, y: tileY + 1 },
          { x: tileX - 1, y: tileY },
          { x: tileX + 1, y: tileY }
        ].find(pos => {
          const adjTile = currentGrid[pos.y]?.[pos.x];
          if (adjTile && adjTile.buildingType === BuildingType.CrossDocking) {
            const inward = getInwardTile(pos.x, pos.y, GRID_SIZE);
            return inward && inward.x === tileX && inward.y === tileY;
          }
          return false;
        });

        if (adjacentCrossDocking) {
          // Dispatch logic
          setCarryingPallet(false);
          setStats(prev => ({ ...prev, score: prev.score + 100, money: prev.money + 50 }));
          playDropSound();
          setDropEffect({ x: tileX, y: tileY, id: Date.now() });
          addNewsItem(tMsg.palletDispatched, 'positive');

          // Trigger outbound bay animation
          const truckId = Date.now();
          setActiveBays(prev => [...prev, { id: truckId, x: adjacentCrossDocking.x, y: adjacentCrossDocking.y, type: 'outbound', phase: 'arriving' }]);
          
          setTimeout(() => {
            setActiveBays(current => current.map(b => b.id === truckId ? { ...b, phase: 'loading' } : b));
            setTimeout(() => {
              setActiveBays(current => current.map(b => b.id === truckId ? { ...b, phase: 'leaving' } : b));
              setTimeout(() => {
                setActiveBays(current => current.filter(b => b.id !== truckId));
              }, 2000);
            }, 2000);
          }, 2000);

          if (currentTask && currentTask.text.includes("Dispatch")) {
            setCurrentTask(prev => {
              if (!prev) return null;
              const next = { ...prev, current: prev.current + 1 };
              if (next.current >= next.target) {
                if (activeChallenge) {
                  completeChallenge(activeChallenge, activeChallenge.baseScore + (challengeTimer || 0) * 10);
                } else {
                  addNewsItem(tMsg.taskCompleted, 'positive', 'Controller');
                  setStats(s => ({ ...s, money: s.money + 500, score: s.score + 200 }));
                }
                return null;
              }
              return next;
            });
          }
          return; // Skip normal floor drop
        }

        setCarryingPallet(false);
        const newGrid = currentGrid.map(row => [...row]);
        newGrid[tileY][tileX] = { ...tile, pallets: [true, false, false] };
        setGrid(newGrid);
        setStats(prev => ({ ...prev, score: prev.score + 10 }));
        playDropSound();
        setDropEffect({ x: tileX, y: tileY, id: Date.now() });
        addNewsItem(tMsg.palletDroppedFloor, 'neutral');
      } else if (tile.buildingType === BuildingType.CrossDocking && level === 0) {
        addNewsItem(tMsg.incorrectPlacement.replace('{building}', 'Dispatch Bay'), 'negative');
      } else if (tile.buildingType === BuildingType.HeavyRack && !pallets[level]) {
        setCarryingPallet(false);
        const newGrid = currentGrid.map(row => [...row]);
        const newPallets = [...pallets];
        newPallets[level] = true;
        newGrid[tileY][tileX] = { ...tile, pallets: newPallets };
        setGrid(newGrid);
        
        setStats(prev => ({ ...prev, score: prev.score + 50, money: prev.money + 20 }));
        playDropSound();
        setDropEffect({ x: tileX, y: tileY, id: Date.now() });
        addNewsItem(tMsg.palletStoredRack.replace('{level}', (level + 1).toString()), 'positive');
        
        if (currentTask && currentTask.text.includes("Heavy Racks")) {
          setCurrentTask(prev => {
            if (!prev) return null;
            const next = { ...prev, current: prev.current + 1 };
            if (next.current >= next.target) {
              if (activeChallenge) {
                completeChallenge(activeChallenge, activeChallenge.baseScore + (challengeTimer || 0) * 10);
              } else {
                addNewsItem(tMsg.taskCompleted, 'positive', 'Controller');
                setStats(s => ({ ...s, money: s.money + 500, score: s.score + 200 }));
              }
              return null;
            }
            return next;
          });
        }
      } else if (tile.buildingType === BuildingType.Truck) {
        setCarryingPallet(false);
        setStats(prev => ({ ...prev, score: prev.score + 100, money: prev.money + 50 }));
        playDropSound();
        setDropEffect({ x: tileX, y: tileY, id: Date.now() });
        addNewsItem(tMsg.palletLoadedTruck, 'positive');
        
        if (currentTask && currentTask.text.includes("Truck")) {
          setCurrentTask(prev => {
            if (!prev) return null;
            const next = { ...prev, current: prev.current + 1 };
            if (next.current >= next.target) {
              addNewsItem(tMsg.taskCompletedBonus, 'positive');
              setStats(s => ({ ...s, money: s.money + 500, score: s.score + 200 }));
              return null;
            }
            return next;
          });
        }
      } else {
        addNewsItem(tMsg.cannotDrop, 'negative');
      }
    }
  }, [carryingPallet, addNewsItem, currentTask, forksLevel, playDropSound, playPickSound, tMsg, activeChallenge, challengeTimer]);

  return (
    <div className="relative w-screen h-screen overflow-hidden selection:bg-transparent selection:text-transparent bg-slate-900">
      <IsoMap 
        grid={grid} 
        onTileClick={handleTileClick} 
        hoveredTool={selectedTool}
        gameMode={gameMode}
        forkliftPos={forkliftPos}
        setForkliftPos={setForkliftPos}
        forkliftRotation={forkliftRotation}
        setForkliftRotation={setForkliftRotation}
        carryingPallet={carryingPallet}
        setCarryingPallet={setCarryingPallet}
        fuel={stats.fuel}
        onForkliftAction={onForkliftAction}
        forksLevel={forksLevel}
        setForksLevel={setForksLevel}
        setGrid={setGrid}
        addNewsItem={addNewsItem}
        dropEffect={dropEffect}
        activeBays={activeBays}
      />
      
      {!gameStarted && (
        <StartScreen 
          onStart={handleStart} 
          saveSlots={saveSlots} 
          userProgress={userProgress}
          onSignIn={handleLogin}
          onSignOut={handleLogout}
          language={language}
          setLanguage={setLanguage}
        />
      )}

      {gameStarted && (
        <UIOverlay
          stats={stats}
          selectedTool={selectedTool}
          onSelectTool={setSelectedTool}
          newsFeed={newsFeed}
          gameMode={gameMode}
          onToggleMode={toggleGameMode}
          onBuyFuel={buyFuel}
          currentTask={currentTask}
          tutorialStep={gameMode === GameMode.Tutorial ? tutorialStep : null}
          onSave={saveGame}
          onExit={() => setGameStarted(false)}
          forksLevel={forksLevel}
          onForksUp={() => setForksLevel(prev => Math.min(2, prev + 1))}
          onForksDown={() => setForksLevel(prev => Math.max(0, prev - 1))}
          userProgress={userProgress}
          onLogin={() => {}} // Not used in game anymore
          onLogout={handleLogout}
          activeChallenge={activeChallenge}
          challengeTimer={challengeTimer}
          onStartChallenge={startChallenge}
          currentSlotId={currentSlotId}
          language={language}
          setLanguage={setLanguage}
          xpGain={xpGain}
        />
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .mask-image-b { -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%); mask-image: linear-gradient(to bottom, transparent 0%, black 15%); }
        .writing-mode-vertical { writing-mode: vertical-rl; text-orientation: mixed; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}

export default App;
