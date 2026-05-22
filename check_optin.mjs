import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Total leads submitted
const totalLeads = await db.execute(sql`SELECT COUNT(*) as count FROM leads`);
const total = totalLeads[0][0].count;

// Leads with phone + email (completed contact step = opted in)
const withContact = await db.execute(sql`SELECT COUNT(*) as count FROM leads WHERE phone IS NOT NULL AND phone != '' AND email IS NOT NULL AND email != ''`);
const contacted = withContact[0][0].count;

// Leads who booked a call
const booked = await db.execute(sql`SELECT COUNT(*) as count FROM leads WHERE bookingDate IS NOT NULL AND bookingDate != ''`);
const bookedCount = booked[0][0].count;

// Recent leads
const recent = await db.execute(sql`SELECT name, email, phone, bank, interestRate, loanSize, timeline, bookingDate, bookingTime, createdAt FROM leads ORDER BY createdAt DESC LIMIT 10`);

console.log("\n=== FINCHECKER OPT-IN STATS ===");
console.log(`Total leads in DB:        ${total}`);
console.log(`Leads with contact info:  ${contacted}`);
console.log(`Leads who booked a call:  ${bookedCount}`);
if (total > 0) {
  console.log(`\nBooking conversion rate:  ${((bookedCount / contacted) * 100).toFixed(1)}% (booked / contact submitted)`);
}

console.log("\n=== RECENT LEADS ===");
for (const lead of recent[0]) {
  console.log(`- ${lead.name || 'Unknown'} | ${lead.email} | ${lead.phone} | Bank: ${lead.bank} | Rate: ${lead.interestRate} | Loan: ${lead.loanSize} | Timeline: ${lead.timeline} | Booked: ${lead.bookingDate ? lead.bookingDate + ' ' + lead.bookingTime : 'Not booked'} | Submitted: ${lead.createdAt}`);
}

await connection.end();
