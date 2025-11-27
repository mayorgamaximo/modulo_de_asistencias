const express = require('express');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
// Request logging to help debug incoming requests (method + path)
app.use((req, _res, next) => {
  console.log(`[MOD-LOG] ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// 📦 Conexión a la base de datos
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',             
  password: '',             
  database: 'contenedor'
});

// Probar conexión
db.connect(err => {
  if (err) {
    console.error('Error al conectar con la BD:', err);
  } else {
    console.log('✅ Conectado a la base de datos modulo_gestion');
  }
});

// 🧠 Ruta para obtener todos los estudiantes
app.get('/api/estudiantes', (req, res) => {
  db.query('SELECT * FROM usuarios', (err, results) => {
    
    if (err) return res.status(500).json({ error: 'Error al obtener estudiantes' });

    res.json(results);
  });
});

// 🧾 Ruta para obtener la lista de alumnos de un curso (tabla `lista`)
app.get('/api/lista', (req, res) => {
  const id_curso = req.query.id_curso;

  if (!id_curso) {
    return res.status(400).json({ error: 'Falta id_curso' });
  }

  // Suponemos que existe la tabla `lista` con columnas `id_curso` y `id_alumno`
  // y que la tabla `usuarios` contiene los datos del alumno (id, nombre, apellido)
  const sql = `
    SELECT u.id AS id_alumno, u.nombres, u.apellidos
    FROM listas l
    JOIN usuarios u ON l.id_alumno = u.id
    WHERE l.id_curso = ? AND u.rol = 'alumno'
    ORDER BY u.apellidos, u.nombres
  `;

  db.query(sql, [id_curso], (err, results) => {
    if (err) {
      console.error('Error al obtener lista:', err);
      return res.status(500).json({ error: 'Error al obtener la lista de alumnos' });
    }

    res.json(results);
  });
});

// 🌐 Ruta para obtener los cursos (anio y division)
app.get('/api/cursos', (req, res) => {
  const sql = 'SELECT * FROM cursos ORDER BY anio, division';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener cursos:', err);
      return res.status(500).json({ error: 'Error al obtener cursos' });
    }
    res.json(results);
  });
});

// Guardar múltiples asistencias para una fecha
// Opciones / preflight
app.options('/api/asistencias', (req, res) => {
  res.set('Allow', 'POST, OPTIONS');
  return res.status(200).json({ ok: true });
});

// Manejar GET con respuesta JSON para evitar responses HTML (y permitir debug)
app.get('/api/asistencias', (req, res) => {
  return res.status(405).json({ error: 'Method Not Allowed: use POST to submit asistencias' });
});

app.post('/api/asistencias', (req, res) => {
  const { fecha, entries, turno } = req.body; // entries: [{ id_alumno, estado }]
  console.log('[MOD-LOG] POST /api/asistencias', { fecha, turno, entriesLength: Array.isArray(entries) ? entries.length : 0 });

  if (!fecha || !Array.isArray(entries) || !turno) {
    return res.status(400).json({ error: 'Payload inválido. Se requiere fecha, turno y entries.' });
  }

  if (entries.length === 0) {
    return res.status(400).json({ error: 'No hay entradas para guardar.' });
  }

  const ids = entries.map(e => e.id_alumno).filter(Boolean);
  if (ids.length === 0) {
    return res.status(400).json({ error: 'No se encontraron id_alumno válidos.' });
  }

  // Primero eliminar asistencias existentes para esos alumnos en la misma fecha y turno
  const deleteSql = `DELETE FROM asistencias WHERE id_alumno IN (${ids.map(() => '?').join(',')}) AND fecha_de_asistencias = ? AND turno = ?`;
  const deleteParams = [...ids, fecha, turno];

  db.query(deleteSql, deleteParams, (delErr) => {
    if (delErr) {
      console.error('Error al borrar asistencias previas:', delErr);
      return res.status(500).json({ error: 'Error al procesar asistencias' });
    }

    // Preparar bulk insert (incluye turno)
    const values = entries.map(e => [e.id_alumno, fecha, e.estado, turno]);
    const insertSql = 'INSERT INTO asistencias (id_alumno, fecha_de_asistencias, estado, turno) VALUES ?';

    db.query(insertSql, [values], (insErr, result) => {
      if (insErr) {
        console.error('Error al insertar asistencias:', insErr);
        return res.status(500).json({ error: 'Error al insertar asistencias' });
      }

      res.json({ message: 'Asistencias guardadas', inserted: result.affectedRows });
    });
  });
});

  // Obtener historial agrupado por curso y fecha
  app.get('/api/historial', (req, res) => {
    // filtros opcionales: anio, division, id_curso, fecha (YYYY-MM-DD o DD/MM/YYYY), turno
    const { anio, division, id_curso, fecha, turno } = req.query;

    let where = [];
    let params = [];

    if (id_curso) {
      where.push('c.id = ?');
      params.push(id_curso);
    } else {
      if (anio) {
        where.push('c.anio = ?');
        params.push(anio);
      }
      if (division) {
        where.push('c.division = ?');
        params.push(division);
      }
    }

    if (fecha) {
      // aceptar fecha en formato DD/MM/YYYY o YYYY-MM-DD
      let fechaSQL = fecha;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
        const [d, m, y] = fecha.split('/');
        fechaSQL = `${y}-${m}-${d}`;
      }
      where.push('a.fecha_de_asistencias = ?');
      params.push(fechaSQL);
    }

    if (turno) {
      where.push('a.turno = ?');
      params.push(turno);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
      SELECT c.id AS id_curso, c.anio, c.division,
             a.fecha_de_asistencias AS fecha, a.turno AS turno,
             u.id AS id_alumno, u.nombres, u.apellidos, a.estado
      FROM asistencias a
      JOIN usuarios u ON a.id_alumno = u.id
      JOIN listas l ON l.id_alumno = u.id
      JOIN cursos c ON l.id_curso = c.id
      ${whereClause}
      ORDER BY a.fecha_de_asistencias DESC, c.anio, c.division, a.turno, u.apellidos
    `;

    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('Error al obtener historial:', err);
        return res.status(500).json({ error: 'Error al obtener historial' });
      }

      // Agrupar por curso+fecha+turno
      const grouped = {};
      results.forEach(row => {
        const key = `${row.id_curso}__${row.fecha}__${row.turno}`;
        if (!grouped[key]) {
          grouped[key] = {
            id_curso: row.id_curso,
            anio: row.anio,
            division: row.division,
            fecha: row.fecha,
            turno: row.turno,
            alumnos: []
          };
        }
        grouped[key].alumnos.push({ id_alumno: row.id_alumno, nombres: row.nombres, apellidos: row.apellidos, estado: row.estado });
      });

      const sessions = Object.values(grouped);
      res.json(sessions);
    });
  });

// ➕ Ruta para agregar un nuevo estudiante
app.post('/api/estudiantes', (req, res) => {
  const { nombre, apellido, curso } = req.body;
  const sql = 'INSERT INTO estudiantes (nombre, apellido, curso) VALUES (?, ?, ?)';
  db.query(sql, [nombre, apellido, curso], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al agregar estudiante' });
    res.json({ message: 'Estudiante agregado correctamente', id: result.insertId });
  });
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
