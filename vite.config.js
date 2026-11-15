import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'db.json');
const LOGS_PATH = path.join(__dirname, 'logs.json');
const ADMIN_PASSWORD_HASH = '3508fa73f41cea9d518bbcbad2ef3c392561903569f1c9d54b0ed6f546f9c8f7';

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function appendLogSafe({ accion, modulo, descripcion, datos = null }) {
  try {
    const now = new Date();
    const fecha = getLocalDateKey(now);
    const hora = now.toLocaleTimeString('es-HN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    const logItem = {
      id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      fecha,
      hora,
      timestamp: now.toISOString(),
      accion,
      modulo,
      descripcion,
      datos,
    };
    let logs = [];
    if (fs.existsSync(LOGS_PATH)) {
      try {
        logs = JSON.parse(fs.readFileSync(LOGS_PATH, 'utf8'));
        if (!Array.isArray(logs)) logs = [];
      } catch {
        logs = [];
      }
    }
    logs.unshift(logItem);
    if (logs.length > 5000) logs = logs.slice(0, 5000);
    const tmp = `${LOGS_PATH}.vite.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(logs, null, 2), 'utf8');
    fs.renameSync(tmp, LOGS_PATH);
  } catch (err) {
    console.error('Error guardando en logs.json desde vite:', err);
  }
}

function readDbSafe() {
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
          : { status: 'closed', baseAmount: 0 },
    };
  } catch {
    return null;
  }
}

function writeDbSafe(data) {
  const tmpPath = `${DB_PATH}.vite.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

function cajaClosureGuardPlugin() {
  return {
    name: 'caja-closure-guard',
    configureServer(server) {
      // Asegurar que si un corte se cierra en el proceso antiguo, nunca conserve lastCorteId
      // para evitar que se reabra la caja al eliminar un corte.
      let guarding = false;
      const sanitizeDb = () => {
        if (guarding) return;
        const db = readDbSafe();
        if (!db) return;
        let changed = false;
        if (db.cajaSesion && 'lastCorteId' in db.cajaSesion) {
          delete db.cajaSesion.lastCorteId;
          changed = true;
        }
        if (changed) {
          guarding = true;
          try {
            writeDbSafe(db);
          } finally {
            setTimeout(() => {
              guarding = false;
            }, 80);
          }
        }
      };

      sanitizeDb();
      try {
        fs.watch(DB_PATH, () => {
          sanitizeDb();
        });
      } catch {
        // ignore watch error
      }

      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        const match = url.match(/^\/api\/cortes-diarios\/([^/?#]+)/);
        if (req.method === 'DELETE' && match) {
          const authHeader = req.headers['x-admin-password'];
          if (!authHeader) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Se requiere contraseña de administradora.' }));
            return;
          }
          const hash = crypto.createHash('sha256').update(String(authHeader)).digest('hex');
          if (hash !== ADMIN_PASSWORD_HASH) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Contraseña de administradora incorrecta.' }));
            return;
          }

          const id = decodeURIComponent(match[1]);
          const db = readDbSafe();
          if (!db) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'No se pudo leer la base de datos.' }));
            return;
          }

          const targetCorte = db.cortesDiarios.find((c) => c.id === id);
          const dateKey =
            targetCorte?.dateKey || db.cajaSesion?.dateKey || getLocalDateKey(new Date());

          db.cortesDiarios = db.cortesDiarios.filter((c) => c.id !== id);

          const jobIdsToDelete = new Set(targetCorte?.jobIds || []);
          const valesIdsToDelete = new Set(targetCorte?.valesIds || []);
          const gastosIdsToDelete = new Set(targetCorte?.gastosIds || []);

          db.jobs = db.jobs.filter((j) => j.corteDiarioId !== id && !jobIdsToDelete.has(j.id));
          db.vales = db.vales.filter((v) => v.corteDiarioId !== id && !valesIdsToDelete.has(v.id));
          db.gastos = db.gastos.filter((g) => g.corteDiarioId !== id && !gastosIdsToDelete.has(g.id));

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

          guarding = true;
          try {
            writeDbSafe(db);
            appendLogSafe({
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
          } finally {
            setTimeout(() => {
              guarding = false;
            }, 80);
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, cajaSesion: db.cajaSesion }));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cajaClosureGuardPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
