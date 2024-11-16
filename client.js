const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Cargar la definición del servicio desde el archivo proto
const PROTO_PATH = path.join(__dirname, './service.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const solverProto = grpcObject.solver;

// Crear cliente gRPC para el balanceador
const client = new solverProto.SolverService('localhost:3000', grpc.credentials.createInsecure());

// Genera una matriz aleatoria de tamaño nx(n+1)
function generateMatrix(n) {
  return Array.from({ length: n }, () => ({
    row: Array.from({ length: n + 1 }, () => Math.random() * 10)  // Generar un array de números
  }));
}

// Función cliente para solicitar la resolución de la matriz generada
async function requestSolution(n) {
  const matrix = generateMatrix(n);
  
  console.log("Matriz generada:");
  matrix.forEach((row, index) => {
    console.log(`Fila ${index + 1}:`, row.row.map(num => num.toFixed(3)).join(' | '));
  });

  client.solve({ matrix: matrix }, (error, response) => {
    if (error) {
      console.error("Error al solicitar la solución:", error.message);
    } else {
      console.log("Solución recibida del balanceador:");
      const solution = response.solution.map(value => value.toFixed(3));
      console.log(solution.join(' | '));
    }
  });
}

// Definir el tamaño de la matriz para solicitar su resolución
const n = 3;
requestSolution(n);
