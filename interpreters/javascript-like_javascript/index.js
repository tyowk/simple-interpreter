const { Interpreter } = require('./src');

/**
 * The code to run
 * @type {string}
 *
 * This should return true
 */
console.log(
    Interpreter(`
        let x = 10;
        let y = 5;
        function add(a, b) = a + b;
        add(x, y) == 15 && true;
    `)
);
