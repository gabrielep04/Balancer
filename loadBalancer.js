const express = require('express');
const axios = require('axios');
const os = require('os');

const app = express();
app.use(express.json());

// Definir servicios de microservicios disponibles, cada uno con una URL específica
const services = [
  { id: 1, url: 'http://localhost:4001/solve' },
  { id: 2, url: 'http://localhost:4002/solve' },
  { id: 3, url: 'http://localhost:4003/solve' }
];

// Variables de monitorización para el balanceador
let activeProcesses = 0;       // Procesos actualmente activos
let successfulProcesses = 0;    // Procesos exitosamente completados
let failedProcesses = 0;        // Procesos que fallaron
let requestHistory = [];        // Historial de solicitudes realizadas

// Función para obtener el estado del sistema de cada servicio
async function getServiceStatus(service) {
  try {
    // Realizar solicitud de estado al microservicio
    const response = await axios.get(`${service.url.replace('/solve', '')}/status`);
    return response.data; // Devolver los datos del estado
  } catch (error) {
    // Si falla, registrar el error y devolver `null`
    console.error(`Error al obtener estado del servicio ${service.id}:`, error.message);
    return null;
  }
}

// Ruta principal de resolución de sistemas de ecuaciones
app.post('/solve', async (req, res) => {
  activeProcesses++; // Incrementar contador de procesos activos
  console.log("Procesos activos:", activeProcesses);

  // Obtener estado de cada servicio disponible
  const serviceStatuses = await Promise.all(services.map(service => getServiceStatus(service)));

  // Filtrar servicios que estén disponibles y tengan carga de CPU definida
  const availableServices = services
    .map((service, index) => ({ ...service, ...serviceStatuses[index] }))
    .filter(service => service && service.cpuLoad !== undefined);

  if (availableServices.length === 0) {
    // Si no hay servicios disponibles, finalizar el proceso
    activeProcesses--;
    console.log("No hay servicios disponibles");
    return res.status(500).json({ error: 'No hay servicios disponibles' });
  }

  // Seleccionar el servicio con menor carga de CPU y mayor memoria disponible
  const selectedService = availableServices.sort((a, b) => {
    return (a.cpuLoad + a.memoryAvailable) - (b.cpuLoad + b.memoryAvailable);
  })[0];

  // Agregar solicitud al historial con detalles de servicio y marca de tiempo
  requestHistory.push({
    serviceId: selectedService.id,
    url: selectedService.url,
    timestamp: new Date().toISOString()
  });
  console.log("Historial de solicitudes:", requestHistory);

  try {
    // Realizar solicitud al microservicio seleccionado
    const response = await axios.post(selectedService.url, req.body);
    successfulProcesses++; // Incrementar contador de procesos exitosos
    console.log("Procesos exitosos:", successfulProcesses);
    res.json(response.data); // Enviar la respuesta del microservicio al cliente
  } catch (error) {
    failedProcesses++; // Incrementar contador de procesos fallidos
    console.log("Procesos fallidos:", failedProcesses);
    res.status(500).json({ error: 'Error en la resolución' });
  } finally {
    activeProcesses--; // Decrementar el contador de procesos activos
  }
});

// Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
  console.log("Balanceador escuchando en el puerto 3000");
});
