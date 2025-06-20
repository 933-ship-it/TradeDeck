// File: api/serve-app.js
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const filePath = path.join(process.cwd(), 'private', 'production-app.js');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      res.status(500).send('// Failed to load script');
    } else {
      res.setHeader('Content-Type', 'application/javascript');
      res.status(200).send(data);
    }
  });
};
