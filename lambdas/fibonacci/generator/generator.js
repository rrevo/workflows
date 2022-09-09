function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function fibonacci(n) {
  return n < 1 ? 0 : n <= 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2);
}

exports.handler = (event, context, callback) => {
  let num = getRandomIntInclusive(2, 8);
  let fibs = [];
  for (var i = 0; i < num; i++) {
    fibs.push(fibonacci(i));
  }
  callback(null, fibs);
};
