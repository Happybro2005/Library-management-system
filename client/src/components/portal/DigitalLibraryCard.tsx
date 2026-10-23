import React, { useState } from 'react';
import { Library, Check, Copy, Printer, ShieldCheck, Sparkles, QrCode, Ban, ShieldAlert } from 'lucide-react';

interface DigitalLibraryCardProps {
  patron: {
    membershipNo: string;
    fullName: string;
    email: string;
    status: string;
    createdAt?: string;
  };
  libraryName?: string;
}

export const DigitalLibraryCard: React.FC<DigitalLibraryCardProps> = ({ patron, libraryName = 'Metropolitan Central Library' }) => {
  const [copied, setCopied] = useState(false);
  const isBlocked = patron.status === 'BLOCKED';

  const handleCopy = () => {
    navigator.clipboard.writeText(patron.membershipNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate stylized barcode lines based on membership string
  const barcodeBars = patron.membershipNo
    .split('')
    .map((char, index) => {
      const code = char.charCodeAt(0);
      return {
        width: (code % 3) + 2,
        space: (code % 2) + 2,
        key: `${char}-${index}`,
      };
    });

  return (
    <div className="relative group">
      {/* Outer ambient blur */}
      <div
        className={`absolute -inset-0.5 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500 ${
          isBlocked
            ? 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-600'
            : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
        }`}
      ></div>

      {/* Card Body */}
      <div
        className={`relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 rounded-3xl p-6 shadow-2xl overflow-hidden text-white flex flex-col justify-between min-h-[220px] ${
          isBlocked ? 'border-2 border-rose-500/50' : 'border border-indigo-500/30'
        }`}
      >
        {/* Background watermark icon */}
        <div className="absolute -right-8 -bottom-8 w-44 h-44 text-indigo-500/10 pointer-events-none transform -rotate-12">
          <Library className="w-full h-full" />
        </div>

        {/* Card Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner">
              <Library className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center space-x-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Digital Library Pass</span>
              </div>
              <div className="text-xs font-semibold text-white/90">{libraryName}</div>
            </div>
          </div>

          {isBlocked ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
              <Ban className="w-3 h-3" />
              <span>SUSPENDED</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>{patron.status || 'ACTIVE'}</span>
            </span>
          )}
        </div>

        {/* Card Middle: Patron Details */}
        <div className="my-4 relative z-10">
          <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider">Patron Name</div>
          <div className="text-lg font-bold tracking-tight text-white">{patron.fullName}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">{patron.email}</div>
        </div>

        {/* Card Footer: Stylized Barcode & Membership ID */}
        <div className="pt-3 border-t border-indigo-500/20 flex items-end justify-between relative z-10">
          <div>
            <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider mb-1">
              Membership ID
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold tracking-widest text-white bg-slate-950/60 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                {patron.membershipNo}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 text-indigo-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Copy Membership ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Barcode visual preview */}
          <div className="flex flex-col items-end">
            <div className="flex items-center h-8 bg-white/90 px-2 py-1 rounded-sm shadow-xs space-x-[2px]">
              {barcodeBars.map((bar) => (
                <div
                  key={bar.key}
                  className="bg-black h-full"
                  style={{ width: `${bar.width}px`, marginRight: `${bar.space}px` }}
                />
              ))}
            </div>
            <span className="text-[9px] font-mono text-slate-400 mt-1">Scan for Circulation Desk</span>
          </div>
        </div>
      </div>
    </div>
  );
};
