import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load .env if present
try { dotenv.config(); } catch(e) {}

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(url);
const [rows] = await conn.execute('SELECT id, name, phone, email, bank, bankName, loanSize, interest, timeline, bookingDate, bookingTime, reportStatus, createdAt FROM leads ORDER BY createdAt ASC LIMIT 10');
console.log(JSON.stringify(rows, null, 2));
await conn.end();
