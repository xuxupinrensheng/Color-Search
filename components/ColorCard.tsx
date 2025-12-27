import React from 'react';
import { ColorData } from '../types';

interface ColorCardProps {
  data: ColorData;
}

const ColorCard: React.FC<ColorCardProps> = ({ data }) => {
  // Defensive check: if RGB is missing, default to white to prevent crash
  const r = data.rgb?.r ?? 255;
  const g = data.rgb?.g ?? 255;
  const b = data.rgb?.b ?? 255;
  
  // Determine if text should be white or black based on luminance
  const isDark = (r * 0.299 + g * 0.587 + b * 0.114) < 150;
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subTextColor = isDark ? 'text-white/80' : 'text-gray-900/70';

  return (
    <div className="w-full max-w-md mx-auto mt-6 transition-all duration-500 animate-fade-in-up">
      <div 
        className="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-black/10 aspect-[4/5] sm:aspect-square flex flex-col justify-between p-8"
        style={{ backgroundColor: data.hex || '#FFFFFF' }}
      >
        <div className={`flex justify-between items-start ${textColor}`}>
          <div>
            <h2 className="text-4xl font-bold tracking-tight">{data.code}</h2>
            <p className={`text-lg font-medium ${subTextColor} mt-1`}>{data.library}</p>
          </div>
        </div>

        <div className={`space-y-6 ${textColor}`}>
          <div>
            <h3 className="text-3xl font-bold leading-tight">{data.nameEN}</h3>
            <p className={`text-xl ${subTextColor}`}>{data.nameZH}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm font-mono backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20">
            <div>
              <p className="opacity-60 text-xs uppercase tracking-wider mb-1">RGB</p>
              <p>{r}, {g}, {b}</p>
            </div>
            <div>
              <p className="opacity-60 text-xs uppercase tracking-wider mb-1">HEX</p>
              <p>{data.hex}</p>
            </div>
            {data.lab && (
              <div className="col-span-2 pt-2 border-t border-white/10">
                <p className="opacity-60 text-xs uppercase tracking-wider mb-1">CIE L*a*b*</p>
                <div className="flex justify-between w-full max-w-[200px]">
                  <span>L: {typeof data.lab.l === 'number' ? data.lab.l.toFixed(1) : '--'}</span>
                  <span>a: {typeof data.lab.a === 'number' ? data.lab.a.toFixed(1) : '--'}</span>
                  <span>b: {typeof data.lab.b === 'number' ? data.lab.b.toFixed(1) : '--'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {data.description && (
        <div className="mt-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h4 className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-2">Analysis</h4>
          <p className="text-gray-800 leading-relaxed">{data.description}</p>
        </div>
      )}
    </div>
  );
};

export default ColorCard;