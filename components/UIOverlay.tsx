/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState } from 'react';
import { BuildingType, WarehouseStats, NewsItem, GameMode, Challenge, UserProgress, Language } from '../types';
import { BUILDINGS, TUTORIAL_STEPS, CHALLENGES } from '../constants';
import { translations } from '../locales';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Truck, 
  Fuel, 
  TrendingUp, 
  Calendar, 
  Hammer, 
  Play, 
  Settings, 
  AlertTriangle,
  CheckCircle2,
  Info,
  Save,
  LogOut,
  BookOpen,
  ChevronUp,
  ChevronDown,
  User,
  LogIn,
  Trophy,
  Timer,
  Target,
  Radio,
  Star
} from 'lucide-react';

interface UIOverlayProps {
  stats: WarehouseStats;
  selectedTool: BuildingType;
  onSelectTool: (type: BuildingType) => void;
  newsFeed: NewsItem[];
  gameMode: GameMode;
  onToggleMode: () => void;
  onBuyFuel: () => void;
  currentTask: { text: string, target: number, current: number } | null;
  tutorialStep: number | null;
  onSave: () => void;
  onExit: () => void;
  forksLevel: number;
  onForksUp: () => void;
  onForksDown: () => void;
  userProgress: UserProgress | null;
  onLogin: () => void;
  onLogout: () => void;
  activeChallenge: Challenge | null;
  challengeTimer: number;
  onStartChallenge: (challenge: Challenge) => void;
  currentSlotId: number;
  language: Language;
  setLanguage: (lang: Language) => void;
  xpGain: { amount: number, id: number } | null;
}

const tools = [
  BuildingType.None, // Bulldoze
  BuildingType.Floor,
  BuildingType.HeavyRack,
  BuildingType.CantileverRack,
  BuildingType.LoadingBay,
  BuildingType.Truck,
  BuildingType.Pallet,
  BuildingType.ForkliftStation,
  BuildingType.CrossDocking,
];

const ToolButton: React.FC<{
  type: BuildingType;
  isSelected: boolean;
  onClick: () => void;
  money: number;
  language: Language;
}> = ({ type, isSelected, onClick, money, language }) => {
  const config = BUILDINGS[type];
  const canAfford = money >= config.cost;
  const isBulldoze = type === BuildingType.None;
  const tBuildings = translations[language].buildings;
  
  // Map BuildingType to translation key
  const getTranslationKey = (type: BuildingType) => {
    switch(type) {
      case BuildingType.None: return 'bulldoze';
      case BuildingType.Floor: return 'floor';
      case BuildingType.HeavyRack: return 'heavyRack';
      case BuildingType.CantileverRack: return 'cantilever';
      case BuildingType.LoadingBay: return 'loadingBay';
      case BuildingType.Truck: return 'truck';
      case BuildingType.Pallet: return 'pallet';
      case BuildingType.ForkliftStation: return 'forkliftStation';
      case BuildingType.CrossDocking: return 'crossDocking';
      default: return 'floor';
    }
  };
  
  const key = getTranslationKey(type);
  const name = tBuildings[key as keyof typeof tBuildings];
  const descKey = `${key}Desc` as keyof typeof tBuildings;
  const description = tBuildings[descKey];

  return (
    <button
      onClick={onClick}
      disabled={!isBulldoze && !canAfford}
      className={`
        relative flex flex-col items-center justify-center rounded-xl border-2 transition-all shadow-lg backdrop-blur-md flex-shrink-0
        w-16 h-16 md:w-20 md:h-20
        ${isSelected ? 'border-yellow-400 bg-yellow-400/20 scale-110 z-10' : 'border-slate-700 bg-slate-900/80 hover:bg-slate-800'}
        ${!isBulldoze && !canAfford ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
      `}
      title={description}
    >
      <div className="w-8 h-8 md:w-10 md:h-10 rounded mb-1 border border-black/30 shadow-inner flex items-center justify-center overflow-hidden" style={{ backgroundColor: isBulldoze ? 'transparent' : config.color }}>
        {isBulldoze && <Hammer className="w-6 h-6 text-red-500" />}
        {!isBulldoze && type === BuildingType.Floor && <div className="w-full h-full bg-slate-600 opacity-50"></div>}
      </div>
      <span className="text-[8px] md:text-[10px] font-bold text-slate-200 uppercase tracking-wider leading-none text-center">{name}</span>
      {config.cost > 0 && (
        <span className={`text-[8px] md:text-[10px] font-mono leading-none mt-1 ${canAfford ? 'text-green-400' : 'text-red-400'}`}>${config.cost}</span>
      )}
    </button>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) => (
  <div className="bg-slate-900/90 text-white p-2 md:p-3 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md flex items-center gap-3 min-w-[120px]">
    <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
      <Icon className={`w-4 h-4 md:w-5 md:h-5 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div className="flex flex-col">
      <span className="text-[8px] md:text-[10px] text-slate-400 uppercase font-bold tracking-widest">{label}</span>
      <span className="text-sm md:text-lg font-black font-mono">{value}</span>
    </div>
  </div>
);

const UIOverlay: React.FC<UIOverlayProps> = ({
  stats,
  selectedTool,
  onSelectTool,
  newsFeed,
  gameMode,
  onToggleMode,
  onBuyFuel,
  currentTask,
  tutorialStep,
  onSave,
  onExit,
  forksLevel,
  onForksUp,
  onForksDown,
  userProgress,
  onLogin,
  onLogout,
  activeChallenge,
  challengeTimer,
  onStartChallenge,
  currentSlotId,
  language,
  setLanguage,
  xpGain
}) => {
  const newsRef = useRef<HTMLDivElement>(null);
  const t = translations[language].ui;

  const gameDay = Math.floor(stats.time / (24 * 60)) + 1;
  const totalMinutes = stats.time % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
  const timeString = `${formattedHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
  const displayTime = `DÍA ${gameDay} - ${timeString}`;

  useEffect(() => {
    if (newsRef.current) {
      newsRef.current.scrollTop = newsRef.current.scrollHeight;
    }
  }, [newsFeed]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 font-sans z-10">
      
      {/* Top Bar: Stats & Task */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start pointer-events-auto gap-4 w-full">
        
          {/* XP Gain Animation */}
          <AnimatePresence>
            {xpGain && (
              <motion.div
                key={xpGain.id}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: -20, scale: 1.2 }}
                exit={{ opacity: 0, y: -40, scale: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
              >
                <div className="flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-full border border-yellow-500/50 backdrop-blur-md shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                  <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                  <span className="text-2xl font-black text-yellow-400 drop-shadow-md">+{xpGain.amount} XP</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* Logo & Actions */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 bg-slate-900/80 p-2 pr-6 rounded-xl border border-slate-700 backdrop-blur-md">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <Package className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white leading-none">OPTISTOCK <span className="text-yellow-500">PRO</span></h1>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{t.wms}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="flex bg-slate-800/80 rounded-lg p-1 border border-slate-700">
              <button 
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('es')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${language === 'es' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                ES
              </button>
            </div>
            {!userProgress || userProgress.uid === 'local' ? (
              <div className="flex items-center gap-2 bg-slate-800/80 p-1 pr-3 rounded-lg border border-slate-700">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <User className="w-3 h-3 text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-white font-bold leading-none truncate max-w-[80px]">{userProgress?.displayName || t.operator}</span>
                  <button onClick={onLogout} className="text-[7px] text-slate-400 hover:text-red-400 font-bold uppercase tracking-widest text-left">{t.logout}</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-800/80 p-1 pr-3 rounded-lg border border-slate-700">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <User className="w-3 h-3 text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-white font-bold leading-none truncate max-w-[80px]">{userProgress.displayName}</span>
                  <button onClick={onLogout} className="text-[7px] text-slate-400 hover:text-red-400 font-bold uppercase tracking-widest text-left">{t.logout}</button>
                </div>
              </div>
            )}
            <button 
              onClick={onSave}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 backdrop-blur-md transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
            >
              <Save className="w-3 h-3" />
              {t.save}
            </button>
            <button 
              onClick={onExit}
              className="p-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 rounded-lg border border-red-500/30 backdrop-blur-md transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
            >
              <LogOut className="w-3 h-3" />
              {t.mainMenu}
            </button>
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="flex flex-wrap gap-2 md:gap-4">
          {userProgress && (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-2 md:p-3 rounded-xl border border-blue-400 shadow-xl backdrop-blur-md flex items-center gap-3 min-w-[120px]">
              <div className="p-2 rounded-lg bg-white/20">
                <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[10px] text-blue-100 uppercase font-bold tracking-widest">{t.operatorLvl}</span>
                <span className="text-sm md:text-lg font-black font-mono">{userProgress.level} <span className="text-[10px] opacity-70">({userProgress.totalScore} XP)</span></span>
              </div>
            </div>
          )}
          <StatCard 
            label={t.capital} 
            value={`$${stats.money.toLocaleString()}`} 
            icon={TrendingUp} 
            color="bg-green-500" 
          />
          <StatCard 
            label={t.fuel} 
            value={gameMode === GameMode.Tutorial ? "∞" : `${Math.round(stats.fuel)}%`} 
            icon={Fuel} 
            color={gameMode === GameMode.Tutorial ? "bg-blue-500" : (stats.fuel < 20 ? "bg-red-500" : "bg-blue-500")} 
          />
          <StatCard 
            label={t.efficiency} 
            value={`${stats.efficiency}%`} 
            icon={Package} 
            color="bg-yellow-500" 
          />
          <StatCard 
            label={t.score} 
            value={stats.score} 
            icon={CheckCircle2} 
            color="bg-purple-500" 
          />
          <StatCard 
            label={t.day || 'TIEMPO'} 
            value={gameMode === GameMode.Tutorial ? t.learning : displayTime} 
            icon={Calendar} 
            color="bg-slate-500" 
          />
        </div>

        {/* Task Panel */}
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="wait">
            {activeChallenge && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full md:w-80 bg-red-900/95 text-white rounded-xl border-2 border-red-500 shadow-2xl backdrop-blur-md overflow-hidden"
              >
                <div className="bg-red-600 px-4 py-2 flex justify-between items-center">
                  <span className="font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    {t.missionActive}
                  </span>
                  <span className="text-lg font-black font-mono">
                    {Math.floor(challengeTimer / 60)}:{(challengeTimer % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="p-3">
                  <h4 className="text-xs font-black uppercase text-red-200 mb-1">{translations[language].challenges[`${activeChallenge.id}Title` as keyof typeof translations['en']['challenges']] || activeChallenge.title}</h4>
                  <p className="text-[10px] leading-tight opacity-80">{translations[language].challenges[`${activeChallenge.id}Desc` as keyof typeof translations['en']['challenges']] || activeChallenge.description}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {currentTask && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full md:w-80 bg-slate-900/95 text-white rounded-xl border-2 border-yellow-500/50 shadow-2xl backdrop-blur-md overflow-hidden"
              >
                <div className="bg-yellow-500/20 px-4 py-2 flex justify-between items-center border-b border-yellow-500/30">
                  <span className="font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                    <Info className="w-4 h-4 text-yellow-400" />
                    {t.currentTask}
                  </span>
                  <span className="text-xs font-mono text-yellow-400">{currentTask.current}/{currentTask.target}</span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium text-slate-100 mb-3">"{currentTask.text}"</p>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-yellow-500 h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentTask.current / currentTask.target) * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tutorial Overlay */}
      {tutorialStep !== null && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 w-full max-w-md z-50 pointer-events-auto">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            key={tutorialStep}
            className="bg-blue-600 p-4 rounded-2xl border-2 border-blue-400 shadow-2xl text-white"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-xs uppercase tracking-widest mb-1 opacity-80">{t.academy} {tutorialStep + 1}</h3>
                <p className="text-sm font-bold leading-tight mb-3">
                  {translations[language].tutorial[`step${tutorialStep + 1}` as keyof typeof translations['en']['tutorial']] || TUTORIAL_STEPS[tutorialStep]?.text || "Design phase complete. You are now certified to operate the facility."}
                </p>
                {tutorialStep === TUTORIAL_STEPS.length - 1 && (
                  <button 
                    onClick={onToggleMode}
                    className="w-full bg-white text-blue-600 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg"
                  >
                    {t.startShift}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Center Feedback (Low Fuel) */}
      {stats.fuel < 10 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="bg-red-600/90 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border-2 border-red-400 backdrop-blur-md"
          >
            <AlertTriangle className="w-6 h-6" />
            <span className="font-black uppercase tracking-tighter text-xl italic">{t.lowFuel}</span>
          </motion.div>
        </div>
      )}

      {/* Bottom Bar: Tools & News */}
      <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-end pointer-events-auto mt-auto gap-4">
        
        {/* Left: Tools & News */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {/* Forklift Controls */}
          {(gameMode === GameMode.Forklift || gameMode === GameMode.Tutorial) && (
            <div className="flex flex-col gap-2">
              <div className="bg-slate-800/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest">{t.forksHeight}</span>
                  <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">LVL {forksLevel + 1}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={onForksUp}
                    disabled={forksLevel >= 2}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white py-2 rounded-xl transition-all flex items-center justify-center gap-2 font-bold text-sm"
                  >
                    <ChevronUp className="w-4 h-4" /> {t.up}
                  </button>
                  <button 
                    onClick={onForksDown}
                    disabled={forksLevel <= 0}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white py-2 rounded-xl transition-all flex items-center justify-center gap-2 font-bold text-sm"
                  >
                    <ChevronDown className="w-4 h-4" /> DOWN
                  </button>
                </div>
                <div className="text-[10px] text-white/40 text-center font-medium">{t.useKeys}</div>
              </div>
              
              {gameMode === GameMode.Forklift && (
                <button
                  onClick={onBuyFuel}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-tighter text-lg hover:bg-blue-500 transition-all shadow-xl flex items-center gap-2"
                >
                  <Fuel className="w-5 h-5" />
                  {t.refuel}
                </button>
              )}
            </div>
          )}
          </div>

          <AnimatePresence>
            {gameMode === GameMode.Design && (
              <div className="flex flex-col gap-2">
                {/* Challenges Panel */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl w-full md:w-64"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-red-400" />
                    <span className="text-white text-xs font-black uppercase tracking-widest">{t.availableMissions}</span>
                  </div>
                  <div className="space-y-2">
                    {CHALLENGES.filter(c => c.slotId === currentSlotId).map(challenge => {
                      const isCompleted = userProgress?.completedChallenges.includes(challenge.id);
                      return (
                        <button
                          key={challenge.id}
                          onClick={() => onStartChallenge(challenge)}
                          disabled={!!activeChallenge}
                          className={`
                            w-full text-left p-2 rounded-xl border transition-all group
                            ${isCompleted ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-800 border-slate-700 hover:border-yellow-500/50'}
                            ${activeChallenge ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black text-white uppercase truncate">{translations[language].challenges[`${challenge.id}Title` as keyof typeof translations['en']['challenges']] || challenge.title}</span>
                            {isCompleted && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                          </div>
                          <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-tighter">
                            <span className="text-slate-400">{challenge.targetPallets} {t.pallets}</span>
                            <span className="text-yellow-500">{challenge.baseScore} XP</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="flex gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-700 backdrop-blur-xl shadow-2xl overflow-x-auto no-scrollbar"
                >
                  {tools.map((type) => (
                    <ToolButton
                      key={type}
                      type={type}
                      isSelected={selectedTool === type}
                      onClick={() => onSelectTool(type)}
                      money={stats.money}
                      language={language}
                    />
                  ))}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: News Feed / Intercom */}
        <div className="w-full md:w-96 h-48 md:h-64 bg-slate-950/90 text-white rounded-2xl border border-slate-800 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden relative">
          <div className="bg-slate-900/80 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Radio className="w-3 h-3 text-blue-400 animate-pulse" />
              <span>{t.intercom}</span>
            </div>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-slate-600"></div>
              <div className="w-1 h-1 rounded-full bg-slate-600"></div>
              <div className="w-1 h-1 rounded-full bg-slate-600"></div>
            </div>
          </div>
          
          <div ref={newsRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs font-mono scroll-smooth">
            {newsFeed.length === 0 && <div className="text-slate-600 italic text-center mt-10">{t.waiting}</div>}
            {newsFeed.map((news) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={news.id} 
                className={`
                  relative pl-10 py-2 leading-tight group
                  ${news.type === 'positive' ? 'text-green-300' : ''}
                  ${news.type === 'negative' ? 'text-red-300' : ''}
                  ${news.type === 'mission' ? 'text-yellow-200 bg-yellow-500/5 rounded-lg p-2 pl-10' : ''}
                  ${news.type === 'neutral' ? 'text-blue-200' : ''}
                `}
              >
                {/* Avatar / Icon */}
                <div className="absolute left-0 top-2 w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden">
                  {news.sender === 'Controller' ? (
                    <div className="w-full h-full bg-blue-600 flex flex-col items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-full mb-0.5" />
                      <div className="w-6 h-2 bg-white rounded-t-full" />
                    </div>
                  ) : (
                    <Settings className="w-4 h-4 text-slate-500" />
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-50">
                      {news.sender || 'System'}
                    </span>
                    <span className="opacity-20 text-[7px]">
                      {new Date(Number(news.id.split('.')[0])).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
                    </span>
                  </div>
                  <span className="flex-1">{news.text}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-1 right-4 text-[9px] text-slate-500 font-mono uppercase tracking-widest">
        Optistock Pro v1.0.4 // System Ready
      </div>
    </div>
  );
};

export default UIOverlay;
