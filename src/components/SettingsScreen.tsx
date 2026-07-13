import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { Configuracion } from '../types';

interface SettingsScreenProps {
  currentConfig: Configuracion;
  onBack: () => void;
  onSave: (newConfig: Configuracion) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function SettingsScreen({
  currentConfig,
  onBack,
  onSave,
  showToast,
}: SettingsScreenProps) {
  // USD State
  const [usdCompra, setUsdCompra] = useState((currentConfig.USD?.Compra ?? 6.86).toString());
  const [usdVenta, setUsdVenta] = useState((currentConfig.USD?.Venta ?? 6.96).toString());

  // EUR State
  const [eurCompra, setEurCompra] = useState((currentConfig.EUR?.Compra ?? 7.45).toString());
  const [eurVenta, setEurVenta] = useState((currentConfig.EUR?.Venta ?? 7.65).toString());

  // PEN State
  const [penCompra, setPenCompra] = useState((currentConfig.PEN?.Compra ?? 1.80).toString());
  const [penVenta, setPenVenta] = useState((currentConfig.PEN?.Venta ?? 1.95).toString());

  // Saldos Iniciales State
  const [initBob, setInitBob] = useState((currentConfig.SaldosIniciales?.BOB ?? 0).toString());
  const [initUsd, setInitUsd] = useState((currentConfig.SaldosIniciales?.USD ?? 0).toString());
  const [initEur, setInitEur] = useState((currentConfig.SaldosIniciales?.EUR ?? 0).toString());
  const [initPen, setInitPen] = useState((currentConfig.SaldosIniciales?.PEN ?? 0).toString());

  const [isSaving, setIsSaving] = useState(false);

  // Sync state if currentConfig updates
  useEffect(() => {
    if (currentConfig.USD) {
      setUsdCompra(currentConfig.USD.Compra.toString());
      setUsdVenta(currentConfig.USD.Venta.toString());
    }
    if (currentConfig.EUR) {
      setEurCompra(currentConfig.EUR.Compra.toString());
      setEurVenta(currentConfig.EUR.Venta.toString());
    }
    if (currentConfig.PEN) {
      setPenCompra(currentConfig.PEN.Compra.toString());
      setPenVenta(currentConfig.PEN.Venta.toString());
    }
    if (currentConfig.SaldosIniciales) {
      setInitBob((currentConfig.SaldosIniciales.BOB ?? 0).toString());
      setInitUsd((currentConfig.SaldosIniciales.USD ?? 0).toString());
      setInitEur((currentConfig.SaldosIniciales.EUR ?? 0).toString());
      setInitPen((currentConfig.SaldosIniciales.PEN ?? 0).toString());
    }
  }, [currentConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const uC = parseFloat(usdCompra);
    const uV = parseFloat(usdVenta);
    const eC = parseFloat(eurCompra);
    const eV = parseFloat(eurVenta);
    const pC = parseFloat(penCompra);
    const pV = parseFloat(penVenta);

    const iBOB = parseFloat(initBob) || 0;
    const iUSD = parseFloat(initUsd) || 0;
    const iEUR = parseFloat(initEur) || 0;
    const iPEN = parseFloat(initPen) || 0;

    if ([uC, uV, eC, eV, pC, pV].some(val => isNaN(val) || val <= 0)) {
      showToast('Todos los tipos de cambio deben ser números mayores a cero.', 'error');
      return;
    }

    if ([iBOB, iUSD, iEUR, iPEN].some(val => isNaN(val) || val < 0)) {
      showToast('Todos los saldos iniciales de caja deben ser números mayores o iguales a cero.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const newConfig: Configuracion = {
        USD: { Compra: uC, Venta: uV },
        EUR: { Compra: eC, Venta: eV },
        PEN: { Compra: pC, Venta: pV },
        SaldosIniciales: {
          BOB: iBOB,
          USD: iUSD,
          EUR: iEUR,
          PEN: iPEN
        }
      };
      await onSave(newConfig);
      showToast('Configuración y Saldos Iniciales actualizados.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar la configuración.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-3 bg-white text-slate-700 font-bold text-lg rounded-2xl border-2 border-slate-200/80 active:bg-slate-50 active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
          <span>Atrás</span>
        </button>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          ⚙ Tasas de Cambio
        </h2>
        <div className="w-12"></div>
      </div>

      {/* Info Block */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 mb-5">
        <Info className="w-6 h-6 text-slate-600 shrink-0 mt-0.5" />
        <p className="text-slate-600 text-sm font-medium leading-relaxed">
          Establece los tipos de cambio de referencia en Bolivianos para cada divisa. Se cargarán por defecto al registrar compras o ventas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* USD Section */}
        <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2 border-b pb-2">
            <span>💵</span> Dólar Americano (USD)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">Compra</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-slate-400">Bs</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={usdCompra}
                  onChange={(e) => setUsdCompra(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 bg-slate-50 border-2 border-emerald-100 rounded-xl font-mono text-right text-lg font-black text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 uppercase mb-1">Venta</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-slate-400">Bs</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={usdVenta}
                  onChange={(e) => setUsdVenta(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 bg-slate-50 border-2 border-amber-100 rounded-xl font-mono text-right text-lg font-black text-slate-800 focus:bg-white focus:border-amber-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* EUR Section */}
        <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2 border-b pb-2">
            <span>💶</span> Euro (EUR)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">Compra</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-slate-400">Bs</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={eurCompra}
                  onChange={(e) => setEurCompra(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 bg-slate-50 border-2 border-emerald-100 rounded-xl font-mono text-right text-lg font-black text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 uppercase mb-1">Venta</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-slate-400">Bs</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={eurVenta}
                  onChange={(e) => setEurVenta(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 bg-slate-50 border-2 border-amber-100 rounded-xl font-mono text-right text-lg font-black text-slate-800 focus:bg-white focus:border-amber-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* PEN Section */}
        <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2 border-b pb-2">
            <span>🇵🇪</span> Sol Peruano (PEN)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">Compra</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-slate-400">Bs</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={penCompra}
                  onChange={(e) => setPenCompra(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 bg-slate-50 border-2 border-emerald-100 rounded-xl font-mono text-right text-lg font-black text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 uppercase mb-1">Venta</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-slate-400">Bs</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={penVenta}
                  onChange={(e) => setPenVenta(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 bg-slate-50 border-2 border-amber-100 rounded-xl font-mono text-right text-lg font-black text-slate-800 focus:bg-white focus:border-amber-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Saldos Iniciales Section */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 border-2 border-slate-800 shadow-sm">
          <h3 className="text-lg font-black text-slate-100 mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <span>🏦</span> Saldos de Caja Iniciales (Monto Base)
          </h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed font-semibold">
            Ingresa los montos de efectivo con los que inicias en caja. El sistema sumará o restará las transacciones para calcular el saldo actual.
          </p>

          <div className="grid grid-cols-2 gap-3.5">
            {/* BOB */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Bolivianos (BOB)</label>
              <div className="relative flex items-center text-slate-900">
                <span className="absolute left-3 text-sm font-bold text-slate-400">Bs</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={initBob}
                  onChange={(e) => setInitBob(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 bg-slate-950 border-2 border-slate-800 rounded-xl font-mono text-right text-lg font-bold text-slate-100 focus:border-slate-500 focus:bg-slate-900 outline-none"
                  required
                />
              </div>
            </div>

            {/* USD */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Dólares (USD)</label>
              <div className="relative flex items-center text-slate-900">
                <span className="absolute left-3 text-sm font-bold text-slate-400">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={initUsd}
                  onChange={(e) => setInitUsd(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 bg-slate-950 border-2 border-slate-800 rounded-xl font-mono text-right text-lg font-bold text-slate-100 focus:border-slate-500 focus:bg-slate-900 outline-none"
                  required
                />
              </div>
            </div>

            {/* EUR */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Euros (EUR)</label>
              <div className="relative flex items-center text-slate-900">
                <span className="absolute left-3 text-sm font-bold text-slate-400">€</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={initEur}
                  onChange={(e) => setInitEur(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 bg-slate-950 border-2 border-slate-800 rounded-xl font-mono text-right text-lg font-bold text-slate-100 focus:border-slate-500 focus:bg-slate-900 outline-none"
                  required
                />
              </div>
            </div>

            {/* PEN */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Soles (PEN)</label>
              <div className="relative flex items-center text-slate-900">
                <span className="absolute left-3 text-sm font-bold text-slate-400">S/.</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={initPen}
                  onChange={(e) => setInitPen(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 bg-slate-950 border-2 border-slate-800 rounded-xl font-mono text-right text-lg font-bold text-slate-100 focus:border-slate-500 focus:bg-slate-900 outline-none"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Big Save Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSaving}
          className="w-full py-5 px-6 bg-slate-900 hover:bg-slate-950 text-white font-black text-2xl rounded-3xl shadow-xl transition-colors flex items-center justify-center gap-3 border-b-4 border-slate-950"
        >
          <Save className="w-7 h-7" />
          <span>{isSaving ? 'Guardando...' : 'Guardar Todo'}</span>
        </motion.button>
      </form>
    </div>
  );
}
