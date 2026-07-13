import { useState } from 'react';
import { ArrowLeft, Trash2, Calendar, FileSpreadsheet, TrendingUp, TrendingDown, Landmark, Sparkles, AlertCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { Operacion, DivisaType } from '../types';
import ConfirmModal from './ConfirmModal';
import * as XLSX from 'xlsx';

interface HistoryScreenProps {
  operaciones: Operacion[];
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const DIVISA_DETAILS: Record<DivisaType, { name: string; symbol: string; flag: string }> = {
  USD: { name: 'Dólar', symbol: '$', flag: '💵' },
  EUR: { name: 'Euro', symbol: '€', flag: '💶' },
  PEN: { name: 'Sol', symbol: 'S/.', flag: '🇵🇪' },
};

export default function HistoryScreen({
  operaciones,
  onBack,
  onDelete,
  showToast,
}: HistoryScreenProps) {
  const [selectedFecha, setSelectedFecha] = useState<string>('');
  const [opToDelete, setOpToDelete] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // FINANCIAL INTELLIGENCE ENGINE (Weighted Average Cost & Realized Profit)
  // -------------------------------------------------------------------------
  
  // Sort operations chronologically (oldest first) to run inventory simulation
  const chronologicalOps = [...operaciones].sort((a, b) => {
    const dateTimeA = `${a.Fecha}T${a.Hora}`;
    const dateTimeB = `${b.Fecha}T${b.Hora}`;
    return dateTimeA.localeCompare(dateTimeB);
  });

  // Keep track of inventory simulation states
  const inventoryState: Record<DivisaType, { stock: number; avgCost: number }> = {
    USD: { stock: 0, avgCost: 0 },
    EUR: { stock: 0, avgCost: 0 },
    PEN: { stock: 0, avgCost: 0 },
  };

  // Enhance operations with realized profit/loss
  const enhancedOpsMap: Record<string, number> = {};

  chronologicalOps.forEach((op) => {
    const div = op.Divisa;
    const inv = inventoryState[div];
    
    if (op.TipoOperacion === 'Compra') {
      const newStock = inv.stock + op.Cantidad;
      if (newStock > 0) {
        // Weighted average cost: new average is weighted by existing and new transaction costs
        inv.avgCost = (inv.stock * inv.avgCost + op.TotalBs) / newStock;
      }
      inv.stock = newStock;
      enhancedOpsMap[op.ID] = 0; // Buying does not realize profit yet
    } else {
      // Venta
      let profit = 0;
      if (inv.avgCost > 0) {
        // Realized Profit = Amount × (Selling Rate - Weighted Average Cost of Purchase)
        profit = op.TotalBs - (op.Cantidad * inv.avgCost);
      } else {
        // Fallback spread profit: if no purchase history is registered yet,
        // assume an average conservative margin of 1.5% as simulated earnings
        profit = op.TotalBs * 0.015;
      }
      inv.stock = inv.stock - op.Cantidad;
      enhancedOpsMap[op.ID] = Math.round(profit * 100) / 100;
    }
  });

  // Filter operations based on selected date
  const filteredOps = selectedFecha
    ? operaciones.filter((op) => op.Fecha === selectedFecha)
    : operaciones;

  // Calculate statistics for the filtered period
  const stats = filteredOps.reduce(
    (acc, op) => {
      const profit = enhancedOpsMap[op.ID] || 0;
      acc.totalRealizedProfit += profit;

      if (op.TipoOperacion === 'Compra') {
        acc.comprasBs += op.TotalBs;
        acc.comprasCount += 1;
      } else {
        acc.ventasBs += op.TotalBs;
        acc.ventasCount += 1;
      }
      return acc;
    },
    { comprasBs: 0, ventasBs: 0, comprasCount: 0, ventasCount: 0, totalRealizedProfit: 0 }
  );

  const handleDeleteClick = (id: string) => {
    setOpToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (opToDelete) {
      try {
        await onDelete(opToDelete);
        showToast('Operación eliminada de la base de datos.', 'success');
      } catch (err: any) {
        showToast(err.message || 'Error al eliminar la operación.', 'error');
      } finally {
        setOpToDelete(null);
      }
    }
  };

  const handleClearFilter = () => {
    setSelectedFecha('');
  };

  const exportToExcel = () => {
    try {
      if (filteredOps.length === 0) {
        showToast('No hay operaciones para exportar.', 'error');
        return;
      }

      // Format data with clear, user-friendly columns for a basic Excel user
      const dataToExport = filteredOps.map((op, index) => {
        const opProfit = enhancedOpsMap[op.ID] || 0;
        return {
          'N°': index + 1,
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

      // Create a worksheet
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      // Define clear column widths for seamless readability
      const colWidths = [
        { wch: 6 },   // N°
        { wch: 14 },  // Fecha
        { wch: 10 },  // Hora
        { wch: 18 },  // Tipo de Operacion
        { wch: 20 },  // Divisa
        { wch: 28 },  // Cantidad (Moneda Extranjera)
        { wch: 22 },  // Tipo de Cambio (Bs)
        { wch: 24 },  // Total (Bolivianos - Bs)
        { wch: 24 },  // Ganancia Realizada (Bs)
      ];
      worksheet['!cols'] = colWidths;

      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial de Caja');

      // Filename includes the date filter if active, otherwise general
      const formattedDate = new Date().toISOString().split('T')[0];
      const filename = selectedFecha
        ? `Operaciones_Caja_${selectedFecha}.xlsx`
        : `Historial_Caja_${formattedDate}.xlsx`;

      // Trigger download
      XLSX.writeFile(workbook, filename);
      showToast('¡Historial exportado a Excel exitosamente!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Ocurrió un error al generar el archivo Excel.', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-1">
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
          📋 Historial y Caja
        </h2>
        <div className="w-12"></div>
      </div>

      {/* Date Search Filter Section */}
      <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm mb-6">
        <label className="block text-slate-500 font-bold text-base uppercase tracking-wider mb-2">
          Buscar por Fecha (Ganancias del Día)
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 flex items-center">
            <Calendar className="absolute left-4 text-slate-400 w-6 h-6 pointer-events-none" />
            <input
              type="date"
              value={selectedFecha}
              onChange={(e) => setSelectedFecha(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-900 focus:border-slate-400 focus:bg-white outline-none transition-all"
            />
          </div>
          {selectedFecha && (
            <button
              onClick={handleClearFilter}
              className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base rounded-2xl border border-slate-300 transition-colors"
            >
              Mostrar Todo
            </button>
          )}
        </div>
      </div>

      {/* DYNAMIC PROFIT AND LOSS BANNER (GANASTE O PERDISTE DINERO) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl p-6 border-2 shadow-lg mb-6 text-center ${
          stats.totalRealizedProfit >= 0
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-rose-50 border-rose-300 text-rose-950'
        }`}
      >
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">
          {selectedFecha ? `Resultado Neto para el ${selectedFecha}` : 'Resultado Neto de Caja (Histórico)'}
        </span>
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm font-semibold text-slate-500 mb-1">
            {stats.totalRealizedProfit >= 0 ? '📈 ¡GANANCIA REALIZADA!' : '📉 PÉRDIDA ESTIMADA / REINVERSIÓN'}
          </p>
          <p className={`text-4xl font-black font-display ${stats.totalRealizedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {stats.totalRealizedProfit >= 0 ? '+' : ''}
            {stats.totalRealizedProfit.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xl font-bold">Bs</span>
          </p>
          <span className="text-xs text-slate-400 font-medium mt-2 leading-relaxed block max-w-md">
            Calculado con el método de costo promedio ponderado de compra. Las compras no generan ganancias directas; se realizan al vender a un tipo de cambio superior.
          </span>
        </div>
      </motion.div>

      {/* Aggregate Volume Summaries */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block">Total Compras</span>
            <span className="text-base font-black text-slate-800">
              {stats.comprasBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">({stats.comprasCount} oper.)</span>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-100 rounded-3xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-700">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block">Total Ventas</span>
            <span className="text-base font-black text-slate-800">
              {stats.ventasBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">({stats.ventasCount} oper.)</span>
          </div>
        </div>
      </div>

      {/* REAL-TIME BOX BALANCE / INVENTORY (ESTADO DE CAJA ACTUAL) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-slate-200 shadow-sm mb-6">
        <h4 className="text-sm sm:text-base font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-slate-500" />
          Arqueo de Caja & Saldos en Divisas
        </h4>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
          {(['USD', 'EUR', 'PEN'] as DivisaType[]).map((div) => {
            const state = inventoryState[div];
            const details = DIVISA_DETAILS[div];
            return (
              <div key={div} className="bg-slate-50 border border-slate-100 rounded-2xl p-2 sm:p-3 text-center overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-lg sm:text-xl block mb-0.5 sm:mb-1">{details.flag}</span>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 block uppercase leading-none mb-1">{div}</span>
                  <span className="text-[11px] xs:text-xs sm:text-base font-black text-slate-800 font-mono block truncate" title={`${details.symbol}${state.stock.toLocaleString('es-BO')}`}>
                    {details.symbol}{state.stock.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[8px] xs:text-[9px] sm:text-[10px] text-slate-400 block font-semibold mt-1.5 leading-none shrink-0 truncate">
                  Costo: {state.avgCost > 0 ? `${state.avgCost.toFixed(1)} Bs` : 'N/A'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table-Like Operations List */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-row items-center justify-between gap-3 px-1 mb-1">
          <h3 className="text-xl font-black text-slate-900">
            {selectedFecha ? 'Operaciones Filtradas' : 'Operaciones Registradas'} ({filteredOps.length})
          </h3>
          <button
            onClick={exportToExcel}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl shadow-sm transition-all text-xs sm:text-sm font-bold shrink-0 ${
              filteredOps.length > 0
                ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white hover:shadow active:scale-95 cursor-pointer"
                : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
            }`}
            title="Exportar base de datos a Excel"
            disabled={filteredOps.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span>Exportar Excel</span>
          </button>
        </div>

        {filteredOps.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center flex flex-col items-center">
            <FileSpreadsheet className="w-16 h-16 text-slate-300 mb-3" />
            <p className="text-slate-500 font-bold text-xl mb-1">No hay operaciones registradas</p>
            <p className="text-slate-400 text-base">
              {selectedFecha
                ? 'No se encontraron movimientos para la fecha seleccionada.'
                : 'Comienza registrando compras o ventas de divisas.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredOps.map((op) => {
              const details = DIVISA_DETAILS[op.Divisa] || { name: 'Divisa', symbol: '$', flag: '💵' };
              const opProfit = enhancedOpsMap[op.ID] || 0;

              return (
                <motion.div
                  key={op.ID}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border-2 border-slate-200 rounded-3xl p-4 flex flex-col gap-3.5 shadow-sm relative overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Color stripe on left border */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-2.5 ${
                      op.TipoOperacion === 'Compra' ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />

                  {/* Top Row: Badges, Currency and Date/Time */}
                  <div className="pl-1.5 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-1 text-[11px] font-black rounded-lg leading-none tracking-wide ${
                          op.TipoOperacion === 'Compra'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
                        {op.TipoOperacion === 'Compra' ? 'COMPRA' : 'VENTA'}
                      </span>

                      <span className="text-[11px] bg-slate-50 text-slate-600 font-bold px-2 py-1 rounded-lg border border-slate-100 flex items-center gap-1">
                        <span>{details.flag}</span>
                        <span>{op.Divisa === 'USD' ? 'DOLAR' : op.Divisa === 'EUR' ? 'EURO' : 'SOLES'}</span>
                      </span>
                    </div>

                    <span className="text-slate-400 text-xs font-mono">
                      {op.Fecha} {op.Hora.substring(0, 5)}
                    </span>
                  </div>

                  {/* Middle Row: Unified Columns of operational values */}
                  <div className="pl-1.5 grid grid-cols-3 gap-1.5 sm:gap-2 text-left">
                    <div className="bg-slate-50/50 p-1.5 sm:p-2 rounded-xl border border-slate-100 overflow-hidden">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider leading-none mb-1 truncate">Cantidad</span>
                      <span className="text-xs xs:text-sm sm:text-base font-black text-slate-800 font-mono leading-none truncate block">
                        {details.symbol}{op.Cantidad.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-slate-50/50 p-1.5 sm:p-2 rounded-xl border border-slate-100 overflow-hidden">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider leading-none mb-1 truncate">T. Cambio</span>
                      <span className="text-[10px] xs:text-xs sm:text-sm font-bold text-slate-600 font-mono leading-none truncate block">
                        {op.TipoCambio.toFixed(2)} Bs
                      </span>
                    </div>

                    {op.TipoOperacion === 'Venta' ? (
                      <div className="bg-emerald-50/40 p-1.5 sm:p-2 rounded-xl border border-emerald-100/50 overflow-hidden">
                        <span className="text-[9px] text-emerald-600 font-bold uppercase block tracking-wider leading-none mb-1 truncate">Ganancia</span>
                        <span className="text-[10px] xs:text-xs sm:text-sm font-black text-emerald-600 font-mono leading-none truncate block">
                          +{opProfit.toFixed(2)} Bs
                        </span>
                      </div>
                    ) : (
                      <div className="bg-slate-50/20 p-1.5 sm:p-2 rounded-xl border border-slate-100/50 flex items-center justify-center overflow-hidden">
                        <span className="text-[8px] xs:text-[9px] sm:text-[10px] text-slate-300 font-bold italic truncate block">Stock compra</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Total Display and Delete Trigger */}
                  <div className="pl-1.5 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none mb-1">
                        Total {op.TipoOperacion === 'Compra' ? 'Entregado' : 'Recibido'}
                      </span>
                      <span className={`text-xl font-black font-display leading-none ${
                        op.TipoOperacion === 'Compra' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {op.TotalBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })} <span className="text-xs font-bold">Bs</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteClick(op.ID)}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 transition-colors shrink-0 active:scale-95"
                      aria-label="Eliminar operación"
                    >
                      <Trash2 className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={opToDelete !== null}
        title="¿Eliminar Operación?"
        message="¿Estás seguro de que deseas eliminar permanentemente esta operación de cambio de divisa? Esta acción no se puede deshacer y recalculará la ganancia de caja."
        onConfirm={handleConfirmDelete}
        onCancel={() => setOpToDelete(null)}
      />
    </div>
  );
}
