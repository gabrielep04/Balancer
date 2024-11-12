// service.js
const express = require('express');
const os = require('os');
const app = express();
app.use(express.json());

// Monitorización de procesos en el microservicio
let activeProcesses = 0;
let successfulProcesses = 0;
let failedProcesses = 0;

// Función para resolver el sistema de ecuaciones con Gauss-Jordan
function solveGaussJordan(matrix) {
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k;
      }
    }
    [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];

    for (let k = i + 1; k < n + 1; k++) {
      matrix[i][k] /= matrix[i][i];
    }
    matrix[i][i] = 1;

    for (let j = 0; j < n; j++) {
      if (j !== i) {
        const c = matrix[j][i];
        for (let k = i; k < n + 1; k++) {
          matrix[j][k] -= c * matrix[i][k];
        }
      }
    }
  }
  return matrix.map(row => row[n]);
}

app.post('/solve', (req, res) => {
  activeProcesses++;
  try {
    const { matrix } = req.body;
    const solution = solveGaussJordan(matrix);
    successfulProcesses++;
    res.json({ solution });
  } catch (error) {
    failedProcesses++;
    res.status(500).json({ error: 'Error en la resolución' });
  } finally {
    activeProcesses--;
  }
});

// Endpoint de estado para monitorización del balanceador
app.get('/status', (req, res) => {
  const cpuLoad = os.loadavg()[0];
  const memoryAvailable = os.freemem() / (1024 ** 2); // Memoria libre en MB
  res.json({
    cpuLoad,
    memoryAvailable,
    processesActive: activeProcesses,
    processesSuccessful: successfulProcesses,
    processesFailed: failedProcesses
  });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Microservicio escuchando en el puerto ${PORT}`);
});
