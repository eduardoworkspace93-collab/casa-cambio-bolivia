import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { Operacion, Configuracion, DivisaType } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initial default configuration (common rates in Bolivia)
const DEFAULT_CONFIG: Configuracion = {
  USD: { Compra: 6.86, Venta: 6.96 },
  EUR: { Compra: 7.45, Venta: 7.65 },
  PEN: { Compra: 1.80, Venta: 1.95 },
  SaldosIniciales: { USD: 0, EUR: 0, PEN: 0, BOB: 0 },
};

// -------------------------------------------------------------------------
// FIREBASE FIRESTORE DATABASE SERVICE
// -------------------------------------------------------------------------
let db: any;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const firebaseApp = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });
    // Initialize Firestore with the specific databaseId from config
    db = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    }, config.firestoreDatabaseId || "(default)");
    console.log(`Firebase Client SDK initialized on server successfully with project: ${config.projectId} and database: ${config.firestoreDatabaseId}`);
  } else {
    throw new Error("firebase-applet-config.json not found");
  }
} catch (error) {
  console.error("Failed to initialize Firebase, database operations might fail:", error);
}

// Helper to clear a collection in Firestore
async function clearCollection(collectionName: string): Promise<void> {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

// Read config from Firestore
async function readConfig(): Promise<Configuracion> {
  try {
    const docRef = doc(db, "configuracion", "main");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Configuracion;
      return {
        USD: data.USD || DEFAULT_CONFIG.USD,
        EUR: data.EUR || DEFAULT_CONFIG.EUR,
        PEN: data.PEN || DEFAULT_CONFIG.PEN,
        SaldosIniciales: data.SaldosIniciales || DEFAULT_CONFIG.SaldosIniciales,
      };
    } else {
      // Document does not exist yet, seed and save default config to Firestore
      await setDoc(docRef, DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
  } catch (error) {
    console.error("Error reading configuration from Firestore, using defaults:", error);
    return DEFAULT_CONFIG;
  }
}

// Write config to Firestore
async function writeConfig(config: Configuracion): Promise<void> {
  try {
    const docRef = doc(db, "configuracion", "main");
    await setDoc(docRef, config, { merge: true });
  } catch (error) {
    console.error("Error writing configuration to Firestore:", error);
  }
}

// Read operations from Firestore
async function readOperaciones(): Promise<Operacion[]> {
  try {
    const colRef = collection(db, "operaciones");
    const snapshot = await getDocs(colRef);
    const ops: Operacion[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      ops.push({
        ID: data.ID || doc.id,
        Fecha: data.Fecha,
        Hora: data.Hora,
        TipoOperacion: data.TipoOperacion,
        Divisa: data.Divisa,
        Cantidad: Number(data.Cantidad),
        TipoCambio: Number(data.TipoCambio),
        TotalBs: Number(data.TotalBs),
      } as Operacion);
    });
    return ops;
  } catch (error) {
    console.error("Error reading operations from Firestore:", error);
    return [];
  }
}

// Write a single operation to Firestore
async function writeOperacion(op: Operacion): Promise<void> {
  try {
    const docRef = doc(db, "operaciones", op.ID);
    await setDoc(docRef, op);
  } catch (error) {
    console.error("Error writing operation to Firestore:", error);
  }
}

// Delete an operation from Firestore
async function deleteOperacion(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, "operaciones", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return false;
    }
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting operation from Firestore:", error);
    return false;
  }
}

// -------------------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------------------

// GET Configuration
app.get("/api/configuracion", async (req, res) => {
  const config = await readConfig();
  res.json(config);
});

// POST Configuration (Updates Buy/Sell rates and Starting Balances)
app.post("/api/configuracion", async (req, res) => {
  const { USD, EUR, PEN, SaldosIniciales } = req.body;
  
  if (!USD || !EUR || !PEN) {
    return res.status(400).json({ error: "Faltan datos de configuración para las divisas." });
  }

  // Simple validations
  if (
    USD.Compra <= 0 || USD.Venta <= 0 ||
    EUR.Compra <= 0 || EUR.Venta <= 0 ||
    PEN.Compra <= 0 || PEN.Venta <= 0
  ) {
    return res.status(400).json({ error: "Todos los tipos de cambio deben ser mayores a cero." });
  }

  const newConfig: Configuracion = { 
    USD, 
    EUR, 
    PEN,
    SaldosIniciales: SaldosIniciales || { USD: 0, EUR: 0, PEN: 0, BOB: 0 }
  };
  await writeConfig(newConfig);
  res.json({ message: "Configuración guardada correctamente", configuracion: newConfig });
});

// GET Operations
app.get("/api/operaciones", async (req, res) => {
  let ops = await readOperaciones();
  
  // Sort: most recent first
  ops.sort((a, b) => {
    const dateTimeA = `${a.Fecha}T${a.Hora}`;
    const dateTimeB = `${b.Fecha}T${b.Hora}`;
    return dateTimeB.localeCompare(dateTimeA);
  });

  const fechaQuery = req.query.fecha as string;
  if (fechaQuery) {
    ops = ops.filter(op => op.Fecha === fechaQuery);
  }

  res.json(ops);
});

// POST Operation (Registers a new Buy or Sell transaction)
app.post("/api/operaciones", async (req, res) => {
  const { Cantidad, TipoCambio, TipoOperacion, Divisa } = req.body;

  // Validation
  if (TipoOperacion !== "Compra" && TipoOperacion !== "Venta") {
    return res.status(400).json({ error: "El tipo de operación debe ser Compra o Venta." });
  }

  const allowedDivisas: DivisaType[] = ["USD", "EUR", "PEN"];
  if (!allowedDivisas.includes(Divisa)) {
    return res.status(400).json({ error: "Divisa no admitida. Use USD, EUR o PEN." });
  }

  const cantidadVal = parseFloat(Cantidad);
  const tipoCambioVal = parseFloat(TipoCambio);

  if (isNaN(cantidadVal) || cantidadVal <= 0) {
    return res.status(400).json({ error: "La cantidad debe ser mayor a cero." });
  }

  if (isNaN(tipoCambioVal) || tipoCambioVal <= 0) {
    return res.status(400).json({ error: "El tipo de cambio debe ser mayor a cero." });
  }

  // Auto-calculation: TotalBs = Cantidad × TipoCambio
  const TotalBs = Math.round(cantidadVal * tipoCambioVal * 100) / 100;

  const now = new Date();
  
  // Format Fecha: YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const Fecha = `${year}-${month}-${day}`;

  // Format Hora: HH:MM:SS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const Hora = `${hours}:${minutes}:${seconds}`;

  // Unique ID
  const ID = String(Date.now());

  const newOp: Operacion = {
    ID,
    Fecha,
    Hora,
    TipoOperacion,
    Divisa,
    Cantidad: cantidadVal,
    TipoCambio: tipoCambioVal,
    TotalBs,
  };

  await writeOperacion(newOp);

  res.status(201).json({
    message: "Operación registrada correctamente.",
    operacion: newOp,
  });
});

// DELETE Operation
app.delete("/api/operaciones/:id", async (req, res) => {
  const id = req.params.id;
  const success = await deleteOperacion(id);

  if (!success) {
    return res.status(404).json({ error: "Operación no encontrada." });
  }

  res.json({ message: "Operación eliminada correctamente." });
});

// POST Reset All (Resets operations to [] and starting balances to 0)
app.post("/api/reset", async (req, res) => {
  try {
    // 1. Clear operations collection in Firestore
    await clearCollection("operaciones");

    // 2. Reset starting balances to 0 in config
    const currentConfig = await readConfig();
    const newConfig: Configuracion = {
      ...currentConfig,
      SaldosIniciales: { BOB: 0, USD: 0, EUR: 0, PEN: 0 }
    };
    await writeConfig(newConfig);

    res.json({ message: "Todo ha sido reseteado correctamente. Los saldos iniciales y operaciones están en cero." });
  } catch (error: any) {
    console.error("Error resetting data:", error);
    res.status(500).json({ error: "No se pudo realizar el reseteo del sistema." });
  }
});

// -------------------------------------------------------------------------
// VITE MIDDLEWARE SETUP & STATIC ASSETS
// -------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
