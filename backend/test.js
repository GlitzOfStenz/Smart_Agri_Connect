const db = require('./db');

// Test query
db.query('SELECT 1 + 1 AS result', (err, results) => {
    if (err) throw err;
    console.log('Test Query Result:', results[0].result);
});