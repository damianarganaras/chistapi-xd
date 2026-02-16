const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// ============================================================
// CARGA DE DATOS EN MEMORIA (OPTIMIZACIÓN)
// Se ejecuta UNA SOLA VEZ cuando la función se inicializa,
// no en cada request. Esto es crítico para performance.
// ============================================================

let jokes = [];
let loadError = null;

function loadJokes() {
  try {
    const csvPath = path.join(process.cwd(), 'jokes.csv');
    
    // Verificar si el archivo existe
    if (!fs.existsSync(csvPath)) {
      throw new Error('El archivo jokes.csv no existe');
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Dividir por líneas y filtrar líneas vacías
    const lines = fileContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Verificar que hay contenido además del header
    if (lines.length < 2) {
      throw new Error('El archivo jokes.csv está vacío o solo tiene headers');
    }

    // Saltamos la primera línea (header: id|setup|punchline)
    const dataLines = lines.slice(1);

    jokes = dataLines.map(line => {
      const [id, setup, punchline] = line.split('|');
      return {
        id: parseInt(id, 10),
        setup: setup || '',
        punchline: punchline || ''
      };
    }).filter(joke => joke.setup && joke.punchline); // Filtrar chistes mal formados

    if (jokes.length === 0) {
      throw new Error('No se encontraron chistes válidos en el archivo');
    }

    console.log(`✅ Cargados ${jokes.length} chistes en memoria`);
  } catch (error) {
    loadError = error;
    console.error('❌ Error cargando chistes:', error.message);
  }
}

// Cargar chistes al iniciar (fuera del handler)
loadJokes();

// ============================================================
// ENDPOINT GET /api/joke
// ============================================================

app.get('/api/joke', (req, res) => {
  // Si hubo error en la carga inicial, responder con error
  if (loadError) {
    return res.status(500).json({
      success: false,
      error: loadError.message
    });
  }

  // Verificar que hay chistes disponibles
  if (jokes.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No hay chistes disponibles'
    });
  }

  // Seleccionar un chiste aleatorio
  const randomIndex = Math.floor(Math.random() * jokes.length);
  const randomJoke = jokes[randomIndex];

  return res.status(200).json({
    success: true,
    joke: {
      id: randomJoke.id,
      setup: randomJoke.setup,
      punchline: randomJoke.punchline
    }
  });
});

// ============================================================
// ENDPOINT RAÍZ (Opcional - Info de la API)
// ============================================================

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'ChistAPI XD',
    version: '1.0.0',
    endpoints: {
      joke: 'GET /api/joke - Obtiene un chiste aleatorio'
    },
    totalJokes: jokes.length
  });
});

// ============================================================
// SERVIDOR LOCAL (Solo para desarrollo)
// En Vercel esto no se ejecuta, Vercel usa el export
// ============================================================

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📍 Endpoint: http://localhost:${PORT}/api/joke`);
  });
}

// Export para Vercel
module.exports = app;
