/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Truck, Play, ShieldCheck, Zap, Save, BookOpen, LogIn, LogOut, Trophy, Star, Target, Mail, Lock, User as UserIcon, ArrowRight, Fingerprint, Hammer } from 'lucide-react';
import { SaveSlot, GameMode, UserProgress, Language } from '../types';
import { translations } from '../locales';

interface StartScreenProps {
  onStart: (slotId: number, mode: GameMode) => void;
  saveSlots: SaveSlot[];
  userProgress: UserProgress | null;
  onSignIn: (name: string) => Promise<void>;
  onSignOut: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, saveSlots, userProgress, onSignIn, onSignOut, language, setLanguage }) => {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [hasLicense, setHasLicense] = useState<boolean>(() => {
    return localStorage.getItem('optistock_pro_license') === 'valid';
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = translations[language].startScreen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setLoading(true);
    try {
      await onSignIn(name);
    } catch (err: any) {
      setError(err.message || 'Identification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;
    setError('');
    setLoading(true);
    
    // Admin / Developer Bypass
    if (licenseKey === 'OPTI-ADMIN-2026') {
      localStorage.setItem('optistock_pro_license', 'valid');
      setHasLicense(true);
      setLoading(false);
      return;
    }

    try {
      // NOTE: Replace 'YOUR_GUMROAD_PRODUCT_PERMALINK' with your actual Gumroad product permalink
      const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_permalink: 'optistockpro', // Placeholder - CHANGE THIS IN PRODUCTION
          license_key: licenseKey
        })
      });
      const data = await res.json();
      
      if (data.success && !data.purchase.refunded) {
        localStorage.setItem('optistock_pro_license', 'valid');
        setHasLicense(true);
      } else {
        setError(data.message || 'Invalid license key');
      }
    } catch (err) {
      setError('Verification failed. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 text-white font-sans bg-slate-950/80 backdrop-blur-xl transition-all duration-1000 overflow-y-auto overflow-x-hidden custom-scrollbar">
      <div className="min-h-full w-full flex flex-col items-center justify-start md:justify-center p-4 md:p-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-5xl w-full bg-slate-900/95 p-6 md:p-12 rounded-[1.5rem] md:rounded-[2rem] border border-slate-700/50 shadow-[0_0_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative overflow-hidden my-auto"
        >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-40"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500 rounded-2xl shadow-lg shadow-yellow-500/20">
                <Package className="w-8 h-8 text-slate-900" />
              </div>
              <div>
                <span className="text-yellow-500 font-black tracking-[0.2em] text-xs uppercase block mb-1">{t.title}</span>
                <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tighter leading-none">
                  {t.subtitle} <span className="text-yellow-500">{t.pro}</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLanguage('es')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${language === 'es' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ES
                </button>
              </div>
              <div className="flex items-center gap-4 bg-slate-800/50 p-2 pr-4 rounded-2xl border border-slate-700">
                <div className="w-10 h-10 rounded-xl border border-slate-600 bg-slate-700 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-slate-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-100">{userProgress?.displayName || t.operatorName}</span>
                  {userProgress?.uid !== 'local' && (
                    <button onClick={onSignOut} className="text-[10px] text-slate-400 hover:text-red-400 font-bold uppercase tracking-widest transition-colors flex items-center gap-1">
                      <LogOut className="w-3 h-3" /> {t.exitSystem}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!hasLicense ? (
             <div className="bg-slate-800/40 p-8 rounded-[2rem] border border-slate-700/50 backdrop-blur-md max-w-md mx-auto my-12 shadow-2xl shadow-yellow-500/10">
                <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-yellow-500" />
                  Product Activation
                </h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                  Enter your Gumroad license key to verify your purchase and permanently unlock Optistock Pro on this device.
                </p>

                <form onSubmit={handleLicenseSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">License Key</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input 
                        type="text" 
                        required
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 font-mono text-sm tracking-widest focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-700"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center">
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading || !licenseKey.trim()}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-700 text-slate-900 py-5 rounded-2xl font-black text-sm transition-all shadow-xl shadow-yellow-500/10 flex items-center justify-center gap-2 uppercase tracking-widest"
                  >
                    {loading ? 'Verifying...' : 'Verify & Unlock'}
                    {!loading && <ArrowRight className="w-5 h-5" />}
                  </button>
                </form>
             </div>
          ) : !userProgress ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-10">
              <div className="hidden lg:block">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mb-8 border border-yellow-500/20">
                  <Fingerprint className="w-10 h-10 text-yellow-500" />
                </div>
                <h2 className="text-4xl font-black mb-6 leading-tight">{t.operatorId}</h2>
                <p className="text-slate-400 text-lg leading-relaxed mb-8">
                  {t.welcomeMsg}
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-sm font-bold uppercase tracking-widest">{t.instantInit}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-bold uppercase tracking-widest">{t.realTimeTrack}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 p-8 rounded-[2rem] border border-slate-700/50 backdrop-blur-md">
                <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                  {t.initConnection}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.operatorName}</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t.enterName}
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold tracking-wider focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-700"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold">
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-700 text-slate-900 py-5 rounded-2xl font-black text-sm transition-all shadow-xl shadow-yellow-500/10 flex items-center justify-center gap-2 uppercase tracking-widest"
                  >
                    {loading ? t.initializing : t.startCareer}
                    {!loading && <ArrowRight className="w-5 h-5" />}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                    {t.authPersonnel}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              {/* Stats Column */}
              <div className="lg:col-span-1 flex flex-col gap-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> {t.operatorProfile}
                </h3>
                
                <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">{t.currentLevel}</span>
                      <span className="text-4xl font-black font-mono text-white">{userProgress?.level || 1}</span>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                      <Star className="w-8 h-8 text-blue-400 fill-blue-400/20" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
                        <span className="text-slate-400">{t.xp}</span>
                        <span className="text-white">{userProgress?.totalScore || 0} XP</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                          style={{ width: `${Math.min(100, ((userProgress?.totalScore || 0) % 1000) / 10)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.missions}</span>
                        <span className="text-lg font-black text-white">{userProgress?.completedChallenges?.length || 0}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.efficiency}</span>
                        <span className="text-lg font-black text-green-400">98.2%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => onStart(1, GameMode.Tutorial)}
                  className="w-full flex items-center justify-center gap-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 py-4 rounded-2xl font-black text-sm transition-all"
                >
                  <BookOpen className="w-5 h-5" />
                  {t.replayTutorial}
                </button>
              </div>

              {/* Save Slots Column */}
              <div className="lg:col-span-2">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" /> {t.activeOps}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {saveSlots.map((slot) => (
                    <div 
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`
                        p-6 rounded-3xl border-2 transition-all cursor-pointer group relative overflow-hidden
                        ${selectedSlot === slot.id ? 'border-yellow-500 bg-yellow-500/10' : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'}
                      `}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">{t.slot} {slot.id}</span>
                          <span className="font-black text-xl text-slate-100">{slot.name}</span>
                        </div>
                        {!slot.isEmpty && (
                          <div className="bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30">
                            <span className="text-[10px] text-green-400 font-black font-mono">${slot.stats.money.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {slot.isEmpty ? (
                        <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl">
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t.noData}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {slot.stats.score} {t.score}</span>
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {slot.stats.efficiency}% {t.eff}</span>
                        </div>
                      )}

                      {selectedSlot === slot.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col sm:flex-row gap-3 mt-6"
                        >
                          <button 
                            onClick={(e) => { e.stopPropagation(); onStart(slot.id, GameMode.Design); }}
                            className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest"
                          >
                            <Hammer className="w-4 h-4" />
                            {t.design}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onStart(slot.id, GameMode.Forklift); }}
                            className="flex-1 py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/20 uppercase tracking-widest"
                          >
                            <Play className="w-4 h-4" />
                            {t.shift}
                          </button>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-slate-800 pt-8 mt-4">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{t.networkStatus}</span>
                <span className="text-xs text-green-400 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  {t.encryptedConn}
                </span>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-500 font-bold opacity-50 text-right leading-tight">
              By. OWLS solutions<br />
              Ing. Cristian Javier Cano M (MsC)
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);
};

export default StartScreen;
