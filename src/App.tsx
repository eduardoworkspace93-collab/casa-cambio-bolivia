import { useState, useEffect } from 'react';
import { Landmark, Smartphone, Tablet, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Operacion, Configuracion, DivisaType } from './types';
import MainScreen from './components/MainScreen';
import BuySellScreen from './components/BuySellScreen';
import ConversionScreen from './components/ConversionScreen';
import HistoryScreen from './components/HistoryScreen';
import SettingsScreen from './components/SettingsScreen';
import SaldosScreen from './components/SaldosScreen';
import Toast from './components/Toast';

export default function App() {
  // Navigation State
  const [activeScreen, setActiveScreen] = useState<'main' | 'buy' | 'sell' | 'convert' | 'history' | 'settings' | 'saldos'>('main');

  // View Layout Device Mode State (celular, tablet, full screen/pc)
  const [deviceMode, setDeviceMode] = useState<'celular' | 'tablet' | 'pc'>(() => {
    const saved = localStorage.getItem('adela_device_mode');
    return (saved as 'celular' | 'tablet' | 'pc') || 'celular';
  });

  const changeDeviceMode = (mode: 'celular' | 'tablet' | 'pc') => {
    setDeviceMode(mode);
    localStorage.setItem('adela_device_mode', mode);
  };

  // Business Data State
  const [config, setConfig] = useState<Configuracion>({
    USD: { Compra: 6.86, Venta: 6.96 },
    EUR: { Compra: 7.45, Venta: 7.65 },
    PEN: { Compra: 1.80, Venta: 1.95 },
  });
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Toast notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Helper to trigger custom toasts
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [configRes, opsRes] = await Promise.all([
        fetch('/api/configuracion'),
        fetch('/api/operaciones'),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }

      if (opsRes.ok) {
        const opsData = await opsRes.json();
        setOperaciones(opsData);
      }
    } catch (error) {
      console.error('Error fetching data from server:', error);
      showToast('Error de conexión con el servidor de la Casa de Cambio.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    loadData();
  }, []);

  // Handle system wide reset (called by SaldosScreen)
  const handleResetAll = async () => {
    const res = await fetch('/api/reset', {
      method: 'POST',
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'No se pudo resetear el sistema.');
    }

    await loadData();
  };

  // Helper to calculate current balances dynamically
  const getSaldosActuales = () => {
    const base = config.SaldosIniciales || { USD: 0, EUR: 0, PEN: 0, BOB: 0 };
    const saldos = {
      USD: base.USD || 0,
      EUR: base.EUR || 0,
      PEN: base.PEN || 0,
      BOB: base.BOB || 0,
    };

    for (const op of operaciones) {
      const qty = op.Cantidad;
      const totalBs = op.TotalBs;
      if (op.TipoOperacion === 'Compra') {
        // Compra (we buy foreign currency): we receive foreign currency, pay BOB
        if (op.Divisa === 'USD') saldos.USD += qty;
        else if (op.Divisa === 'EUR') saldos.EUR += qty;
        else if (op.Divisa === 'PEN') saldos.PEN += qty;
        saldos.BOB -= totalBs;
      } else {
        // Venta (we sell foreign currency): we deliver foreign currency, receive BOB
        if (op.Divisa === 'USD') saldos.USD -= qty;
        else if (op.Divisa === 'EUR') saldos.EUR -= qty;
        else if (op.Divisa === 'PEN') saldos.PEN -= qty;
        saldos.BOB += totalBs;
      }
    }

    return {
      USD: Math.round(saldos.USD * 100) / 100,
      EUR: Math.round(saldos.EUR * 100) / 100,
      PEN: Math.round(saldos.PEN * 100) / 100,
      BOB: Math.round(saldos.BOB * 100) / 100,
    };
  };

  const saldos = getSaldosActuales();

  // Save an Operation (Buy/Sell)
  const handleSaveOperation = async (data: {
    Cantidad: number;
    TipoCambio: number;
    TipoOperacion: 'Compra' | 'Venta';
    Divisa: DivisaType;
  }) => {
    // Validate real-time balance
    const currentSaldos = getSaldosActuales();
    const totalBs = Math.round(data.Cantidad * data.TipoCambio * 100) / 100;

    if (data.TipoOperacion === 'Compra') {
      if (currentSaldos.BOB < totalBs) {
        showToast(
          `Saldo insuficiente en Bolivianos (Bs). Disponible: ${currentSaldos.BOB.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs. Requerido: ${totalBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.`,
          'error'
        );
        throw new Error('Saldo insuficiente en Bolivianos.');
      }
    } else {
      const currentForeignSaldo = currentSaldos[data.Divisa];
      if (currentForeignSaldo < data.Cantidad) {
        showToast(
          `Saldo insuficiente en ${data.Divisa === 'USD' ? 'Dólares' : data.Divisa === 'EUR' ? 'Euros' : 'Soles'}. Disponible: ${currentForeignSaldo.toLocaleString('es-BO', { minimumFractionDigits: 2 })}. Requerido: ${data.Cantidad.toLocaleString('es-BO', { minimumFractionDigits: 2 })}.`,
          'error'
        );
        throw new Error(`Saldo insuficiente en ${data.Divisa}.`);
      }
    }

    const res = await fetch('/api/operaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'No se pudo guardar la operación.');
    }

    const result = await res.json();
    
    // Add to local state (prepend to keep sorted by most recent first)
    setOperaciones((prev) => [result.operacion, ...prev]);
    showToast('Operación registrada correctamente.', 'success');
    
    // Go back to dashboard immediately for high-speed workflow!
    setActiveScreen('main');
  };

  // Save Configuration (Exchange Rates)
  const handleSaveConfig = async (newConfig: Configuracion) => {
    const res = await fetch('/api/configuracion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'No se pudo guardar la configuración.');
    }

    const result = await res.json();
    setConfig(result.configuracion);
    setActiveScreen('main');
  };

  // Delete an Operation
  const handleDeleteOperation = async (id: string) => {
    const res = await fetch(`/api/operaciones/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'No se pudo eliminar la operación.');
    }

    // Update local state
    setOperaciones((prev) => prev.filter((op) => op.ID !== id));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-x-hidden w-full sm:py-6 sm:px-4 p-0">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container - Switchable layout (Celular, Tablet, PC) */}
      <div className={
        deviceMode === 'celular'
          ? "w-full h-screen sm:h-[820px] sm:max-w-lg bg-slate-50 sm:rounded-[40px] shadow-2xl sm:border-8 sm:border-slate-950 overflow-hidden flex flex-col relative transition-all duration-300 shrink-0"
          : deviceMode === 'tablet'
          ? "w-full h-screen sm:h-[900px] sm:max-w-3xl bg-slate-50 sm:rounded-[32px] shadow-2xl sm:border-[10px] sm:border-slate-950 overflow-hidden flex flex-col relative transition-all duration-300 shrink-0"
          : "w-full h-screen sm:h-[820px] sm:max-w-5xl bg-slate-50 sm:rounded-2xl shadow-xl sm:border sm:border-slate-200 overflow-hidden flex flex-col relative transition-all duration-300"
      }>
        
        {/* Top Phone Bar Mockup - Hidden on real phones (max-sm) */}
        {deviceMode !== 'pc' && (
          <div className="hidden sm:flex h-8 bg-slate-950 items-center justify-between px-8 text-slate-400 text-xs font-bold font-mono shrink-0 relative">
            <span>{new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</span>
            <div className="w-20 h-4 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-2" />
            <div className="flex items-center gap-1.5">
              <span>Bolivia</span>
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          </div>
        )}

        {/* Brand App Header */}
        <header className="bg-white border-b-2 border-slate-200/80 px-6 py-5 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-emerald-600/20 border-b-2 border-emerald-800">
              <Landmark className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight font-display leading-tight">
                Adela
              </h1>
              <p className="text-slate-400 text-xs font-extrabold uppercase tracking-widest leading-none mt-0.5">
                Casa de Cambio
              </p>
            </div>
          </div>

          {/* Segmented Layout Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => changeDeviceMode('celular')}
              className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
                deviceMode === 'celular'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Modo Celular"
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-[10px] hidden md:inline">Celular</span>
            </button>
            <button
              onClick={() => changeDeviceMode('tablet')}
              className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
                deviceMode === 'tablet'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Modo Tablet"
            >
              <Tablet className="w-4 h-4" />
              <span className="text-[10px] hidden md:inline">Tablet</span>
            </button>
            <button
              onClick={() => changeDeviceMode('pc')}
              className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
                deviceMode === 'pc'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Modo Pantalla Completa / PC"
            >
              <Monitor className="w-4 h-4" />
              <span className="text-[10px] hidden md:inline">Completo</span>
            </button>
          </div>
        </header>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50 p-6">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 font-bold text-lg animate-pulse">Cargando base de datos...</p>
          </div>
        ) : (
          /* Main Content - Screen Switcher with clean exit-entry transitions */
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeScreen === 'main' && (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.15 }}
                >
                  <MainScreen
                    config={config}
                    onNavigate={(screen) => setActiveScreen(screen)}
                    saldos={saldos}
                    showToast={showToast}
                  />
                </motion.div>
              )}

              {activeScreen === 'saldos' && (
                <motion.div
                  key="saldos"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <SaldosScreen
                    config={config}
                    saldos={saldos}
                    operaciones={operaciones}
                    onBack={() => setActiveScreen('main')}
                    onSaveConfig={handleSaveConfig}
                    onResetAll={handleResetAll}
                    showToast={showToast}
                  />
                </motion.div>
              )}

              {activeScreen === 'buy' && (
                <motion.div
                  key="buy"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <BuySellScreen
                    type="Compra"
                    config={config}
                    onBack={() => setActiveScreen('main')}
                    onSave={handleSaveOperation}
                    showToast={showToast}
                    saldos={saldos}
                  />
                </motion.div>
              )}

              {activeScreen === 'sell' && (
                <motion.div
                  key="sell"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <BuySellScreen
                    type="Venta"
                    config={config}
                    onBack={() => setActiveScreen('main')}
                    onSave={handleSaveOperation}
                    showToast={showToast}
                    saldos={saldos}
                  />
                </motion.div>
              )}

              {activeScreen === 'convert' && (
                <motion.div
                  key="convert"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <ConversionScreen
                    config={config}
                    onBack={() => setActiveScreen('main')}
                    showToast={showToast}
                  />
                </motion.div>
              )}

              {activeScreen === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <HistoryScreen
                    operaciones={operaciones}
                    onBack={() => setActiveScreen('main')}
                    onDelete={handleDeleteOperation}
                    showToast={showToast}
                  />
                </motion.div>
              )}

              {activeScreen === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <SettingsScreen
                    currentConfig={config}
                    onBack={() => setActiveScreen('main')}
                    onSave={handleSaveConfig}
                    showToast={showToast}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        )}

        {/* Phone Bottom Home Bar Mockup - Hidden on real phones (max-sm) */}
        {deviceMode !== 'pc' && (
          <div className="hidden sm:flex h-6 bg-slate-950 items-center justify-center shrink-0">
            <div className="w-32 h-1.5 bg-slate-700 rounded-full" />
          </div>
        )}
      </div>

      {/* Footer credits - Hidden on real phones */}
      <footer className="hidden sm:flex mt-6 text-center text-slate-500 text-sm max-w-md px-4 flex-col gap-1 leading-relaxed font-semibold">
        <p>Adela Bolivia v2.0.0 • Entorno Móvil Optimizado</p>
        <p className="text-slate-600 text-xs">Sistema Inteligente Multi-Divisa con Arqueo de Caja y Ganancia Realizada (FIFO/Promedio).</p>
      </footer>

      {/* Global high-contrast Toast feedback */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
