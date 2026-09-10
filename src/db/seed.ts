import { sources, jobs } from './schema';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

type DrizzleConnection = PostgresJsDatabase<typeof schema>;

export async function seedDatabase(db: DrizzleConnection) {
  console.log('🌱 Iniciando seeding de datos...');

  try {
    await db.transaction(async (tx) => {
      console.log('🗑️  Limpiando datos existentes...');
      await tx.execute(sql`
        TRUNCATE TABLE
          jobs,
          sources
        RESTART IDENTITY
        CASCADE
      `);

      console.log('📝 Creando fuentes...');
      await tx
        .insert(sources)
        .values([
          {
            name: 'Pontificia Universidad Católica de Chile',
            slug: 'uc',
            baseUrl: 'https://cargosacademicos.uc.cl',
            scraperType: 'wordpress',
          },
          {
            name: 'Universidad de Chile',
            slug: 'uchile',
            baseUrl: 'https://concurso-academico.uchile.cl',
            scraperType: 'uchile_api',
          },
          {
            name: 'Universidad Adolfo Ibañez',
            slug: 'uai',
            baseUrl:
              'https://www.uai.cl/ingenieria-y-ciencias/academicos/concursos-academicos',
            scraperType: 'html',
          },
          {
            name: 'Universidad Nacional Andrés Bello',
            slug: 'unab',
            baseUrl:
              'https://unab.trabajando.cl/empleo-categoria/1245-cargos-academicos',
            scraperType: 'trabajando_cl',
          },
          {
            name: 'Inacap',
            slug: 'inacap',
            baseUrl: 'https://inacap.trabajando.cl',
            scraperType: 'trabajando_cl',
          },
          {
            name: 'Duoc UC',
            slug: 'duoc',
            baseUrl: 'https://duoc.trabajando.cl',
            scraperType: 'trabajando_cl',
          },
          {
            name: 'IP Santo Tomás',
            slug: 'santo-tomas',
            baseUrl:
              'https://www.ipsantotomas.cl/trabaja-con-nosotros/academicos/',
            scraperType: 'wordpress',
          },
          {
            name: 'IP Chile',
            slug: 'ip-chile',
            baseUrl:
              'https://www.laborum.cl/perfiles/empresa_instituto-profesional-de-chile_12054583.html',
            scraperType: 'laborum',
          },
        ])
        .returning();
      console.log('✅ 8 fuentes creadas');
    });

    console.log('✨ Seeding completado exitosamente');
  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    throw error;
  }
}
