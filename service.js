const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const os = require('os');
const path = require('path');

// Cargar la definición del servicio desde el archivo proto
const PROTO_PATH = path.join(__dirname, './service.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const solverProto = grpcObject.solver;

// Variables de monitorización
let activeProcesses = 0;
let successfulProcesses = 0;
let failedProcesses = 0;

// Función para resolver el sistema de ecuaciones usando el método de Gauss-Jordan
function solveGaussJordan(matrix) {
  const n = matrix.length;

  for (let i = 0; i < n; i++) {
    // Paso 1: Búsqueda del pivote más grande en la columna
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k;
      }
    }

    if (matrix[maxRow][i] === 0) {
      console.error(`Error: Pivote en columna ${i} es cero. Matriz singular.`);
      throw new Error('El pivote es cero, la matriz no tiene solución única.');
    }

    console.log(`Intercambiando filas ${i} y ${maxRow} si es necesario`);
    [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];

    // Paso 2: Normalización del pivote
    const pivot = matrix[i][i];
    console.log(`Normalizando fila ${i} con pivote ${pivot}`);
    for (let k = i; k < n + 1; k++) {
      matrix[i][k] /= pivot;
    }

    // Paso 3: Eliminación de otros elementos en la columna i
    console.log(`Eliminando otros elementos en la columna ${i}`);
    for (let j = 0; j < n; j++) {
      if (j !== i) {
        const c = matrix[j][i];
        for (let k = i; k < n + 1; k++) {
          matrix[j][k] -= c * matrix[i][k];
        }
      }
    }
  }

  const solution = matrix.map(row => row[n]);
  console.log("Solución obtenida:", solution);
  return solution;
}

// Definir el servicio gRPC
const server = new grpc.Server();

// Obtener el puerto desde la variable de entorno, o usar 4001 como predeterminado
const port = process.env.PORT || 4001;

server.addService(solverProto.SolverService.service, {
  solve: (call, callback) => {
    activeProcesses++;
    try {
      const { matrix } = call.request;
      console.log("Matriz recibida en el servicio:", JSON.stringify(matrix));

      // Validar y procesar la matriz
      if (!Array.isArray(matrix) || matrix.length === 0) {
        throw new Error('Matriz vacía o mal formada.');
      }

      const flatMatrix = matrix.map(row => row.row);
      if (!flatMatrix.every(r => r.length === flatMatrix.length + 1)) {
        throw new Error('Matriz no es cuadrada o tiene dimensiones incorrectas.');
      }

      const solution = solveGaussJordan(flatMatrix);
      console.log("Solucion:", solution);
      successfulProcesses++;
      callback(null, { solution });
    } catch (error) {
      console.error("Error durante la resolución:", error.message);
      failedProcesses++;
      callback({
        code: grpc.status.INTERNAL,
        details: error.message,
      });
    } finally {
      activeProcesses--;
    }
  },

  getStatus: (call, callback) => {
    const cpuLoad = os.loadavg()[0];
    const memoryAvailable = os.freemem() / (1024 ** 2);
    callback(null, { cpuLoad, memoryAvailable });
  },
});

server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error, actualPort) => {
  if (error) {
    console.error("Error al iniciar el servicio:", error);
    return;
  }
  console.log(`Servicio gRPC corriendo en el puerto ${actualPort}`);
  server;
});
