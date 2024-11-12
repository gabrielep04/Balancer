const express = require('express');
const os = require('os');
const app = express();
app.use(express.json());

// Variables de monitorización para el microservicio
let activeProcesses = 0;       // Procesos actualmente activos
let successfulProcesses = 0;    // Procesos exitosamente completados
let failedProcesses = 0;        // Procesos que fallaron

// Función para resolver el sistema de ecuaciones usando el método de Gauss-Jordan
function solveGaussJordan(matrix) {
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    // Encontrar el pivote para la fila actual
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k;
      }
    }
    // Intercambiar filas para que el pivote sea el máximo valor
    [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];

    // Dividir la fila por el valor del pivote para normalizarlo a 1
    for (let k = i + 1; k < n + 1; k++) {
      matrix[i][k] /= matrix[i][i];
    }
    matrix[i][i] = 1;

    // Hacer ceros en otras filas en la columna del pivote
    for (let j = 0; j < n; j++) {
      if (j !== i) {
        const c = matrix[j][i];
        for (let k = i; k < n + 1; k++) {
          matrix[j][k] -= c * matrix[i][k];
        }
      }
    }
  }
  // Devolver solo las soluciones de la matriz extendida
  return matrix.map(row => row[n]);
}

// Ruta para resolver sistemas de ecuaciones
app.post('/solve', (req, res) => {
  activeProcesses++; // Incrementar el contador de procesos activos
  try {
    const { matrix } = req.body;
    const solution = solveGaussJordan(matrix); // Resolver la matriz
    successfulProcesses++; // Incrementar el contador de procesos exitosos
    res.json({ solution }); // Enviar solución al cliente
  } catch (error) {
    failedProcesses++; // Incrementar el contador de procesos fallidos
    res.status(500).json({ error: 'Error en la resolución' });
  } finally {
    activeProcesses--; // Decrementar el contador de procesos activos
  }
});

// Endpoint para consultar el estado del microservicio
app.get('/status', (req, res) => {
  const cpuLoad = os.loadavg()[0];  // Carga de CPU promedio en 1 minuto
  const memoryAvailable = os.freemem() / (1024 ** 2); // Memoria libre en MB
  res.json({
    cpuLoad,
    memoryAvailable,
    processesActive: activeProcesses,
    processesSuccessful: successfulProcesses,
    processesFailed: failedProcesses
  });
});

// Iniciar el microservicio en el puerto especificado
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Microservicio escuchando en el puerto ${PORT}`);
});
