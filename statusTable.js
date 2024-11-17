const net = require('net');

// Conectar al servidor del load balancer para recibir los estados
const client = net.createConnection({ port: 5000 }, () => {
  console.log('Conectado al servidor de tabla');
});

client.on('data', data => {
  console.clear();
  const services = JSON.parse(data.toString());
  const tableData = services.map(service => ({
    ID: service.id,
    'Memoria Disponible (MB)': service.memoryAvailable.toFixed(3),
    'Carga CPU (%)': service.cpuLoad.toFixed(3)
  }));
  console.table(tableData);
});

client.on('end', () => {
  console.log('Conexión cerrada');
});
