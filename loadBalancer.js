const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const net = require('net');

// Cargar la definición del servicio desde el archivo proto
const PROTO_PATH = path.join(__dirname, './service.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const solverProto = grpcObject.solver;

// Servicios disponibles
const services = [
  { id: 1, host: 'localhost:4001' },
  { id: 2, host: 'localhost:4002' },
  { id: 3, host: 'localhost:4003' }
];

// Variables de monitorización
let activeProcesses = 0;
let successfulProcesses = 0;
let failedProcesses = 0;
let requestHistory = [];

// Crear cliente gRPC para cada servicio
const clientServices = services.map(service => {
  return {
    id: service.id,
    client: new solverProto.SolverService(service.host, grpc.credentials.createInsecure())
  };
});

// Función para obtener el estado del servicio
function getServiceStatus(client) {
  return new Promise((resolve, reject) => {
    client.client.getStatus({}, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

// Servidor para enviar datos de estados a la tabla
const tableServer = net.createServer(socket => {
  console.log('Conexión establecida con la terminal de tabla');
  setInterval(async () => {
    const serviceStatuses = await Promise.all(clientServices.map(service => getServiceStatus(service).catch(() => null)));
    const availableServices = clientServices
      .map((service, index) => serviceStatuses[index] ? ({ ...service, ...serviceStatuses[index] }) : null)
      .filter(service => service);

    if (availableServices.length > 0) {
      const sortedServices = availableServices.sort((a, b) => {
        if (b.memoryAvailable === a.memoryAvailable) {
          return a.cpuLoad - b.cpuLoad;
        }
        return b.memoryAvailable - a.memoryAvailable;
      });
      socket.write(JSON.stringify(sortedServices) + '\n');
    }
  }, 2000); // Enviar datos cada 2 segundos
});
tableServer.listen(5000, () => console.log('Servidor de tabla escuchando en el puerto 5000'));

// Ruta principal de resolución de sistemas de ecuaciones
const server = new grpc.Server();

server.addService(solverProto.SolverService.service, {
  solve: async (call, callback) => {
    activeProcesses++;
    console.log("Procesos activos:", activeProcesses);

    // Obtener estado de cada servicio disponible
    const serviceStatuses = await Promise.all(clientServices.map(service => getServiceStatus(service)));

    const availableServices = clientServices
      .map((service, index) => ({ ...service, ...serviceStatuses[index] }))
      .filter(service => service && service.cpuLoad !== undefined);

    if (availableServices.length === 0) {
      activeProcesses--;
      console.log("No hay servicios disponibles");
      return callback({
        code: grpc.status.INTERNAL,
        details: "No hay servicios disponibles"
      });
    }

    const sortedServices = availableServices.sort((a, b) => {
      if (b.memoryAvailable === a.memoryAvailable) {
        return a.cpuLoad - b.cpuLoad;
      }
      return b.memoryAvailable - a.memoryAvailable;
    });

    const selectedService = sortedServices[0];
    requestHistory.push({
      serviceId: selectedService.id,
      timestamp: new Date().toISOString(),
      activeProcesses,
      successfulProcesses,
      failedProcesses
    });
    console.log("Historial de solicitudes:", requestHistory);

    selectedService.client.solve(call.request, (error, response) => {
      if (error) {
        failedProcesses++;
        console.log("Procesos fallidos:", failedProcesses);
        return callback({
          code: grpc.status.INTERNAL,
          details: 'Error en la resolución'
        });
      }
      successfulProcesses++;
      console.log("Procesos exitosos:", successfulProcesses);
      callback(null, response);
    });
  }
});

server.bindAsync('localhost:3000', grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    console.error("Error al iniciar el servidor:", error);
    return;
  }
  console.log(`Balanceador de carga gRPC escuchando en el puerto ${port}`);
  server;
});
