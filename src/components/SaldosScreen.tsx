import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, Plus, Eye, EyeOff, Save, RefreshCw, AlertTriangle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Configuracion, Operacion, DivisaType } from '../types';
import * as XLSX from 'xlsx';

interface SaldosScreenProps {
  config: Configuracion;
  saldos: {
    USD: number;
    EUR: number;
    PEN: number;
    BOB: number;
  };
  operaciones: Operacion[];
  onBack: () => void;
  onSaveConfig: (newConfig: Configuracion) => Promise<void>;
  onResetAll: () => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

// Helper to format string with dots for thousands and comma for decimal
const formatWithSpanishSeparators = (value: string, previousValue: string): string => {
  if (!value) return '';

  // If they just typed a dot at the end, and the previous value didn't have a comma,
  // convert that last dot to a comma.
  let adjustedValue = value;
  if (value.endsWith('.') && !previousValue.includes(',')) {
    adjustedValue = value.slice(0, -1) + ',';
  }
  
  // Strip all dots (thousands separators)
  let clean = adjustedValue.replace(/\./g, '');
  
  // Now clean can only have digits and commas.
  // Strip all characters except digits and the first comma
  clean = clean.replace(/[^0-9,]/g, '');
  const commaIndex = clean.indexOf(',');
  if (commaIndex !== -1) {
    clean = clean.substring(0, commaIndex + 1) + clean.substring(commaIndex + 1).replace(/,/g, '');
  }
  
  const parts = clean.split(',');
  let integerPart = parts[0];
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  if (parts.length > 1) {
    return `${formattedInteger},${parts[1].substring(0, 2)}`;
  }
  if (adjustedValue.endsWith(',')) {
    return `${formattedInteger},`;
  }
  return formattedInteger;
};

const formatInitialValue = (num: number): string => {
  const str = num.toString();
  const withComma = str.replace('.', ',');
  return formatWithSpanishSeparators(withComma, '');
};

// Helper to parse the dot/comma string back to a float
const parseNumberWithSeparators = (val: string): number => {
  if (!val) return 0;
  const standardized = val.replace(/\./g, '').replace(/,/g, '.');
  const parsed = parseFloat(standardized);
  return isNaN(parsed) ? 0 : parsed;
};

export default function SaldosScreen({
  config,
  saldos,
  operaciones,
  onBack,
  onSaveConfig,
  onResetAll,
  showToast,
}: SaldosScreenProps) {
  // Tabs for the screen: 'ingresar' or 'mostrar'
  const [activeTab, setActiveTab] = useState<'ingresar' | 'mostrar'>('mostrar');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Local form state for initial balances
  const [initBob, setInitBob] = useState(formatInitialValue(config.SaldosIniciales?.BOB ?? 0));
  const [initUsd, setInitUsd] = useState(formatInitialValue(config.SaldosIniciales?.USD ?? 0));
  const [initEur, setInitEur] = useState(formatInitialValue(config.SaldosIniciales?.EUR ?? 0));
  const [initPen, setInitPen] = useState(formatInitialValue(config.SaldosIniciales?.PEN ?? 0));

  // Sync state if config updates
  useEffect(() => {
    if (config.SaldosIniciales) {
      setInitBob(formatInitialValue(config.SaldosIniciales.BOB ?? 0));
      setInitUsd(formatInitialValue(config.SaldosIniciales.USD ?? 0));
      setInitEur(formatInitialValue(config.SaldosIniciales.EUR ?? 0));
      setInitPen(formatInitialValue(config.SaldosIniciales.PEN ?? 0));
    }
  }, [config]);

  const handleSaveSaldos = async (e: React.FormEvent) => {
    e.preventDefault();
    const iBOB = parseNumberWithSeparators(initBob);
    const iUSD = parseNumberWithSeparators(initUsd);
    const iEUR = parseNumberWithSeparators(initEur);
    const iPEN = parseNumberWithSeparators(initPen);

    if ([iBOB, iUSD, iEUR, iPEN].some((val) => isNaN(val) || val < 0)) {
      showToast('Todos los saldos iniciales deben ser números mayores o iguales a cero.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const newConfig: Configuracion = {
        ...config,
        SaldosIniciales: {
          BOB: iBOB,
          USD: iUSD,
          EUR: iEUR,
          PEN: iPEN,
        },
      };
      await onSaveConfig(newConfig);
      showToast('Saldos de caja iniciales actualizados correctamente.', 'success');
      setActiveTab('mostrar');
    } catch (error: any) {
      showToast(error.message || 'Error al guardar los saldos iniciales.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Automated backup & reset feature
  const handleExecuteBackupAndReset = async () => {
    if (resetPassword !== '67120247') {
      showToast('Contraseña incorrecta. No se permite realizar el reinicio del sistema.', 'error');
      setResetPassword('');
      return;
    }

    try {
      setIsResetting(true);

      const DIVISA_DETAILS: Record<DivisaType, { name: string; symbol: string; flag: string }> = {
        USD: { name: 'Dólar', symbol: '$', flag: '💵' },
        EUR: { name: 'Euro', symbol: '€', flag: '💶' },
        PEN: { name: 'Sol', symbol: 'S/.', flag: '🇵🇪' },
      };

      // 1. Create backup object (JSON format)
      const backupData = {
        fecha_copia: new Date().toISOString(),
        configuracion: config,
        operaciones: operaciones,
        balances_momento_copia: saldos,
      };

      // 2. Format a nice timestamped filename prefix
      const nowStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
      
      // 3. Trigger automatic JSON download in browser
      const jsonFilename = `backup_adela_cambio_${nowStr}.json`;
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchorJson = document.createElement('a');
      downloadAnchorJson.setAttribute('href', jsonString);
      downloadAnchorJson.setAttribute('download', jsonFilename);
      document.body.appendChild(downloadAnchorJson);
      downloadAnchorJson.click();
      downloadAnchorJson.remove();

      // 4. Generate and download Excel backup (.xlsx)
      // Sort operations chronologically (oldest first) to run inventory simulation
      const chronologicalOps = [...operaciones].sort((a, b) => {
        const dateTimeA = `${a.Fecha}T${a.Hora}`;
        const dateTimeB = `${b.Fecha}T${b.Hora}`;
        return dateTimeA.localeCompare(dateTimeB);
      });

      // Keep track of inventory simulation states
      const inventoryStateSim: Record<DivisaType, { stock: number; avgCost: number }> = {
        USD: { stock: 0, avgCost: 0 },
        EUR: { stock: 0, avgCost: 0 },
        PEN: { stock: 0, avgCost: 0 },
      };

      // Enhance operations with realized profit/loss
      const enhancedOpsMap: Record<string, number> = {};

      chronologicalOps.forEach((op) => {
        const div = op.Divisa;
        const inv = inventoryStateSim[div];
        
        if (op.TipoOperacion === 'Compra') {
          const newStock = inv.stock + op.Cantidad;
          if (newStock > 0) {
            inv.avgCost = (inv.stock * inv.avgCost + op.TotalBs) / newStock;
          }
          inv.stock = newStock;
          enhancedOpsMap[op.ID] = 0;
        } else {
          let profit = 0;
          if (inv.avgCost > 0) {
            profit = op.TotalBs - (op.Cantidad * inv.avgCost);
          } else {
            profit = op.TotalBs * 0.015;
          }
          inv.stock = inv.stock - op.Cantidad;
          enhancedOpsMap[op.ID] = Math.round(profit * 100) / 100;
        }
      });

      // Sheet 1: Resumen de Cierre
      const resumenData = [
        ['COPIA DE SEGURIDAD Y CIERRE DE CAJA - ADELA BOLIVIA'],
        ['Fecha de Cierre:', new Date().toLocaleString('es-BO')],
        [],
        ['1. SALDOS DE CIERRE EN CAJA (ARQUEO REAL)'],
        ['Divisa', 'Moneda', 'Saldo Disponible', 'Costo Promedio de Compra (Bs)'],
        ['Bolivianos', 'BOB', saldos.BOB, 'N/A'],
        ['Dólares', 'USD', saldos.USD, inventoryStateSim.USD.avgCost > 0 ? `${inventoryStateSim.USD.avgCost.toFixed(2)} Bs` : 'N/A'],
        ['Euros', 'EUR', saldos.EUR, inventoryStateSim.EUR.avgCost > 0 ? `${inventoryStateSim.EUR.avgCost.toFixed(2)} Bs` : 'N/A'],
        ['Soles Peruanos', 'PEN', saldos.PEN, inventoryStateSim.PEN.avgCost > 0 ? `${inventoryStateSim.PEN.avgCost.toFixed(2)} Bs` : 'N/A'],
        [],
        ['2. CONFIGURACIÓN DE TASAS DE CAMBIO (ÚLTIMAS REGISTRADAS)'],
        ['Divisa', 'Código', 'Tasa de Compra (Bs)', 'Tasa de Venta (Bs)'],
        ['Dólar', 'USD', config.USD?.Compra ?? 6.86, config.USD?.Venta ?? 6.96],
        ['Euro', 'EUR', config.EUR?.Compra ?? 7.45, config.EUR?.Venta ?? 7.65],
        ['Sol Peruano', 'PEN', config.PEN?.Compra ?? 1.80, config.PEN?.Venta ?? 1.95],
        [],
        ['3. SALDOS INICIALES DE CAJA'],
        ['Divisa', 'Código', 'Monto Base Inicial'],
        ['Bolivianos', 'BOB', config.SaldosIniciales?.BOB || 0],
        ['Dólares', 'USD', config.SaldosIniciales?.USD || 0],
        ['Euros', 'EUR', config.SaldosIniciales?.EUR || 0],
        ['Soles Peruanos', 'PEN', config.SaldosIniciales?.PEN || 0],
      ];

      const resumenWorksheet = XLSX.utils.aoa_to_sheet(resumenData);
      resumenWorksheet['!cols'] = [
        { wch: 25 }, // Col A
        { wch: 15 }, // Col B
        { wch: 22 }, // Col C
        { wch: 22 }, // Col D
      ];

      // Sheet 2: Historial de Operaciones
      const opsData = operaciones.map((op, index) => {
        const opProfit = enhancedOpsMap[op.ID] || 0;
        return {
          'N°': index + 1,
          'ID Operación': op.ID,
          'Fecha': op.Fecha,
          'Hora': op.Hora.substring(0, 5),
          'Tipo de Operación': op.TipoOperacion === 'Compra' ? 'COMPRA' : 'VENTA',
          'Divisa': op.Divisa === 'USD' ? 'Dólar (USD)' : op.Divisa === 'EUR' ? 'Euro (EUR)' : 'Sol Peruano (PEN)',
          'Cantidad (Moneda Extranjera)': op.Cantidad,
          'Tipo de Cambio (Bs)': op.TipoCambio,
          'Total (Bolivianos - Bs)': op.TotalBs,
          'Ganancia Realizada (Bs)': op.TipoOperacion === 'Venta' ? opProfit : 'Stock de Compra',
        };
      });

      const opsWorksheet = XLSX.utils.json_to_sheet(opsData);
      opsWorksheet['!cols'] = [
        { wch: 6 },   // N°
        { wch: 15 },  // ID Operación
        { wch: 14 },  // Fecha
        { wch: 10 },  // Hora
        { wch: 18 },  // Tipo de Operacion
        { wch: 20 },  // Divisa
        { wch: 28 },  // Cantidad (Moneda Extranjera)
        { wch: 22 },  // Tipo de Cambio (Bs)
        { wch: 24 },  // Total (Bolivianos - Bs)
        { wch: 24 },  // Ganancia Realizada (Bs)
      ];

      // Create workbook and append sheets
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, resumenWorksheet, 'Resumen de Cierre');
      XLSX.utils.book_append_sheet(workbook, opsWorksheet, 'Historial de Operaciones');

      // Filename for Excel backup
      const excelFilename = `backup_adela_cambio_${nowStr}.xlsx`;

      // Trigger download for Excel
      XLSX.writeFile(workbook, excelFilename);

      // Show temporary informative message
      showToast('Copia de seguridad en JSON y Excel descargadas.', 'success');

      // 5. Wait a tiny bit and send reset request to the server
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await onResetAll();

      showToast('Caja y movimientos reseteados a 0 con éxito.', 'success');
      setShowConfirmReset(false);
      setResetPassword('');
      setShowPassword(false);
      setActiveTab('mostrar');
    } catch (error: any) {
      showToast(error.message || 'Error al realizar el reseteo del sistema.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

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

        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Wallet className="w-6 h-6 text-emerald-600" />
          Saldos de Caja
        </h2>
        <div className="w-12"></div>
      </div>

      {/* Selector Tabs (Tactile & Giant, like buy/sell options but custom styled) */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 border-2 border-slate-200 rounded-3xl mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('mostrar')}
          className={`py-3 text-sm font-black rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'mostrar'
              ? 'bg-slate-950 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Mostrar Saldos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ingresar')}
          className={`py-3 text-sm font-black rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ingresar'
              ? 'bg-slate-950 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Ingresar Saldos</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[380px]">
        {activeTab === 'mostrar' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-5"
          >
            {/* Show Current Balances Grid */}
            <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Saldos Reales Calculados
              </h3>

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {/* BOB */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] sm:text-xs text-slate-500 font-extrabold uppercase truncate">Bolivianos</span>
                    <span className="text-base sm:text-lg shrink-0">🇧🇴</span>
                  </div>
                  <div className="mt-2 sm:mt-3 flex items-baseline flex-wrap gap-0.5">
                    <span className="text-sm xs:text-base sm:text-lg md:text-xl font-mono font-black text-slate-900 break-all">
                      {saldos.BOB.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] sm:text-xs font-black text-slate-400 ml-1">Bs</span>
                  </div>
                </div>

                {/* USD */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] sm:text-xs text-slate-500 font-extrabold uppercase truncate">Dólares</span>
                    <span className="text-base sm:text-lg shrink-0">💵</span>
                  </div>
                  <div className="mt-2 sm:mt-3 flex items-baseline flex-wrap gap-0.5">
                    <span className="text-sm xs:text-base sm:text-lg md:text-xl font-mono font-black text-slate-900 break-all">
                      {saldos.USD.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] sm:text-xs font-black text-slate-400 ml-1">$</span>
                  </div>
                </div>

                {/* EUR */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] sm:text-xs text-slate-500 font-extrabold uppercase truncate">Euros</span>
                    <span className="text-base sm:text-lg shrink-0">💶</span>
                  </div>
                  <div className="mt-2 sm:mt-3 flex items-baseline flex-wrap gap-0.5">
                    <span className="text-sm xs:text-base sm:text-lg md:text-xl font-mono font-black text-slate-900 break-all">
                      {saldos.EUR.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] sm:text-xs font-black text-slate-400 ml-1">€</span>
                  </div>
                </div>

                {/* PEN */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] sm:text-xs text-slate-500 font-extrabold uppercase truncate">Soles</span>
                    <span className="text-base sm:text-lg shrink-0">🇵🇪</span>
                  </div>
                  <div className="mt-2 sm:mt-3 flex items-baseline flex-wrap gap-0.5">
                    <span className="text-sm xs:text-base sm:text-lg md:text-xl font-mono font-black text-slate-900 break-all">
                      {saldos.PEN.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] sm:text-xs font-black text-slate-400 ml-1">S/.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Informative Box */}
            <div className="bg-slate-50 border border-slate-200/85 rounded-2xl p-4 text-xs text-slate-500 leading-relaxed font-semibold">
              💡 <span className="text-slate-700">¿Cómo se calcula el saldo real?</span> Tomamos el <span className="text-slate-800">Saldo Inicial</span> (monto base con el que partes) y le sumamos o restamos automáticamente cada una de las transacciones registradas de Compra y Venta.
            </div>
          </motion.div>
        )}

        {activeTab === 'ingresar' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-4"
          >
            <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🏦</span> Establecer Saldos Iniciales (Monto Base)
              </h3>
              <p className="text-xs text-slate-500 mb-4 font-semibold leading-normal">
                Ingresa los montos de efectivo físico iniciales. El sistema iniciará los balances con estos valores antes de calcular los movimientos.
              </p>

              <form onSubmit={handleSaveSaldos} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* BOB */}
                  <div className="bg-slate-50 border-2 border-slate-200/70 rounded-2xl p-3 focus-within:border-slate-400 transition-all">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Bolivianos (BOB)</label>
                    <div className="relative flex items-center text-slate-900">
                      <span className="absolute left-0 text-sm font-bold text-slate-400">Bs</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={initBob}
                        onChange={(e) => {
                          setInitBob(formatWithSpanishSeparators(e.target.value, initBob));
                        }}
                        className="w-full pl-6 bg-transparent font-mono text-right text-lg font-bold text-slate-900 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* USD */}
                  <div className="bg-slate-50 border-2 border-slate-200/70 rounded-2xl p-3 focus-within:border-slate-400 transition-all">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Dólares (USD)</label>
                    <div className="relative flex items-center text-slate-900">
                      <span className="absolute left-0 text-sm font-bold text-slate-400">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={initUsd}
                        onChange={(e) => {
                          setInitUsd(formatWithSpanishSeparators(e.target.value, initUsd));
                        }}
                        className="w-full pl-6 bg-transparent font-mono text-right text-lg font-bold text-slate-900 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* EUR */}
                  <div className="bg-slate-50 border-2 border-slate-200/70 rounded-2xl p-3 focus-within:border-slate-400 transition-all">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Euros (EUR)</label>
                    <div className="relative flex items-center text-slate-900">
                      <span className="absolute left-0 text-sm font-bold text-slate-400">€</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={initEur}
                        onChange={(e) => {
                          setInitEur(formatWithSpanishSeparators(e.target.value, initEur));
                        }}
                        className="w-full pl-6 bg-transparent font-mono text-right text-lg font-bold text-slate-900 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* PEN */}
                  <div className="bg-slate-50 border-2 border-slate-200/70 rounded-2xl p-3 focus-within:border-slate-400 transition-all">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Soles (PEN)</label>
                    <div className="relative flex items-center text-slate-900">
                      <span className="absolute left-0 text-sm font-bold text-slate-400">S/.</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={initPen}
                        onChange={(e) => {
                          setInitPen(formatWithSpanishSeparators(e.target.value, initPen));
                        }}
                        className="w-full pl-7 bg-transparent font-mono text-right text-lg font-bold text-slate-900 outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-lg border-b-4 border-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Saldos Iniciales'}</span>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </div>

      {/* Safety Section - Reset and Back up zone */}
      <div className="mt-6">
        <div className="bg-rose-50/50 border-2 border-rose-100 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-900">Cierre de Caja y Reinicio General</h4>
              <p className="text-xs text-rose-700 font-semibold leading-relaxed mt-0.5">
                Esta acción descargará automáticamente una copia de seguridad en formato JSON de todas tus configuraciones y movimientos registrados, para luego limpiar la base de datos completa.
              </p>
            </div>
          </div>

          <AnimatePresence>
            {showConfirmReset ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white border-2 border-rose-200/80 rounded-2xl p-4 flex flex-col gap-3 mt-1 overflow-hidden"
              >
                <p className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
                  ⚠️ ¿Confirmas restablecer todo el sistema a 0?
                </p>

                <div className="flex flex-col gap-1 my-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Contraseña de Seguridad Requerida
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="w-full pl-3 pr-10 py-2 border-2 border-slate-200 rounded-xl font-mono text-slate-900 text-sm outline-none focus:border-rose-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                      title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setShowConfirmReset(false);
                      setResetPassword('');
                      setShowPassword(false);
                    }}
                    className="py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    No, Cancelar
                  </button>
                  <button
                    onClick={handleExecuteBackupAndReset}
                    disabled={isResetting}
                    className="py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5 animate-bounce" />
                    <span>{isResetting ? 'Reseteando...' : 'Sí, Hacer Backup y Resetear'}</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowConfirmReset(true)}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm rounded-2xl shadow-md border-b-4 border-rose-800 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Resetear Todo (Con Backup Automático)</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
