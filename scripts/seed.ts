import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';
import { seedDatabase } from '../src/db/seed';

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL no está definida en .env');
    process.exit(1);
  }

  try {
    console.log('🔌 Conectando a la base de datos...');
    const queryClient = postgres(connectionString);
    const db = drizzle(queryClient, { schema });

    console.log('✅ Conexión establecida');

    await seedDatabase(db);

    console.log('✨ Script completado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
