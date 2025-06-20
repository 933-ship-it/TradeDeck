// File: api/serve-app.js

export default async function handler(req, res) {
  const fs = await import('fs/promises');
  const path = await import('path');

  const filePath = path.join(process.cwd(), 'private', 'production-app.js');

  try {
    const fileContents = await fs.readFile(filePath, 'utf8');
    res.setHeader('Content-Type', 'application/javascript');
    res.status(200).send(fileContents);
  } catch (error) {
    res.status(500).send('// Error loading script');
  }
}
