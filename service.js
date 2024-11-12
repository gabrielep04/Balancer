const express = require('express'); 
const os = require('os');           

const app = express();
app.use(express.json());    // Middleware para parsear el cuerpo de las solicitudes en formato JSON

// Variables para monitorizar el estado de los procesos en el microservicio
let activeProcesses = 0;
let successfulProcesses = 0;
let failedProcesses = 0;

/**
 * Función para resolver el sistema de ecuaciones utilizando el método de Gauss-Jordan.
 * @param {Array} matrix - Matriz aumentada del sistema de ecuaciones.
 * @returns {Array} - Solución del sistema con valores limitados a 3 decimales.
 */
function solveGaussJordan(matrix) {
  const n = matrix.length; // Número de ecuaciones

  // Recorre cada fila para llevar la matriz a la forma reducida
  for (let i = 0; i < n; i++) {
    let maxRow = i;

    // Encuentra la fila con el mayor valor absoluto en la columna actual
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k;
      }
    }

    // Intercambia la fila actual con la fila que tiene el mayor valor
    [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];

    // Normaliza la fila actual para que el elemento diagonal sea 1
    for (let k = i + 1; k < n + 1; k++) {
      matrix[i][k] /= matrix[i][i];
    }
    matrix[i][i] = 1;

    // Elimina los demás elementos en la columna actual
    for (let j = 0; j < n; j++) {
      if (j !== i) {
        const c = matrix[j][i];
        for (let k = i; k < n + 1; k++) {
          matrix[j][k] -= c * matrix[i][k];
        }
      }
    }
  }

  // Extrae la solución de la matriz y limita los decimales a 3
  return matrix.map(row => (row[n]).toFixed(3));
}

/**
 * Endpoint para resolver una matriz enviada por el balanceador.
 * Recibe una matriz aumentada, la resuelve y devuelve la solución.
 */
app.post('/solve', (req, res) => {
  activeProcesses++; // Incrementa el contador de procesos activos
  try {
    const { matrix } = req.body; // Extrae la matriz del cuerpo de la solicitud
    const solution = solveGaussJordan(matrix); // Resuelve la matriz utilizando Gauss-Jordan
    successfulProcesses++; // Incrementa el contador de procesos exitosos
    res.json({ solution }); // Devuelve la solución al balanceador
  } catch (error) {
    failedProcesses++; // Incrementa el contador de procesos fallidos
    res.status(500).json({ error: 'Error en la resolución' }); // Responde con error al balanceador
  } finally {
    activeProcesses--; // Decrementa el contador de procesos activos
  }
});

/**
 * Endpoint para reportar el estado actual del microservicio.
 * Devuelve información sobre la carga de CPU, memoria disponible y estado de procesos.
 */
app.get('/status', (req, res) => {
  const cpuLoad = os.loadavg()[0]; // Obtiene la carga de CPU en el último minuto
  const memoryAvailable = os.freemem() / (1024 ** 2); // Obtiene la memoria libre en MB

  // Devuelve un objeto JSON con el estado actual
  res.json({
    cpuLoad,                                     // Carga de CPU
    memoryAvailable,                             // Memoria disponible
    processesActive: activeProcesses,           // Procesos activos
    processesSuccessful: successfulProcesses,   // Procesos exitosos
    processesFailed: failedProcesses            // Procesos fallidos
  });
});

// Define el puerto en el que escuchará el microservicio
const PORT = process.env.PORT || 4001;

// Inicia el servidor del microservicio
app.listen(PORT, () => {
  console.log(`Microservicio escuchando en el puerto ${PORT}`);
});
