import React, { useEffect, useState, useRef } from 'react';
import { Fuel } from 'lucide-react';

interface MobileControlsProps {
  onBuyFuel: () => void;
  showRefuel: boolean;
}

const MobileControls: React.FC<MobileControlsProps> = ({ onBuyFuel, showRefuel }) => {
  const [active, setActive] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeKeys = useRef<Set<string>>(new Set());

  // Function to dispatch a custom virtual key event
  const simulateKeyEvent = (type: 'keydown' | 'keyup', key: string) => {
    window.dispatchEvent(new CustomEvent(`virtual-${type}`, { detail: key }));
  };

  // Function to update which keys should be pressed based on joystick angle
  const updateKeys = (dx: number, dy: number) => {
    const threshold = 20; // Deadzone
    const newKeys = new Set<string>();

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      if (dy < -threshold) newKeys.add('w');
      if (dy > threshold) newKeys.add('s');
      if (dx < -threshold) newKeys.add('a');
      if (dx > threshold) newKeys.add('d');
    }

    // Release keys not in newKeys
    activeKeys.current.forEach((key) => {
      if (!newKeys.has(key)) {
        simulateKeyEvent('keyup', key);
      }
    });

    // Press new keys
    newKeys.forEach((key) => {
      if (!activeKeys.current.has(key)) {
        simulateKeyEvent('keydown', key);
      }
    });

    activeKeys.current = newKeys;
  };

  // Joystick touch handlers
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setActive(true);
    handleTouchMove(e);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!active || !joystickRef.current || !knobRef.current) return;
    e.preventDefault();

    const rect = joystickRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > radius) {
      dx = (dx / distance) * radius;
      dy = (dy / distance) * radius;
    }

    knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    updateKeys(dx, dy);
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setActive(false);
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(0px, 0px)`;
    }
    updateKeys(0, 0); // Release all
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-end justify-between p-4 pb-8 md:p-8 md:pb-16 touch-none">
      {/* Left side: Joystick */}
      <div className="pointer-events-auto">
        <div 
          ref={joystickRef}
          className="w-24 h-24 sm:w-28 sm:h-28 md:w-40 md:h-40 bg-white/10 border-2 border-white/20 rounded-full flex items-center justify-center relative backdrop-blur-md shadow-2xl"
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div 
            ref={knobRef}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-400/80 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)] border-2 border-yellow-500 absolute transition-transform duration-75 ease-out"
          />
        </div>
      </div>

      {/* Right side: Action Buttons & Refuel */}
      <div className="flex flex-col gap-2.5 pointer-events-auto items-end">
        {/* Refuel Button (Fuel Pump) */}
        {showRefuel && (
          <button
            onClick={onBuyFuel}
            onTouchStart={(e) => { e.preventDefault(); onBuyFuel(); }}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-full border-2 border-yellow-500 flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform shadow-lg shadow-yellow-500/20"
            title="Refuel / Recargar"
          >
            <Fuel className="w-5 h-5" />
          </button>
        )}

        <div className="flex gap-2 sm:gap-4 items-end">
          {/* Forks Down */}
          <button
            className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500/50 rounded-full border border-blue-400 text-white font-black text-lg flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform"
            onTouchStart={(e) => { e.preventDefault(); simulateKeyEvent('keydown', 'e'); }}
            onTouchEnd={(e) => { e.preventDefault(); simulateKeyEvent('keyup', 'e'); }}
            onMouseDown={() => simulateKeyEvent('keydown', 'e')}
            onMouseUp={() => simulateKeyEvent('keyup', 'e')}
          >
            ⬇
          </button>
          {/* Forks Up */}
          <button
            className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500/50 rounded-full border border-blue-400 text-white font-black text-lg flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform"
            onTouchStart={(e) => { e.preventDefault(); simulateKeyEvent('keydown', 'q'); }}
            onTouchEnd={(e) => { e.preventDefault(); simulateKeyEvent('keyup', 'q'); }}
            onMouseDown={() => simulateKeyEvent('keydown', 'q')}
            onMouseUp={() => simulateKeyEvent('keyup', 'q')}
          >
            ⬆
          </button>
          {/* Action (Space) */}
          <button
            className="w-14 h-14 sm:w-16 sm:h-16 bg-yellow-500/50 rounded-full border-2 border-yellow-400 text-white font-black text-xl flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform"
            onTouchStart={(e) => { e.preventDefault(); simulateKeyEvent('keydown', ' '); }}
            onTouchEnd={(e) => { e.preventDefault(); simulateKeyEvent('keyup', ' '); }}
            onMouseDown={() => simulateKeyEvent('keydown', ' ')}
            onMouseUp={() => simulateKeyEvent('keyup', ' ')}
          >
            A
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileControls;
