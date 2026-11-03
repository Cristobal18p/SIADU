// Entorno de las pruebas de integración: base creada con los scripts del repositorio, datos ficticios y servidor real
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const SCRIPTS = path.join(__dirname, '../../../database/scripts');
const ARCHIVOS = [
  'siadu_schema.sql',
  'trigger/siadu_triggers_usuarios.sql',
  'trigger/siadu_triggers_solicitudes.sql',
  'trigger/siadu_triggers_flujos.sql',
  'trigger/siadu_triggers_aprobaciones.sql',
  'trigger/siadu_triggers_plantillas.sql',
  'catalogos/01_roles.sql',
  'siadu_views.sql',
];

const UNIDAD = 24;
const CLAVE = 'Prueba#Integracion1';

// Firma ficticia en línea: no depende de Storage
const FIRMA = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><path d="M5 30 C 30 5, 60 35, 115 10" stroke="#1e3a8a" fill="none"/></svg>'
).toString('base64')}`;

const PERSONAS = {
  admin: { correo: 'admin.prueba@up.ac.pa', cedula: '9-100-0001', nombre: 'Admin', apellido: 'Prueba' },
  decano: { correo: 'decano.prueba@up.ac.pa', cedula: '9-100-0002', nombre: 'Decano', apellido: 'Prueba' },
  secretaria: { correo: 'secretaria.prueba@up.ac.pa', cedula: '9-100-0003', nombre: 'Secretaria', apellido: 'Prueba' },
  estudiante: { correo: 'estudiante.prueba@up.ac.pa', cedula: '9-100-0004', nombre: 'Estudiante', apellido: 'Prueba' },
  otroEstudiante: { correo: 'otro.prueba@up.ac.pa', cedula: '9-100-0005', nombre: 'Otro', apellido: 'Prueba' },
};

const literal = (valor) => `'${String(valor).replace(/'/g, "''")}'`;

/** Datos ficticios: una unidad, un administrador, dos aprobadores con firma y dos estudiantes. */
function datosFicticios(hash) {
  const p = PERSONAS;
  const usuario = (x) => `INSERT INTO usuarios (correo, cedula, password_hash, clave_inicial) VALUES (${literal(x.correo)}, ${literal(x.cedula)}, ${literal(hash)}, false);`;
  const personal = (x) => `INSERT INTO personal (nombre, apellido, correo, cedula, cod_unidad, id_usuario)
    SELECT ${literal(x.nombre)}, ${literal(x.apellido)}, ${literal(x.correo)}, ${literal(x.cedula)}, ${UNIDAD}, id_usuario FROM usuarios WHERE correo = ${literal(x.correo)};
    INSERT INTO administrativos (id_personal) SELECT id_personal FROM personal WHERE correo = ${literal(x.correo)};`;
  const rol = (x, nombreRol) => `INSERT INTO usuarios_roles (id_usuario, id_rol)
    SELECT u.id_usuario, r.id_rol FROM usuarios u, roles r WHERE u.correo = ${literal(x.correo)} AND r.descripcion = ${literal(nombreRol)};`;
  const asignacion = (x, cargo) => `INSERT INTO asignaciones_administrativos (id_admin, cod_unidad, id_cargo)
    SELECT a.id_admin, ${UNIDAD}, c.id_cargo FROM administrativos a JOIN personal pe ON pe.id_personal = a.id_personal, cargos c
    WHERE pe.correo = ${literal(x.correo)} AND c.nombre = ${literal(cargo)};
    INSERT INTO firmas (id_personal, url_firma, hash_firma) SELECT id_personal, ${literal(FIRMA)}, 'prueba' FROM personal WHERE correo = ${literal(x.correo)};`;
  const estudiante = (x) => `INSERT INTO estudiantes (nombre, apellido, cedula, correo, cod_unidad, id_carrera, id_usuario)
    SELECT ${literal(x.nombre)}, ${literal(x.apellido)}, ${literal(x.cedula)}, ${literal(x.correo)}, ${UNIDAD}, c.id_carrera, u.id_usuario
    FROM carreras c, usuarios u WHERE c.descripcion = 'Licenciatura de Prueba' AND u.correo = ${literal(x.correo)};`;

  return [
    `INSERT INTO unidades (nombre, abrev, cod_unidad, tipo_unidad) VALUES ('Unidad de Prueba', 'UDP', ${UNIDAD}, 'Facultad');`,
    "INSERT INTO cargos (nombre, jerarquia) VALUES ('Decano', 1), ('Secretaria Administrativa', 3);",
    `INSERT INTO carreras (cod_unidad, descripcion) VALUES (${UNIDAD}, 'Licenciatura de Prueba');`,
    ...Object.values(p).map(usuario),
    personal(p.admin), rol(p.admin, 'Administrador'),
    personal(p.decano), rol(p.decano, 'Aprobador'), asignacion(p.decano, 'Decano'),
    personal(p.secretaria), rol(p.secretaria, 'Aprobador'), asignacion(p.secretaria, 'Secretaria Administrativa'),
    estudiante(p.estudiante), estudiante(p.otroEstudiante),
  ].join('\n');
}

/**
 * Recrea la base de DATABASE_URL_TEST y devuelve la URL de `siadu_app`, o null si la variable no está definida.
 * El nombre de la base debe terminar en `_test`: su esquema `public` se borra.
 */
async function prepararBase() {
  const urlAdmin = process.env.DATABASE_URL_TEST;
  if (!urlAdmin) return null;
  const url = new URL(urlAdmin);
  if (!url.pathname.slice(1).endsWith('_test')) {
    throw new Error('DATABASE_URL_TEST debe apuntar a una base cuyo nombre termine en _test: su esquema se borra.');
  }

  const claveApp = crypto.randomBytes(18).toString('base64url');
  const cliente = new Client({ connectionString: urlAdmin });
  await cliente.connect();
  try {
    await cliente.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    for (const archivo of ARCHIVOS) await cliente.query(fs.readFileSync(path.join(SCRIPTS, archivo), 'utf8'));
    const permisos = fs.readFileSync(path.join(SCRIPTS, 'userd_db.example.sql'), 'utf8').replace('<CONTRASEÑA>', claveApp);
    await cliente.query(permisos);
    // Si el rol ya existía, se le asigna la clave de esta ejecución
    await cliente.query(`ALTER ROLE siadu_app WITH LOGIN PASSWORD ${literal(claveApp)}`);
    await cliente.query(datosFicticios(bcrypt.hashSync(CLAVE, 10)));
  } finally {
    await cliente.end();
  }

  url.username = 'siadu_app';
  url.password = claveApp;
  return url.toString();
}

/** Arranca la aplicación contra la base preparada y devuelve un cliente HTTP mínimo. */
async function iniciarServidor(urlApp) {
  Object.assign(process.env, {
    DATABASE_URL: urlApp,
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    ACCOUNT_CACHE_SECONDS: '0',
    DB_WARM_CONNECTIONS: '0',
  });
  const app = require('../../app');
  const servidor = await new Promise((resolver) => {
    const s = app.listen(0, '127.0.0.1', () => resolver(s));
  });
  const base = `http://127.0.0.1:${servidor.address().port}/api`;

  const pedir = async (metodo, ruta, { token, cuerpo } = {}) => {
    const r = await fetch(base + ruta, {
      method: metodo,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(cuerpo ? { 'content-type': 'application/json' } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const tipo = r.headers.get('content-type') || '';
    const datos = tipo.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer());
    return { status: r.status, datos };
  };

  const entrar = async (persona, estamento) => {
    const r = await pedir('POST', '/auth/login', { cuerpo: { identificador: persona.correo, password: CLAVE, estamento } });
    if (r.status !== 200) throw new Error(`No se pudo iniciar sesión como ${persona.correo}: ${JSON.stringify(r.datos)}`);
    return r.datos.token;
  };

  const cerrar = async () => {
    await new Promise((resolver) => servidor.close(resolver));
    await require('../../utils/hashWorker').cerrar().catch(() => {});
    await require('../../config/prisma').$disconnect().catch(() => {});
  };

  return { pedir, entrar, cerrar };
}

module.exports = { prepararBase, iniciarServidor, PERSONAS, UNIDAD };
