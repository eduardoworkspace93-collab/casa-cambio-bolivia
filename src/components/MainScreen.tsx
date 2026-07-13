import React from 'react';
import { DollarSign, ArrowLeftRight, History, Settings, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { Configuracion } from '../types';

interface MainScreenProps {
  config: Configuracion;
  onNavigate: (screen: 'buy' | 'sell' | 'convert' | 'history' | 'settings' | 'saldos') => void;
  saldos: {
    USD: number;
    EUR: number;
    PEN: number;
    BOB: number;
  };
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function MainScreen({ onNavigate }: MainScreenProps) {
  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto px-1 py-2">
      {/* 1. Main Button - Saldos de Caja */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate('saldos')}
        className="w-full flex items-center justify-between p-5 bg-slate-950 hover:bg-slate-900 text-white rounded-3xl shadow-xl border-2 border-slate-800 transition-all text-left group cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Wallet className="w-6 h-6 text-emerald-400 stroke-[2.2]" />
          </div>
          <div>
            <span className="block text-lg font-black tracking-tight text-slate-100">🏦 Saldos de Caja</span>
            <span className="block text-slate-400 text-xs font-semibold mt-0.5">Ingresar iniciales, ver balances y reiniciar caja</span>
          </div>
        </div>
        <span className="text-xl font-bold text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
      </motion.button>

      {/* Big Action Buttons - Super easy to click and navigate */}
      <div className="flex flex-col gap-4">
        {/* COMPRAR */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('buy')}
          className="w-full flex items-center justify-between p-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl shadow-lg shadow-emerald-600/15 border-b-4 border-emerald-800 transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <DollarSign className="w-9 h-9 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-2xl font-black tracking-wide">💵 Comprar Divisas</span>
              <span className="block text-emerald-100 text-base font-medium mt-0.5">Recibes dólares, euros o soles</span>
            </div>
          </div>
          <span className="text-3xl font-bold opacity-80 group-hover:translate-x-1 transition-transform">→</span>
        </motion.button>

        {/* VENDER */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('sell')}
          className="w-full flex items-center justify-between p-6 bg-amber-500 hover:bg-amber-600 text-white rounded-3xl shadow-lg shadow-amber-500/15 border-b-4 border-amber-700 transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <DollarSign className="w-9 h-9 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-2xl font-black tracking-wide">💰 Vender Divisas</span>
              <span className="block text-amber-50 font-medium mt-0.5">Entregas dólares, euros o soles</span>
            </div>
          </div>
          <span className="text-3xl font-bold opacity-80 group-hover:translate-x-1 transition-transform">→</span>
        </motion.button>

        {/* CONVERSION */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('convert')}
          className="w-full flex items-center justify-between p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl shadow-lg shadow-blue-600/15 border-b-4 border-blue-800 transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <ArrowLeftRight className="w-9 h-9 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-2xl font-black tracking-wide">🔄 Conversión</span>
              <span className="block text-blue-100 text-base font-medium mt-0.5">Calculadora rápida multi-divisa</span>
            </div>
          </div>
          <span className="text-3xl font-bold opacity-80 group-hover:translate-x-1 transition-transform">→</span>
        </motion.button>

        <div className="grid grid-cols-2 gap-4">
          {/* HISTORIAL */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('history')}
            className="flex flex-col items-center justify-center p-6 bg-white hover:bg-slate-50 text-slate-800 rounded-3xl shadow-md border-2 border-slate-200/80 border-b-4 transition-all text-center group cursor-pointer"
          >
            <div className="w-14 h-14 bg-violet-100 text-violet-700 rounded-2xl flex items-center justify-center mb-3">
              <History className="w-8 h-8 stroke-[2.2]" />
            </div>
            <span className="text-xl font-bold tracking-tight">📋 Historial</span>
            <span className="text-slate-400 text-xs mt-1 font-medium font-mono text-center">Excel, Ganancias y Arqueo</span>
          </motion.button>

          {/* CONFIGURACION */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('settings')}
            className="flex flex-col items-center justify-center p-6 bg-white hover:bg-slate-50 text-slate-800 rounded-3xl shadow-md border-2 border-slate-200/80 border-b-4 transition-all text-center group cursor-pointer"
          >
            <div className="w-14 h-14 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mb-3">
              <Settings className="w-8 h-8 stroke-[2.2]" />
            </div>
            <span className="text-xl font-bold tracking-tight">⚙ Configuración</span>
            <span className="text-slate-400 text-xs mt-1 font-medium font-mono">Cambiar Tasas</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
