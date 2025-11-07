const express = require('express');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 📦 Conexión a la base de datos
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',             
  password: '',             
  database: 'modulo_gestion'
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
