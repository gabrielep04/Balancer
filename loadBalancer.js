// loadBalancer.js
const express = require('express');
const axios = require('axios');
const os = require('os');

const app = express();
app.use(express.json());

const services = [
  { id: 1, url: 'http://localhost:4001/solve' },
  { id: 2, url: 'http://localhost:4002/solve' },
  { id: 3, url: 'http://localhost:4003/solve' }
];

// Monitorización de procesos
let activeProcesses = 0;
let successfulProcesses = 0;
let failedProcesses = 0;
let requestHistory = [];  // Almacena el historial de solicitudes

// Obtener el estado del sistema de cada servicio
async function getServiceStatus(service) {
  try {
    const response = await axios.get(`${service.url.replace('/solve', '')}/status`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener estado del servicio ${service.id}:`, error.message);
    return null;
  }
}

app.post('/solve', async (req, res) => {
  activeProcesses++;
  console.log("Procesos activos:", activeProcesses);

  // Obtener el estado de cada servicio
  const serviceStatuses = await Promise.all(services.map(service => getServiceStatus(service)));

  // Filtrar servicios disponibles
  const availableServices = services
    .map((service, index) => ({ ...service, ...serviceStatuses[index] }))
    .filter(service => service && service.cpuLoad !== undefined);

  if (availableServices.length === 0) {
    activeProcesses--;
    console.log("No hay servicios disponibles");
    return res.status(500).json({ error: 'No hay servicios disponibles' });
  }

  // Seleccionar el servicio con menor carga y mayor memoria disponible
  const selectedService = availableServices.sort((a, b) => {
    return (a.cpuLoad + a.memoryAvailable) - (b.cpuLoad + b.memoryAvailable);
  })[0];

  // Registrar en el historial
  requestHistory.push({
    serviceId: selectedService.id,
    url: selectedService.url,
    timestamp: new Date().toISOString()
  });
  console.log("Historial de solicitudes:", requestHistory);

  try {
    const response = await axios.post(selectedService.url, req.body);
    successfulProcesses++;
    console.log("Procesos exitosos:", successfulProcesses);
    res.json(response.data);
  } catch (error) {
    failedProcesses++;
    console.log("Procesos fallidos:", failedProcesses);
    res.status(500).json({ error: 'Error en la resolución' });
  } finally {
    activeProcesses--;
  }
});

app.listen(3000, () => {
  console.log("Balanceador escuchando en el puerto 3000");
});
