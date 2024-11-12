const axios = require('axios');

// Genera una matriz aleatoria de tamaño nx(n+1)
function generateMatrix(n) {
  // Crear matriz con valores decimales
  const matrix = Array.from({ length: n }, () => Array.from({ length: n + 1 }, () => (Math.random() * 10).toFixed(3) * 1));
  return matrix;
}

// Función cliente para solicitar la resolución de la matriz generada
async function requestSolution(n) {
  const matrix = generateMatrix(n);
  
  // Mostrar la matriz generada
  console.log("Matriz generada:");
  matrix.forEach(row => {
    console.log(row.map(num => num.toFixed(3)).join(' | ')); // Formatear para impresión
  });

  try {
    // Enviar la solicitud al balanceador en localhost:3000
    const response = await axios.post('http://localhost:3000/solve', { matrix });
    console.log("Solución recibida del balanceador:");
    
    // Formatear y mostrar la solución recibida
    const solution = response.data.solution.map(value => value.toFixed(3));
    console.log(solution.join(' | '));
  } catch (error) {
    console.error("Error al solicitar la solución:", error.message);
  }
}

// Definir el tamaño de la matriz para solicitar su resolución
const n = 5;
requestSolution(n);
