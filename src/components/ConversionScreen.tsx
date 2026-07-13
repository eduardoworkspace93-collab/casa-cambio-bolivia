import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Configuracion, DivisaType } from '../types';

interface ConversionScreenProps {
  config: Configuracion;
  onBack: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const DIVISA_DETAILS: Record<DivisaType, { name: string; symbol: string; flag: string }> = {
  USD: { name: 'Dólares', symbol: '$', flag: '💵' },
  EUR: { name: 'Euros', symbol: '€', flag: '💶' },
  PEN: { name: 'Soles', symbol: 'S/.', flag: '🇵🇪' },
};

export default function ConversionScreen({
  config,
  onBack,
  showToast,
}: ConversionScreenProps) {
  const [selectedDivisa, setSelectedDivisa] = useState<DivisaType>('USD');
  const [mode, setMode] = useState<'Compra' | 'Venta'>('Compra');
  const [cantidadStr, setCantidadStr] = useState<string>('');

  // Helper to format string with thousands separator (comma) and decimal point (dot)
  const formatWithThousandsSeparator = (value: string): string => {
    // Strip all characters except digits and the first dot
    let clean = value.replace(/[^0-9.]/g, '');
    const dotIndex = clean.indexOf('.');
    if (dotIndex !== -1) {
      clean = clean.substring(0, dotIndex + 1) + clean.substring(dotIndex + 1).replace(/\./g, '');
    }
    
    const parts = clean.split('.');
    let integerPart = parts[0];
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    if (parts.length > 1) {
      return `${formattedInteger}.${parts[1].substring(0, 2)}`;
    }
    if (value.endsWith('.')) {
      return `${formattedInteger}.`;
    }
    return formattedInteger;
  };

  const parseFormattedNumber = (val: string): number => {
    const clean = val.replace(/,/g, '');
    return parseFloat(clean) || 0;
  };

  const getRate = (div: DivisaType, m: 'Compra' | 'Venta') => {
    const rates = config[div] || { Compra: 1, Venta: 1 };
    return m === 'Compra' ? rates.Compra : rates.Venta;
  };

  const [tipoCambioStr, setTipoCambioStr] = useState<string>('');

  const cantidadInputRef = useRef<HTMLInputElement>(null);

  // Focus input when mounted
  useEffect(() => {
    if (cantidadInputRef.current) {
      cantidadInputRef.current.focus();
    }
  }, []);

  // Keep exchange rate blank when divisa or mode changes so the user manually inputs it
  useEffect(() => {
    setTipoCambioStr('');
  }, [selectedDivisa, mode]);

  const cantidad = parseFormattedNumber(cantidadStr);
  const tipoCambio = parseFloat(tipoCambioStr) || 0;
  const resultadoBs = Math.round(cantidad * tipoCambio * 100) / 100;

  const handleReset = () => {
    setCantidadStr('');
    setTipoCambioStr('');
    if (cantidadInputRef.current) {
      cantidadInputRef.current.focus();
    }
    showToast('Calculadora limpia. Lista para nueva conversión.', 'success');
  };

  const currentDetails = DIVISA_DETAILS[selectedDivisa];

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-3 bg-white text-slate-700 font-bold text-lg rounded-2xl border-2 border-slate-200/80 active:bg-slate-50 active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
          <span>Atrás</span>
        </button>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          🔄 Conversión Rápida
        </h2>
        <div className="w-12"></div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Warning Badge */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-blue-800 text-base font-semibold leading-snug">
            Esta es una calculadora de simulación. <span className="underline font-bold">No registrará nada</span> en el historial.
          </p>
        </div>

        {/* Currency Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 border-2 border-slate-200 rounded-3xl">
          {(['USD', 'EUR', 'PEN'] as DivisaType[]).map((div) => {
            const isSelected = selectedDivisa === div;
            return (
              <button
                key={div}
                type="button"
                onClick={() => setSelectedDivisa(div)}
                className={`py-2 sm:py-3 text-xs sm:text-base font-black rounded-2xl transition-all flex items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{DIVISA_DETAILS[div].flag}</span>
                <span className="hidden xs:inline">{div === 'USD' ? 'DÓLAR' : div === 'EUR' ? 'EURO' : 'SOLES'}</span>
                <span className="inline xs:hidden">{div}</span>
              </button>
            );
          })}
        </div>

        {/* Mode Selector - Massive and tactile */}
        <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-3xl border-2 border-slate-200">
          <button
            type="button"
            onClick={() => setMode('Compra')}
            className={`py-2.5 sm:py-3.5 text-xs xs:text-sm sm:text-lg font-black rounded-2xl transition-all ${
              mode === 'Compra'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <span>💵 Compra <span className="hidden sm:inline">(Recibes)</span></span>
          </button>
          <button
            type="button"
            onClick={() => setMode('Venta')}
            className={`py-2.5 sm:py-3.5 text-xs xs:text-sm sm:text-lg font-black rounded-2xl transition-all ${
              mode === 'Venta'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <span>💰 Venta <span className="hidden sm:inline">(Entregas)</span></span>
          </button>
        </div>

        {/* Quantity Field */}
        <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm">
          <label className="block text-slate-500 font-bold text-base uppercase tracking-wider mb-2">
            Cantidad a simular ({currentDetails.name})
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-4xl font-extrabold text-slate-400">
              {currentDetails.symbol}
            </span>
            <input
              ref={cantidadInputRef}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={cantidadStr}
              onChange={(e) => {
                const val = e.target.value;
                let processed = val;
                if (processed.endsWith(',')) {
                  processed = processed.slice(0, -1) + '.';
                }
                const clean = processed.replace(/,/g, '');
                setCantidadStr(formatWithThousandsSeparator(clean));
              }}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-4xl font-black text-slate-900 font-mono text-right focus:border-slate-400 focus:bg-white outline-none transition-all"
            />
          </div>
        </div>

        {/* Custom Exchange Rate for conversion */}
        <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm">
          <label className="block text-slate-500 font-bold text-base uppercase tracking-wider mb-2">
            Tipo de Cambio (BOB por {selectedDivisa})
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-2xl font-bold text-slate-400">Bs</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={tipoCambioStr}
              onChange={(e) => {
                const val = e.target.value;
                const mappedVal = val.replace(/,/g, '.');
                if (mappedVal === '' || /^[0-9]*\.?[0-9]*$/.test(mappedVal)) {
                  setTipoCambioStr(mappedVal);
                }
              }}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-2xl font-bold text-slate-900 font-mono text-right focus:border-slate-400 focus:bg-white outline-none transition-all"
            />
          </div>
        </div>

        {/* Live Simulation Result */}
        <div className={`rounded-3xl p-6 border-2 border-dashed overflow-hidden ${
          mode === 'Compra' ? 'bg-emerald-50/50 border-emerald-300' : 'bg-amber-50/50 border-amber-300'
        }`}>
          <span className="block text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-wider mb-2 text-center">
            Resultado de la Conversión (Equivalente en Bs)
          </span>
          {(() => {
            const formattedResult = resultadoBs.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const len = formattedResult.length;
            let fontSizeClass = 'text-3xl xs:text-4xl sm:text-5xl';
            if (len > 14) {
              fontSizeClass = 'text-xl xs:text-2xl sm:text-3xl';
            } else if (len > 10) {
              fontSizeClass = 'text-2xl xs:text-3xl sm:text-4xl';
            }
            return (
              <div className="flex items-baseline justify-center gap-1.5 flex-wrap overflow-hidden max-w-full">
                <span className={`${fontSizeClass} font-black font-display tracking-tight break-all text-center ${
                  mode === 'Compra' ? 'text-emerald-800' : 'text-amber-800'
                }`}>
                  {formattedResult}
                </span>
                <span className={`text-lg sm:text-2xl font-extrabold shrink-0 ${
                  mode === 'Compra' ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  Bs
                </span>
              </div>
            );
          })()}
        </div>

        {/* Big Reset Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleReset}
          className="w-full py-5 px-6 bg-slate-800 hover:bg-slate-900 text-white font-black text-xl rounded-3xl shadow-xl transition-colors flex items-center justify-center gap-3 border-b-4 border-slate-950"
        >
          <RefreshCw className="w-6 h-6" />
          <span>Nueva Conversión</span>
        </motion.button>
      </div>
    </div>
  );
}
