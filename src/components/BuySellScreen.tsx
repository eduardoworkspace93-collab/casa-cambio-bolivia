import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Configuracion, DivisaType } from '../types';

interface BuySellScreenProps {
  type: 'Compra' | 'Venta';
  config: Configuracion;
  onBack: () => void;
  onSave: (data: { Cantidad: number; TipoCambio: number; TipoOperacion: 'Compra' | 'Venta'; Divisa: DivisaType }) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error') => void;
  saldos: {
    USD: number;
    EUR: number;
    PEN: number;
    BOB: number;
  };
}

const DIVISA_DETAILS: Record<DivisaType, { name: string; symbol: string; flag: string }> = {
  USD: { name: 'Dólares', symbol: '$', flag: '💵' },
  EUR: { name: 'Euros', symbol: '€', flag: '💶' },
  PEN: { name: 'Soles', symbol: 'S/.', flag: '🇵🇪' },
};

export default function BuySellScreen({
  type,
  config,
  onBack,
  onSave,
  showToast,
  saldos,
}: BuySellScreenProps) {
  const [selectedDivisa, setSelectedDivisa] = useState<DivisaType>('USD');
  const [cantidadStr, setCantidadStr] = useState<string>('');
  
  // Get active rate for selected divisa and type (Compra/Venta)
  const getRate = (div: DivisaType) => {
    const divRates = config[div] || { Compra: 1, Venta: 1 };
    return type === 'Compra' ? divRates.Compra : divRates.Venta;
  };

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

  const [tipoCambioStr, setTipoCambioStr] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const cantidadInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus quantity input on load
  useEffect(() => {
    if (cantidadInputRef.current) {
      cantidadInputRef.current.focus();
    }
  }, []);

  // Keep exchange rate blank when divisa changes so the user manually inputs it
  useEffect(() => {
    setTipoCambioStr('');
  }, [selectedDivisa]);

  const cantidad = parseFormattedNumber(cantidadStr);
  const tipoCambio = parseFloat(tipoCambioStr) || 0;
  const totalBs = Math.round(cantidad * tipoCambio * 100) / 100;

  // Presets for quick adding based on selected currency
  const handleAddCantidad = (amount: number) => {
    const current = parseFormattedNumber(cantidadStr);
    const newAmount = current + amount;
    setCantidadStr(formatWithThousandsSeparator(newAmount.toString()));
  };

  const handleClear = () => {
    setCantidadStr('');
    if (cantidadInputRef.current) {
      cantidadInputRef.current.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cantidad <= 0) {
      showToast('Por favor, ingrese una cantidad mayor a cero.', 'error');
      return;
    }

    if (tipoCambio <= 0) {
      showToast('Por favor, ingrese un tipo de cambio mayor a cero.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        Cantidad: cantidad,
        TipoCambio: tipoCambio,
        TipoOperacion: type,
        Divisa: selectedDivisa,
      });
      setCantidadStr('');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar la operación.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const currentDetails = DIVISA_DETAILS[selectedDivisa];
  const defaultRate = getRate(selectedDivisa);

  const themeBg = type === 'Compra' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600';
  const themeBorder = type === 'Compra' ? 'border-emerald-700' : 'border-amber-600';
  const themeText = type === 'Compra' ? 'text-emerald-700' : 'text-amber-700';
  const themeCardBg = type === 'Compra' ? 'bg-emerald-50/75 border-emerald-100' : 'bg-amber-50/75 border-amber-100';

  return (
    <div className="max-w-md mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-3 bg-white text-slate-700 font-bold text-lg rounded-2xl border-2 border-slate-200/80 active:bg-slate-50 active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
          <span>Atrás</span>
        </button>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {type === 'Compra' ? '💵 Comprar' : '💰 Vender'}
        </h2>
        <div className="w-12"></div>
      </div>

      {/* Currency Selector Tabs (Tactile & Giant) */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-150 border-2 border-slate-200 rounded-3xl mb-5">
        {(['USD', 'EUR', 'PEN'] as DivisaType[]).map((div) => {
          const isSelected = selectedDivisa === div;
          return (
            <button
              key={div}
              type="button"
              onClick={() => setSelectedDivisa(div)}
              className={`py-2 sm:py-3.5 text-xs sm:text-base md:text-lg font-black rounded-2xl transition-all flex items-center justify-center gap-1 ${
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Quantity Field */}
        <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm">
          <div className="flex flex-col xs:flex-row xs:justify-between xs:items-start sm:items-center gap-1.5 mb-2.5">
            <label className="block text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-wider leading-tight">
              {type === 'Compra' ? 'Cantidad a Recibir' : 'Cantidad a Entregar'} ({currentDetails.name})
            </label>
            {type === 'Venta' && (
              <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                cantidad > saldos[selectedDivisa]
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                Disponible: {saldos[selectedDivisa].toLocaleString('es-BO', { minimumFractionDigits: 2 })} {selectedDivisa}
              </span>
            )}
          </div>
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
                // If user entered a comma at the end, treat it as a dot for decimal input
                let processed = val;
                if (processed.endsWith(',')) {
                  processed = processed.slice(0, -1) + '.';
                }
                // Strip all commas (which are formatting thousands separators)
                const clean = processed.replace(/,/g, '');
                // Format with proper thousands separators
                setCantidadStr(formatWithThousandsSeparator(clean));
              }}
              className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-4xl font-black text-slate-900 font-mono text-right focus:border-slate-400 focus:bg-white outline-none transition-all"
              required
            />
            {cantidadStr && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-4 p-1.5 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors"
                aria-label="Limpiar campo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Exchange Rate Field */}
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
                // Map commas to dots for standard decimal parsing
                const mappedVal = val.replace(/,/g, '.');
                // Validate that it's a valid decimal string (digits, optionally followed by at most one dot and more digits)
                if (mappedVal === '' || /^[0-9]*\.?[0-9]*$/.test(mappedVal)) {
                  setTipoCambioStr(mappedVal);
                }
              }}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-2xl font-bold text-slate-900 font-mono text-right focus:border-slate-400 focus:bg-white outline-none transition-all"
              required
            />
          </div>
        </div>

        {/* Huge Automatic Total Area */}
        <div className={`rounded-3xl p-6 border-2 shadow-inner ${themeCardBg} transition-all duration-300`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-500 font-bold text-sm uppercase tracking-wider">
              {type === 'Compra' ? 'Total a Entregar (Bolivianos)' : 'Total a Recibir (Bolivianos)'}
            </span>
            {type === 'Compra' ? (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                totalBs > saldos.BOB
                  ? 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse'
                  : 'bg-emerald-100/80 text-emerald-800 border border-emerald-200'
              }`}>
                Disponible: {saldos.BOB.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs
              </span>
            ) : (
              <span className="text-xs bg-white border border-slate-200/80 text-slate-500 py-1 px-2.5 rounded-full font-bold">
                Cálculo Automático
              </span>
            )}
          </div>
          {(() => {
            const formattedTotal = totalBs.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const len = formattedTotal.length;
            // Determine font sizes based on formatted text length to ensure it never overflows
            let fontSizeClass = 'text-4xl xs:text-5xl sm:text-6xl';
            if (len > 14) {
              fontSizeClass = 'text-2xl xs:text-3xl sm:text-4xl';
            } else if (len > 10) {
              fontSizeClass = 'text-3xl xs:text-4xl sm:text-5xl';
            }
            return (
              <div className="flex items-baseline justify-end gap-1.5 mt-2 flex-wrap overflow-hidden max-w-full">
                <span className={`${fontSizeClass} font-black font-display tracking-tight break-all ${type === 'Compra' ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {formattedTotal}
                </span>
                <span className={`text-xl sm:text-2xl font-extrabold shrink-0 ${type === 'Compra' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  Bs
                </span>
              </div>
            );
          })()}
        </div>

        {/* Large, High Contrast Save Button */}
        <motion.button
          whileTap={!(isSaving || cantidad <= 0 || (type === 'Venta' && cantidad > saldos[selectedDivisa]) || (type === 'Compra' && totalBs > saldos.BOB)) ? { scale: 0.98 } : undefined}
          type="submit"
          disabled={isSaving || cantidad <= 0 || (type === 'Venta' && cantidad > saldos[selectedDivisa]) || (type === 'Compra' && totalBs > saldos.BOB)}
          className={`w-full py-5 px-6 ${
            (type === 'Venta' && cantidad > saldos[selectedDivisa]) || (type === 'Compra' && totalBs > saldos.BOB)
              ? 'bg-rose-600 border-rose-800 hover:bg-rose-700 border-b-rose-900 cursor-not-allowed'
              : themeBg
          } disabled:bg-slate-300 disabled:border-slate-400 text-white font-black text-2xl rounded-3xl shadow-xl transition-colors flex items-center justify-center gap-3 border-b-4 ${themeBorder} disabled:border-b-2`}
        >
          <Save className="w-7 h-7" />
          <span>
            {isSaving 
              ? 'Guardando...' 
              : (type === 'Venta' && cantidad > saldos[selectedDivisa]) || (type === 'Compra' && totalBs > saldos.BOB)
                ? 'Saldo Insuficiente ⚠️'
                : 'Guardar Operación'}
          </span>
        </motion.button>
      </form>
    </div>
  );
}
