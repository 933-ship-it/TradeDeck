// File: api/serve-app.js
import { readFile } from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  const filePath = path.join(process.cwd(), 'private', 'production-app.js');

  try {
    const fileContents = await readFile(filePath, 'utf8');
    res.setHeader('Content-Type', 'application/javascript');
    res.status(200).send(fileContents);
  } catch (error) {
    console.error('File read error:', error);
    res.status(500).send('// Error loading script');
  }
}
