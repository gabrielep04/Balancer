const axios = require('axios'); // Cliente HTTP para hacer solicitudes al balanceador

/**
 * Función para generar una matriz aumentada de tamaño n x (n+1) con valores aleatorios.
 * @param {number} n - Tamaño de la matriz (n x n).
 * @returns {Array} - Matriz aumentada generada.
 */
function generateMatrix(n) {
  // Crea una matriz con números decimales y los mantiene como números
  const matrix = Array.from({ length: n }, () => 
    Array.from({ length: n + 1 }, () => (Math.random() * 10).toFixed(3) * 1)
  );
  return matrix;
}

/**
 * Función principal que genera una matriz, la muestra, la envía al balanceador y muestra la solución.
 * @param {number} n 
 */
async function requestSolution(n) {
  const matrix = generateMatrix(n); // Genera la matriz aumentada

  // Muestra la matriz en la consola
  console.log("Matriz generada:");
  matrix.forEach(row => {
    // Formatea cada número a 3 decimales y los separa con ' | '
    console.log(row.map(num => num.toFixed(3)).join(' | '));
  });

  try {
    // Envía la matriz al balanceador para su resolución
    const response = await axios.post('http://localhost:3000/solve', { matrix });
    console.log("Solución recibida del balanceador:");

    // Formatea y muestra la solución recibida, limitando los decimales a 3
    const solution = response.data.solution.map(value => value.toFixed(3));
    console.log(solution.join(' | '));
  } catch (error) {
    // Muestra un mensaje de error si la solicitud falla
    console.error("Error al solicitar la solución:", error.message);
  }
}

// Define el tamaño de la matriz
const n = 3; 

requestSolution(n);
