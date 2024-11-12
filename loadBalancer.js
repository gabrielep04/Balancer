const express = require('express'); // Framework para crear el servidor
const axios = require('axios'); // Cliente HTTP para hacer solicitudes a los microservicios
const os = require('os'); // Módulo para obtener información del sistema operativo

const app = express(); 
app.use(express.json());

// Lista de microservicios disponibles con sus URLs
const services = [
  { id: 1, url: 'http://localhost:4001/solve' },
  { id: 2, url: 'http://localhost:4002/solve' },
  { id: 3, url: 'http://localhost:4003/solve' }
];

// Variables para monitorizar el estado de los procesos
let activeProcesses = 0;       // Número de procesos actualmente activos
let successfulProcesses = 0;   // Número de procesos que se han completado con éxito
let failedProcesses = 0;       // Número de procesos que han fallado
let requestHistory = [];        // Historial de solicitudes enviadas a los microservicios

/**
 * Función para obtener el estado actual de un microservicio.
 * Hace una solicitud GET al endpoint /status del microservicio.
 * @param {Object} service - Objeto que representa el microservicio.
 * @returns {Object|null} - Devuelve los datos de estado o null en caso de error.
 */
async function getServiceStatus(service) {
  try {
    // Reemplaza '/solve' por '/status' para obtener el estado
    const response = await axios.get(`${service.url.replace('/solve', '')}/status`);
    return response.data; // Devuelve los datos de estado recibidos
  } catch (error) {
    // Muestra un mensaje de error si no se puede obtener el estado
    console.error(`Error al obtener estado del servicio ${service.id}:`, error.message);
    return null;
  }
}

/**
 * Endpoint para resolver una matriz enviada por el cliente.
 * Recibe una matriz, selecciona el microservicio adecuado y envía la solicitud.
 */
app.post('/solve', async (req, res) => {
  activeProcesses++; // Incrementa el contador de procesos activos
  console.log("Procesos activos:", activeProcesses); // Muestra el número de procesos activos

  // Obtiene el estado de cada microservicio
  const serviceStatuses = await Promise.all(services.map(service => getServiceStatus(service)));

  // Combina la información de cada servicio con su estado y filtra los servicios disponibles
  const availableServices = services
    .map((service, index) => ({ ...service, ...serviceStatuses[index] }))
    .filter(service => service && service.cpuLoad !== undefined); // Filtra servicios que respondieron correctamente

  // Si no hay servicios disponibles, responde con un error
  if (availableServices.length === 0) {
    activeProcesses--; // Decrementa el contador de procesos activos
    console.log("No hay servicios disponibles"); // Informa que no hay servicios disponibles
    return res.status(500).json({ error: 'No hay servicios disponibles' });
  }

  // Ordena los servicios disponibles por menor carga de CPU y mayor memoria disponible
  const selectedService = availableServices.sort((a, b) => {
    return (a.cpuLoad + a.memoryAvailable) - (b.cpuLoad + b.memoryAvailable);
  })[0]; // Selecciona el primer servicio de la lista ordenada

  // Registra la solicitud en el historial
  requestHistory.push({
    serviceId: selectedService.id,                // ID del servicio seleccionado
    url: selectedService.url,                     // URL del servicio seleccionado
    timestamp: new Date().toISOString()           // Marca de tiempo de la solicitud
  });
  console.log("Historial de solicitudes:", requestHistory);

  try {
    // Envía la solicitud de resolución al microservicio seleccionado
    const response = await axios.post(selectedService.url, req.body);
    successfulProcesses++; // Incrementa el contador de procesos exitosos
    console.log("Procesos exitosos:", successfulProcesses); // Muestra el número de procesos exitosos
    res.json(response.data); // Devuelve la respuesta recibida al cliente
  } catch (error) {
    failedProcesses++; // Incrementa el contador de procesos fallidos
    console.log("Procesos fallidos:", failedProcesses); // Muestra el número de procesos fallidos
    res.status(500).json({ error: 'Error en la resolución' }); // Responde con error al cliente
  } finally {
    activeProcesses--; // Decrementa el contador de procesos activos
  }
});

// Inicia el servidor del balanceador en el puerto 3000
app.listen(3000, () => {
  console.log("Balanceador escuchando en el puerto 3000");
});
