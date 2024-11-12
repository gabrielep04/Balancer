const axios = require('axios');

// Genera una matriz de nxn aleatoria
function generateMatrix(n) {
  // Generar la matriz con números decimales y no cadenas
  const matrix = Array.from({ length: n }, () => Array.from({ length: n + 1 }, () => (Math.random() * 10).toFixed(3) * 1));
  return matrix;
}

// Cliente que solicita la resolución de la matriz
async function requestSolution(n) {
  const matrix = generateMatrix(n);
  
  // Mostrar la matriz de una forma más legible
  console.log("Matriz generada:");
  matrix.forEach(row => {
    console.log(row.map(num => num.toFixed(3)).join(' | ')); // Formatear al imprimir
  });

  try {
    const response = await axios.post('http://localhost:3000/solve', { matrix });
    console.log("Solución recibida del balanceador:");
    
    // Mostrar la solución de forma legible
    const solution = response.data.solution.map(value => value.toFixed(3));
    console.log(solution.join(' | '));
  } catch (error) {
    console.error("Error al solicitar la solución:", error.message);
  }
}

// Definir el tamaño de la matriz
const n = 3; // Puedes cambiar el tamaño aquí
requestSolution(n);
