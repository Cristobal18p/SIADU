const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { opcionesDePool } = require('./pool');

if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    return Number(this);
  };
}

// El pool no se conecta hasta la primera consulta: sin DATABASE_URL (pruebas unitarias) solo falla al usarse
const pool = new Pool(opcionesDePool(process.env.DATABASE_URL) ?? {});

// Una conexión inactiva que cierra la base se descarta; sin este manejador, el error terminaría el proceso
pool.on('error', (err) => console.warn('[pool] Conexión descartada:', err.message));

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
