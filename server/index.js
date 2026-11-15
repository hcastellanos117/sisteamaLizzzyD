const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const app = express();
const PORT = process.argv.includes('--dev') ? 3001 : (process.env.PORT || 3000);
const DB_PATH = path.join(__dirname, '..', 'db.json');
const LOGS_PATH = path.join(__dirname, '..', 'logs.json');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DIST_PATH = path.join(__dirname, '..', 'dist');

// SHA-256 hash de la clave Admin911!
const ADMIN_PASSWORD_HASH = '3508fa73f41cea9d518bbcbad2ef3c392561903569f1c9d54b0ed6f546f9c8f7';

function verifyAdminAuth(req, res, next) {
  const authHeader = req.headers['x-admin-password'] || req.body?.adminPassword;
  if (!authHeader) {
    return res.status(401).json({ error: 'Se requiere contraseña de administradora.' });
  }
  const hash = crypto.createHash('sha256').update(String(authHeader)).digest('hex');
  if (hash !== ADMIN_PASSWORD_HASH) {
    return res.status(403).json({ error: 'Contraseña de administradora incorrecta.' });
  }
  next();
}

app.use(cors());
app.use(express.json());

const sseClients = new Set();

function broadcastUpdate(eventType = 'update') {
  const payload = `data: ${JSON.stringify({ type: eventType, ts: Date.now() })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { jobs: [], vales: [], gastos: [], cortes: [], cortesDiarios: [], cajaBases: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function createDailyBackup() {
  try {
    ensureDb();
    const todayKey = getLocalDateKey(new Date());
    const backupFile = path.join(BACKUP_DIR, `db-${todayKey}.json`);
    fs.copyFileSync(DB_PATH, backupFile);
  } catch (err) {
    console.error('Error creating daily backup:', err);
  }
}

function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      vales: Array.isArray(parsed.vales) ? parsed.vales : [],
      gastos: Array.isArray(parsed.gastos) ? parsed.gastos : [],
      cortes: Array.isArray(parsed.cortes) ? parsed.cortes : [],
      cortesDiarios: Array.isArray(parsed.cortesDiarios) ? parsed.cortesDiarios : [],
      cajaBases: parsed.cajaBases && typeof parsed.cajaBases === 'object' ? parsed.cajaBases : {},
      cajaSesion:
        parsed.cajaSesion && typeof parsed.cajaSesion === 'object'
          ? parsed.cajaSesion
          : { status: 'closed' },
    };
  } catch (err) {
    console.error('Error reading db.json:', err);
    return {
      jobs: [],
      vales: [],
      gastos: [],
      cortes: [],
      cortesDiarios: [],
      cajaBases: {},
      cajaSesion: { status: 'closed' },
    };
  }
}

let writeQueue = Promise.resolve();

function writeDb(data) {
  writeQueue = writeQueue.then(() => {
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, DB_PATH);
    createDailyBackup();
  });
  return writeQueue;
}

function ensureLogs() {
  if (!fs.existsSync(LOGS_PATH)) {
    try {
      fs.writeFileSync(LOGS_PATH, '[]', 'utf8');
    } catch (err) {
      console.error('Error al inicializar logs.json:', err);
    }
  }
}

let logWriteQueue = Promise.resolve();

function appendLog({ accion, modulo, descripcion, datos = null }) {
  const now = new Date();
  const fecha = getLocalDateKey(now);
  const hora = now.toLocaleTimeString('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const entry = {
    id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    fecha,
    hora,
    timestamp: now.toISOString(),
    accion,
    modulo,
    descripcion,
    datos,
  };

  logWriteQueue = logWriteQueue.then(() => {
    try {
      ensureLogs();
      let logs = [];
      try {
        const raw = fs.readFileSync(LOGS_PATH, 'utf8');
        logs = JSON.parse(raw);
        if (!Array.isArray(logs)) logs = [];
      } catch {
        logs = [];
      }
      logs.unshift(entry);
      if (logs.length > 5000) {
        logs = logs.slice(0, 5000);
      }
      const tmpPath = `${LOGS_PATH}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(logs, null, 2), 'utf8');
      fs.renameSync(tmpPath, LOGS_PATH);
    } catch (err) {
      console.error('Error escribiendo en logs.json:', err);
    }
  });

  return entry;
}

function calculateSplit(amount, worker) {
  const num = Math.round(Number(amount) * 100) / 100;
  if (worker === 'lizzy') {
    return { lizzyAmount: num, sandraAmount: 0 };
  }
  if (worker === 'sandra') {
    return { lizzyAmount: 0, sandraAmount: num };
  }
  const half = Math.round((num / 2) * 100) / 100;
  const otherHalf = Math.round((num - half) * 100) / 100;
  return { lizzyAmount: half, sandraAmount: otherHalf };
}

function getLastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

const MONTH_NAMES_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function getQuincenaInfo(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const lastDay = getLastDayOfMonth(year, month);
  const monthName = MONTH_NAMES_ES[month];

  const cutoff15 = new Date(year, month, 15, 20, 0, 0, 0);
  const cutoffEnd = new Date(year, month, lastDay, 20, 0, 0, 0);

  if (day < 15 || (day === 15 && now < cutoff15)) {
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}-Q1`,
      label: `1 - 15 ${monthName} ${year}`,
      cutoffDate: cutoff15.toISOString(),
      isCutoffReached: false,
    };
  }

  if (day === 15 && now >= cutoff15) {
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}-Q1`,
      label: `1 - 15 ${monthName} ${year}`,
      cutoffDate: cutoff15.toISOString(),
      isCutoffReached: true,
    };
  }

  if (day < lastDay || (day === lastDay && now < cutoffEnd)) {
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}-Q2`,
      label: `16 - ${lastDay} ${monthName} ${year}`,
      cutoffDate: cutoffEnd.toISOString(),
      isCutoffReached: false,
    };
  }

  return {
    key: `${year}-${String(month + 1).padStart(2, '0')}-Q2`,
    label: `16 - ${lastDay} ${monthName} ${year}`,
    cutoffDate: cutoffEnd.toISOString(),
    isCutoffReached: true,
  };
}

// API routes

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'connected', ts: Date.now() })}\n\n`);
  sseClients.add(res);
  req.on('close', () => {
    sseClients.delete(res);
  });
});

app.get('/api/state', (req, res) => {
  const db = readDb();
  const quincena = getQuincenaInfo(new Date());
  const alreadyClosedCurrent = db.cortes.some((c) => c.periodKey === quincena.key);

  const unclosedJobs = db.jobs.filter((j) => !j.corteId);
  const unclosedVales = db.vales.filter((v) => !v.corteId);
  const unclosedGastos = db.gastos.filter((g) => !g.corteId);

  const hasOverdueItems = [...unclosedJobs, ...unclosedVales, ...unclosedGastos].some((item) => {
    const itemQuincena = getQuincenaInfo(new Date(item.createdAt));
    return itemQuincena.key !== quincena.key;
  });

  const hasPendingItems =
    unclosedJobs.length > 0 || unclosedVales.length > 0 || unclosedGastos.length > 0;

  res.json({
    jobs: db.jobs,
    vales: db.vales,
    gastos: db.gastos,
    cortes: db.cortes,
    cortesDiarios: db.cortesDiarios,
    cajaBases: db.cajaBases,
    cajaSesion: db.cajaSesion || { status: 'closed' },
    quincena: {
      ...quincena,
      alreadyClosed: alreadyClosedCurrent,
      shouldAlert:
        (quincena.isCutoffReached && !alreadyClosedCurrent && hasPendingItems) || hasOverdueItems,
      hasOverdueJobs: hasOverdueItems,
    },
  });
});

// Trabajos

app.post('/api/jobs', async (req, res) => {
  try {
    const db = readDb();
    if (!db.cajaSesion || db.cajaSesion.status !== 'open') {
      return res.status(400).json({
        error: 'La caja está cerrada. Debes aperturar la caja con un monto inicial para poder registrar servicios.',
      });
    }

    const { description, amount, worker, paymentMethod, clientReference } = req.body;
    const numericAmount = Number(amount);

    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: 'La descripción del servicio es obligatoria.' });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Ingresa un monto válido mayor a 0.' });
    }
    if (!['lizzy', 'sandra', 'both'].includes(worker)) {
      return res.status(400).json({ error: 'Colaboradora inválida.' });
    }
    if (!['efectivo', 'transferencia'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Método de pago inválido.' });
    }

    const { lizzyAmount, sandraAmount } = calculateSplit(numericAmount, worker);
    const newJob = {
      id: crypto.randomUUID(),
      description: String(description).trim(),
      clientReference: clientReference ? String(clientReference).trim() : '',
      amount: Math.round(numericAmount * 100) / 100,
      worker,
      lizzyAmount,
      sandraAmount,
      paymentMethod,
      createdAt: new Date().toISOString(),
      corteId: null,
    };

    db.jobs.unshift(newJob);
    await writeDb(db);
    appendLog({
      accion: 'REGISTRAR',
      modulo: 'TRABAJO',
      descripcion: `Se registró trabajo "${newJob.description}" por Lps. ${newJob.amount.toFixed(2)} (Colaboradora: ${newJob.worker}, Pago: ${newJob.paymentMethod}${newJob.clientReference ? `, Cliente: ${newJob.clientReference}` : ''})`,
      datos: newJob,
    });
    broadcastUpdate('job_added');

    res.status(201).json(newJob);
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ error: 'Error al guardar el trabajo.' });
  }
});

app.put('/api/jobs/:id', verifyAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, worker, paymentMethod, clientReference } = req.body;
    const db = readDb();
    const index = db.jobs.findIndex((j) => j.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Trabajo no encontrado.' });
    }
    if (db.jobs[index].corteId) {
      return res
        .status(400)
        .json({ error: 'No se puede editar un trabajo de una quincena ya cerrada.' });
    }

    const numericAmount = Number(amount);
    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: 'La descripción es obligatoria.' });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0.' });
    }
    if (!['lizzy', 'sandra', 'both'].includes(worker)) {
      return res.status(400).json({ error: 'Colaboradora inválida.' });
    }
    if (!['efectivo', 'transferencia'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Método de pago inválido.' });
    }

    const prevJob = { ...db.jobs[index] };
    const { lizzyAmount, sandraAmount } = calculateSplit(numericAmount, worker);
    db.jobs[index] = {
      ...db.jobs[index],
      description: String(description).trim(),
      clientReference:
        clientReference !== undefined
          ? String(clientReference).trim()
          : db.jobs[index].clientReference || '',
      amount: Math.round(numericAmount * 100) / 100,
      worker,
      lizzyAmount,
      sandraAmount,
      paymentMethod,
      updatedAt: new Date().toISOString(),
    };

    await writeDb(db);
    appendLog({
      accion: 'EDITAR',
      modulo: 'TRABAJO',
      descripcion: `Se editó trabajo "${db.jobs[index].description}" (ID: ${id}). Monto: Lps. ${prevJob.amount.toFixed(2)} -> Lps. ${db.jobs[index].amount.toFixed(2)}`,
      datos: {
        id,
        antes: prevJob,
        despues: db.jobs[index],
      },
    });
    broadcastUpdate('job_updated');

    res.json(db.jobs[index]);
  } catch (err) {
    console.error('Error updating job:', err);
    res.status(500).json({ error: 'Error al actualizar el trabajo.' });
  }
});

app.delete('/api/jobs/:id', verifyAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = readDb();
    const job = db.jobs.find((j) => j.id === id);

    if (!job) {
      return res.status(404).json({ error: 'Trabajo no encontrado.' });
    }
    if (job.corteId) {
      return res
        .status(400)
        .json({ error: 'No se puede eliminar un trabajo de una quincena ya cerrada.' });
    }

    db.jobs = db.jobs.filter((j) => j.id !== id);
    await writeDb(db);
    appendLog({
      accion: 'ELIMINAR',
      modulo: 'TRABAJO',
      descripcion: `Se eliminó trabajo "${job.description}" por Lps. ${job.amount.toFixed(2)} (Colaboradora: ${job.worker}, Pago: ${job.paymentMethod})`,
      datos: job,
    });
    broadcastUpdate('job_deleted');

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting job:', err);
    res.status(500).json({ error: 'Error al eliminar el trabajo.' });
  }
});

// Retiros y adelantos por colaboradora

app.post('/api/vales', async (req, res) => {
  try {
    const { worker, amount, paymentMethod, note } = req.body;
    const numericAmount = Number(amount);

    if (!['lizzy', 'sandra'].includes(worker)) {
      return res.status(400).json({ error: 'El vale debe asignarse a Lizzy o Sandra.' });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Ingresa un monto válido mayor a 0.' });
    }
    if (!['efectivo', 'transferencia'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Método de entrega inválido.' });
    }

    const newVale = {
      id: crypto.randomUUID(),
      worker,
      amount: Math.round(numericAmount * 100) / 100,
      paymentMethod,
      note: note ? String(note).trim() : '',
      createdAt: new Date().toISOString(),
      corteId: null,
    };

    const db = readDb();
    db.vales.unshift(newVale);
    await writeDb(db);
    appendLog({
      accion: 'REGISTRAR',
      modulo: 'VALE',
      descripcion: `Se registró vale para ${newVale.worker} por Lps. ${newVale.amount.toFixed(2)} (${newVale.paymentMethod}${newVale.note ? ` - Nota: ${newVale.note}` : ''})`,
      datos: newVale,
    });
    broadcastUpdate('vale_added');

    res.status(201).json(newVale);
  } catch (err) {
    console.error('Error creating vale:', err);
    res.status(500).json({ error: 'Error al registrar el vale.' });
  }
});

app.delete('/api/vales/:id', verifyAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = readDb();
    const vale = db.vales.find((v) => v.id === id);

    if (!vale) {
      return res.status(404).json({ error: 'Vale no encontrado.' });
    }
    if (vale.corteId) {
      return res
        .status(400)
        .json({ error: 'No se puede eliminar un vale de una quincena ya cerrada.' });
    }

    db.vales = db.vales.filter((v) => v.id !== id);
    await writeDb(db);
    appendLog({
      accion: 'ELIMINAR',
      modulo: 'VALE',
      descripcion: `Se eliminó vale de ${vale.worker} por Lps. ${vale.amount.toFixed(2)}${vale.note ? ` (Nota: ${vale.note})` : ''}`,
      datos: vale,
    });
    broadcastUpdate('vale_deleted');

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting vale:', err);
    res.status(500).json({ error: 'Error al eliminar el vale.' });
  }
});

// Gastos del salón (insumos, compras locales)

app.post('/api/gastos', async (req, res) => {
  try {
    const { description, amount, paymentMethod } = req.body;
    const numericAmount = Number(amount);

    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: 'Describe en qué se gastó (ej. Tintes, Acetona).' });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Ingresa un monto válido mayor a 0.' });
    }
    if (!['efectivo', 'transferencia'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Método de pago inválido.' });
    }

    const newGasto = {
      id: crypto.randomUUID(),
      description: String(description).trim(),
      amount: Math.round(numericAmount * 100) / 100,
      paymentMethod,
      createdAt: new Date().toISOString(),
      corteId: null,
    };

    const db = readDb();
    db.gastos.unshift(newGasto);
    await writeDb(db);
    appendLog({
      accion: 'REGISTRAR',
      modulo: 'GASTO',
      descripcion: `Se registró gasto del salón: "${newGasto.description}" por Lps. ${newGasto.amount.toFixed(2)} (${newGasto.paymentMethod})`,
      datos: newGasto,
    });
    broadcastUpdate('gasto_added');

    res.status(201).json(newGasto);
  } catch (err) {
    console.error('Error creating gasto:', err);
    res.status(500).json({ error: 'Error al registrar el gasto del salón.' });
  }
});

app.delete('/api/gastos/:id', verifyAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = readDb();
    const gasto = db.gastos.find((g) => g.id === id);

    if (!gasto) {
      return res.status(404).json({ error: 'Gasto no encontrado.' });
    }
    if (gasto.corteId) {
      return res
        .status(400)
        .json({ error: 'No se puede eliminar un gasto de una quincena ya cerrada.' });
    }

    db.gastos = db.gastos.filter((g) => g.id !== id);
    await writeDb(db);
    appendLog({
      accion: 'ELIMINAR',
      modulo: 'GASTO',
      descripcion: `Se eliminó gasto del salón: "${gasto.description}" por Lps. ${gasto.amount.toFixed(2)}`,
      datos: gasto,
    });
    broadcastUpdate('gasto_deleted');

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting gasto:', err);
    res.status(500).json({ error: 'Error al eliminar el gasto.' });
  }
});

// Base inicial de efectivo en caja (bloqueado contra edición una vez aperturada)

app.put('/api/caja-base', verifyAdminAuth, async (req, res) => {
  return res.status(403).json({
    error: 'El monto de apertura de caja no se puede editar una vez registrado.',
  });
});

// Corte de caja manual (arqueo diario y turnos múltiples)

app.post('/api/cortes-diarios', async (req, res) => {
  try {
    const {
      dateKey,
      periodLabel,
      openedAt,
      closedAt,
      corteNumber,
      corteLabel,
      baseAmount,
      totalServicios,
      lizzyServicios,
      sandraServicios,
      valesTotal,
      gastosTotal,
      efectivoCobrado,
      efectivoEsperado,
      efectivoContado,
      transferenciaTotal,
      jobCount,
      jobIds,
      valesIds,
      gastosIds,
      note,
    } = req.body;

    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
    const esperado = round2(efectivoEsperado);
    const contado =
      efectivoContado !== undefined && efectivoContado !== ''
        ? round2(efectivoContado)
        : esperado;

    const nowIso = new Date().toISOString();
    const resolvedClosedAt = closedAt || nowIso;
    const resolvedOpenedAt = openedAt || resolvedClosedAt;

    const nuevoCorteCaja = {
      id: `caja_${Date.now()}`,
      dateKey: dateKey || getLocalDateKey(new Date()),
      periodLabel: periodLabel || getLocalDateKey(new Date()),
      openedAt: resolvedOpenedAt,
      closedAt: resolvedClosedAt,
      corteNumber: Number(corteNumber) || 1,
      corteLabel: corteLabel ? String(corteLabel).trim() : `Corte #${corteNumber || 1}`,
      baseAmount: round2(baseAmount),
      totalServicios: round2(totalServicios),
      lizzyServicios: round2(lizzyServicios),
      sandraServicios: round2(sandraServicios),
      valesTotal: round2(valesTotal),
      gastosTotal: round2(gastosTotal),
      efectivoCobrado: round2(efectivoCobrado),
      efectivoEsperado: esperado,
      efectivoContado: contado,
      diferencia: round2(contado - esperado),
      transferenciaTotal: round2(transferenciaTotal),
      jobCount: Number(jobCount) || 0,
      jobIds: Array.isArray(jobIds) ? jobIds : [],
      valesIds: Array.isArray(valesIds) ? valesIds : [],
      gastosIds: Array.isArray(gastosIds) ? gastosIds : [],
      note: note ? String(note).trim() : '',
    };

    const db = readDb();

    // Marcar los movimientos comprendidos en este corte para limpiar la caja activa
    if (nuevoCorteCaja.jobIds.length > 0) {
      const jSet = new Set(nuevoCorteCaja.jobIds);
      db.jobs = db.jobs.map((j) => (jSet.has(j.id) ? { ...j, corteDiarioId: nuevoCorteCaja.id } : j));
    }
    if (nuevoCorteCaja.valesIds.length > 0) {
      const vSet = new Set(nuevoCorteCaja.valesIds);
      db.vales = db.vales.map((v) => (vSet.has(v.id) ? { ...v, corteDiarioId: nuevoCorteCaja.id } : v));
    }
    if (nuevoCorteCaja.gastosIds.length > 0) {
      const gSet = new Set(nuevoCorteCaja.gastosIds);
      db.gastos = db.gastos.map((g) => (gSet.has(g.id) ? { ...g, corteDiarioId: nuevoCorteCaja.id } : g));
    }

    // Cerrar la sesión de caja activa al finalizar el corte
    db.cajaSesion = {
      status: 'closed',
      closedAt: nuevoCorteCaja.closedAt,
      dateKey: nuevoCorteCaja.dateKey,
      baseAmount: 0,
    };

    db.cortesDiarios.unshift(nuevoCorteCaja);
    await writeDb(db);
    appendLog({
      accion: 'REGISTRAR',
      modulo: 'CORTE_DIARIO',
      descripcion: `Corte de caja ${nuevoCorteCaja.corteLabel} realizado (${nuevoCorteCaja.dateKey}). Total servicios: Lps. ${nuevoCorteCaja.totalServicios.toFixed(2)}, Efectivo esperado: Lps. ${nuevoCorteCaja.efectivoEsperado.toFixed(2)}, Contado: Lps. ${nuevoCorteCaja.efectivoContado.toFixed(2)} (Diferencia: Lps. ${nuevoCorteCaja.diferencia.toFixed(2)}). Total trabajos: ${nuevoCorteCaja.jobCount}`,
      datos: nuevoCorteCaja,
    });
    broadcastUpdate('corte_diario_added');

    res.status(201).json(nuevoCorteCaja);
  } catch (err) {
    console.error('Error creating corte diario:', err);
    res.status(500).json({ error: 'Error al guardar el corte de caja manual.' });
  }
});

// Aperturar caja con monto inicial
app.post('/api/caja/apertura', async (req, res) => {
  try {
    const { baseAmount, dateKey } = req.body;
    const numBase = Number(baseAmount);
    if (!Number.isFinite(numBase) || numBase < 0) {
      return res.status(400).json({ error: 'Ingresa un monto inicial válido (0 o mayor).' });
    }

    const db = readDb();
    if (db.cajaSesion?.status === 'open') {
      return res.json({
        ok: true,
        cajaSesion: db.cajaSesion,
        alreadyOpen: true,
      });
    }

    const resolvedDateKey = dateKey || getLocalDateKey(new Date());
    const roundedBase = Math.round(numBase * 100) / 100;

    db.cajaSesion = {
      status: 'open',
      openedAt: new Date().toISOString(),
      baseAmount: roundedBase,
      dateKey: resolvedDateKey,
    };
    db.cajaBases[resolvedDateKey] = roundedBase;

    await writeDb(db);
    appendLog({
      accion: 'REGISTRAR',
      modulo: 'APERTURA_CAJA',
      descripcion: `Apertura de caja con base inicial de Lps. ${roundedBase.toFixed(2)} (Fecha: ${resolvedDateKey})`,
      datos: { baseAmount: roundedBase, dateKey: resolvedDateKey, openedAt: db.cajaSesion.openedAt },
    });
    broadcastUpdate('caja_opened');

    res.json({ ok: true, cajaSesion: db.cajaSesion });
  } catch (err) {
    console.error('Error opening caja:', err);
    res.status(500).json({ error: 'Error al aperturar la caja.' });
  }
});

app.delete('/api/cortes-diarios/:id', verifyAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = readDb();
    const targetCorte = db.cortesDiarios.find((c) => c.id === id);
    const dateKey = targetCorte?.dateKey || db.cajaSesion?.dateKey || getLocalDateKey(new Date());

    db.cortesDiarios = db.cortesDiarios.filter((c) => c.id !== id);

    // Al eliminar un corte de caja guardado, eliminar también los trabajos, vales y gastos
    // comprendidos en ese corte para que no vuelvan a aparecer como caja activa en curso.
    const jobIdsToDelete = new Set(targetCorte?.jobIds || []);
    const valesIdsToDelete = new Set(targetCorte?.valesIds || []);
    const gastosIdsToDelete = new Set(targetCorte?.gastosIds || []);

    db.jobs = db.jobs.filter((j) => j.corteDiarioId !== id && !jobIdsToDelete.has(j.id));
    db.vales = db.vales.filter((v) => v.corteDiarioId !== id && !valesIdsToDelete.has(v.id));
    db.gastos = db.gastos.filter((g) => g.corteDiarioId !== id && !gastosIdsToDelete.has(g.id));

    // Al eliminar un corte, la caja queda SIEMPRE cerrada y en cero.
    // Ninguna caja activa debe permanecer abierta.
    db.cajaSesion = {
      status: 'closed',
      closedAt: new Date().toISOString(),
      dateKey,
      baseAmount: 0,
    };

    delete db.cajaBases[dateKey];
    if (db.cortesDiarios.length === 0) {
      db.cajaBases = {};
    }

    await writeDb(db);
    appendLog({
      accion: 'ELIMINAR',
      modulo: 'CORTE_DIARIO',
      descripcion: `Se eliminó corte de caja ${targetCorte?.corteLabel || id} del día ${dateKey}. Se eliminaron ${jobIdsToDelete.size} trabajos, ${valesIdsToDelete.size} vales y ${gastosIdsToDelete.size} gastos vinculados. Caja reiniciada a cerrada en cero.`,
      datos: {
        id,
        corteEliminado: targetCorte,
        jobIdsEliminados: Array.from(jobIdsToDelete),
        valesIdsEliminados: Array.from(valesIdsToDelete),
        gastosIdsEliminados: Array.from(gastosIdsToDelete),
      },
    });
    broadcastUpdate('corte_diario_deleted');
    res.json({ ok: true, cajaSesion: db.cajaSesion });
  } catch (err) {
    console.error('Error deleting corte diario:', err);
    res.status(500).json({ error: 'Error al eliminar el corte de caja.' });
  }
});

// Cortes quincenales

app.post('/api/cortes', async (req, res) => {
  try {
    const db = readDb();
    const unclosedJobs = db.jobs.filter((j) => !j.corteId);
    const unclosedVales = db.vales.filter((v) => !v.corteId);
    const unclosedGastos = db.gastos.filter((g) => !g.corteId);

    if (
      unclosedJobs.length === 0 &&
      unclosedVales.length === 0 &&
      unclosedGastos.length === 0
    ) {
      return res
        .status(400)
        .json({ error: 'No hay movimientos pendientes para cerrar en esta quincena.' });
    }

    const now = new Date();
    const currentQuincena = getQuincenaInfo(now);

    const allPending = [...unclosedJobs, ...unclosedVales, ...unclosedGastos].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    const oldestQuincena = getQuincenaInfo(new Date(allPending[0].createdAt));
    const useOldest = oldestQuincena.key !== currentQuincena.key;
    const periodInfo = useOldest ? oldestQuincena : currentQuincena;

    let totalAmount = 0;
    let lizzyGross = 0;
    let sandraGross = 0;
    let efectivoTotal = 0;
    let transferenciaTotal = 0;

    for (const job of unclosedJobs) {
      totalAmount += job.amount;
      lizzyGross += job.lizzyAmount;
      sandraGross += job.sandraAmount;
      if (job.paymentMethod === 'efectivo') {
        efectivoTotal += job.amount;
      } else {
        transferenciaTotal += job.amount;
      }
    }

    let lizzyVales = 0;
    let sandraVales = 0;
    let efectivoVales = 0;
    let transferenciaVales = 0;

    for (const vale of unclosedVales) {
      if (vale.worker === 'lizzy') lizzyVales += vale.amount;
      else if (vale.worker === 'sandra') sandraVales += vale.amount;
      if (vale.paymentMethod === 'efectivo') efectivoVales += vale.amount;
      else transferenciaVales += vale.amount;
    }

    let gastosTotal = 0;
    let efectivoGastos = 0;
    let transferenciaGastos = 0;

    for (const gasto of unclosedGastos) {
      gastosTotal += gasto.amount;
      if (gasto.paymentMethod === 'efectivo') efectivoGastos += gasto.amount;
      else transferenciaGastos += gasto.amount;
    }

    const round2 = (n) => Math.round(n * 100) / 100;
    const corteId = `corte_${Date.now()}`;

    const newCorte = {
      id: corteId,
      periodKey: periodInfo.key,
      periodLabel: periodInfo.label,
      closedAt: now.toISOString(),
      totalAmount: round2(totalAmount),
      lizzyGross: round2(lizzyGross),
      sandraGross: round2(sandraGross),
      lizzyVales: round2(lizzyVales),
      sandraVales: round2(sandraVales),
      valesTotal: round2(lizzyVales + sandraVales),
      gastosTotal: round2(gastosTotal),
      lizzyTotal: round2(lizzyGross - lizzyVales),
      sandraTotal: round2(sandraGross - sandraVales - gastosTotal),
      efectivoTotal: round2(efectivoTotal),
      efectivoVales: round2(efectivoVales),
      efectivoGastos: round2(efectivoGastos),
      transferenciaTotal: round2(transferenciaTotal),
      transferenciaVales: round2(transferenciaVales),
      transferenciaGastos: round2(transferenciaGastos),
      jobCount: unclosedJobs.length,
      valeCount: unclosedVales.length,
      gastoCount: unclosedGastos.length,
    };

    db.jobs = db.jobs.map((j) => (!j.corteId ? { ...j, corteId } : j));
    db.vales = db.vales.map((v) => (!v.corteId ? { ...v, corteId } : v));
    db.gastos = db.gastos.map((g) => (!g.corteId ? { ...g, corteId } : g));
    db.cortes.unshift(newCorte);

    await writeDb(db);
    appendLog({
      accion: 'REGISTRAR',
      modulo: 'CORTE_QUINCENAL',
      descripcion: `Cierre de corte quincenal "${newCorte.periodLabel}". Total bruto: Lps. ${newCorte.totalAmount.toFixed(2)} (Lizzy neto: Lps. ${newCorte.lizzyTotal.toFixed(2)}, Sandra neto: Lps. ${newCorte.sandraTotal.toFixed(2)}). ${newCorte.jobCount} servicios, ${newCorte.valeCount} vales, ${newCorte.gastoCount} gastos.`,
      datos: newCorte,
    });
    broadcastUpdate('corte_closed');

    res.status(201).json(newCorte);
  } catch (err) {
    console.error('Error closing corte:', err);
    res.status(500).json({ error: 'Error al cerrar la quincena.' });
  }
});

// Exportar movimientos a Excel (.csv)

function escapeCsv(val) {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

app.get('/api/export.csv', (req, res) => {
  const db = readDb();
  const { corteId, start, end } = req.query;

  const corteMap = new Map(db.cortes.map((c) => [c.id, c.periodLabel]));

  const filterItem = (item) => {
    if (corteId) return item.corteId === corteId;
    const dateKey = getLocalDateKey(new Date(item.createdAt));
    if (start && dateKey < start) return false;
    if (end && dateKey > end) return false;
    return true;
  };

  const rows = [];
  rows.push([
    'Fecha',
    'Hora',
    'Tipo',
    'Descripcion / Motivo',
    'Clienta / Referencia',
    'Colaboradora',
    'Metodo de Pago',
    'Monto Total (Lps)',
    'Lizzy (Lps)',
    'Sandra (Lps)',
    'Estado / Quincena',
  ]);

  const combined = [
    ...db.jobs.filter(filterItem).map((j) => ({ ...j, _kind: 'job' })),
    ...db.vales.filter(filterItem).map((v) => ({ ...v, _kind: 'vale' })),
    ...db.gastos.filter(filterItem).map((g) => ({ ...g, _kind: 'gasto' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  for (const item of combined) {
    const dt = new Date(item.createdAt);
    const fecha = getLocalDateKey(dt);
    const hora = dt.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
    const estado = item.corteId ? corteMap.get(item.corteId) || 'Cerrado' : 'Quincena actual';

    if (item._kind === 'job') {
      const colab =
        item.worker === 'lizzy'
          ? 'Solo Lizzy'
          : item.worker === 'sandra'
          ? 'Solo Sandra'
          : 'Compartido (50/50)';
      rows.push([
        fecha,
        hora,
        'Servicio',
        item.description,
        item.clientReference || '',
        colab,
        item.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia',
        item.amount,
        item.lizzyAmount,
        item.sandraAmount,
        estado,
      ]);
    } else if (item._kind === 'vale') {
      const colab = item.worker === 'lizzy' ? 'Lizzy Dinora Viera' : 'Sandra Viera';
      rows.push([
        fecha,
        hora,
        'Vale personal',
        item.note || 'Retiro / Vale',
        '',
        colab,
        item.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia',
        -item.amount,
        item.worker === 'lizzy' ? -item.amount : 0,
        item.worker === 'sandra' ? -item.amount : 0,
        estado,
      ]);
    } else {
      rows.push([
        fecha,
        hora,
        'Gasto del salon',
        item.description,
        '',
        'Salon general (Deduce Sandra)',
        item.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia',
        -item.amount,
        0,
        -item.amount,
        estado,
      ]);
    }
  }

  const csvContent = '\uFEFF' + rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');
  const filename = `salon_lizzy_sandra_${getLocalDateKey(new Date())}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
});

if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH, { index: false }));
  app.get('/{*splat}', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }
  return addresses;
}

ensureDb();
ensureLogs();
createDailyBackup();

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n==================================================');
  console.log('  SISTEMA DE GESTION - DINORA BEAUTY NAILS');
  console.log('==================================================');
  console.log(`  En esta PC:      http://localhost:${PORT}`);
  const ips = getLocalIPv4Addresses();
  if (ips.length > 0) {
    ips.forEach(({ name, address }) => {
      console.log(`  En celulares (${name}): http://${address}:${PORT}`);
    });
  } else {
    console.log(`  En celulares:    http://<IP-DE-ESTA-PC>:${PORT}`);
  }
  console.log(`  Respaldos auto:  carpeta /backups`);
  console.log('==================================================\n');
});
