import { sources } from './schema';
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
            category: 'universidad_privada',
            logoUrl: 'https://www.uc.cl/site/assets/files/5626/iden01.400x300.png',
          },
          {
            name: 'Universidad de Chile',
            slug: 'uchile',
            baseUrl: 'https://concurso-academico.uchile.cl',
            scraperType: 'uchile_api',
            category: 'universidad_publica',
            logoUrl: 'https://uchile.cl/dam/imagenes/Uchile/imagenes-contenidos-generales/LogoUdeChile/02-escudo-uchile-jpg/escudo-uchile-vertical-color.jpg'
          },
          {
            name: 'Universidad Adolfo Ibañez',
            slug: 'uai',
            baseUrl:
              'https://www.uai.cl/ingenieria-y-ciencias/academicos/concursos-academicos',
            scraperType: 'html',
            category: 'universidad_privada',
            logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSE0D1ktlTK9QJ2qSwDKoZruCVxDCSj7B0wP0nAmBklCdap-DuCM616APWO&s=10'
          },
          {
            name: 'Universidad Nacional Andrés Bello',
            slug: 'unab',
            baseUrl:
              'https://unab.trabajando.cl/empleo-categoria/1245-cargos-academicos',
            scraperType: 'trabajando_cl',
            category: 'universidad_privada',
            logoUrl:
              'https://staticcdn.trabajando.cl/portal-comunidad/66f4222629ff84227c039ec7/assets/logo.png',
          },
          {
            name: 'Inacap',
            slug: 'inacap',
            baseUrl: 'https://inacap.trabajando.cl',
            scraperType: 'trabajando_cl',
            category: 'instituto_profesional',
            logoUrl:
              'https://staticcdn.trabajando.cl/portal-comunidad/66f4222629ff84227c039e2a/assets/logo.jpg',
          },
          {
            name: 'Duoc UC',
            slug: 'duoc',
            baseUrl: 'https://www.getonbrd.com/',
            scraperType: 'getonboard',
            category: 'instituto_profesional',
            logoUrl:
              'https://staticcdn.trabajando.cl/portal-comunidad/66f4222629ff84227c039f4a/assets/logo.png',
          },
          {
            name: 'IP Santo Tomás',
            slug: 'santo-tomas',
            baseUrl:
              'https://www.ipsantotomas.cl/trabaja-con-nosotros/academicos/',
            scraperType: 'santo_tomas',
            category: 'instituto_profesional',
            logoUrl:
              'https://staticcdn.trabajando.cl/portal-comunidad/66f4222a29ff84227c03a161/assets/logo.png',
          },
{
            name: 'IP Chile',
            slug: 'ip-chile',
            baseUrl:
              'https://www.laborum.cl/perfiles/empresa_instituto-profesional-de-chile_12054583.html',
            scraperType: 'laborum',
            category: 'instituto_profesional',
            logoUrl: 'https://mir-s3-cdn-cf.behance.net/projects/404/f75a6d143195739.Y3JvcCwyMTM4LDE2NzMsNDA3LDA.png',
          },
          {
            name: 'Instituto Profesional Iplacex',
            slug: 'iplacex',
            baseUrl: 'https://convocatoriasdocentes.iplacex.cl/',
            scraperType: 'iplacex_api',
            category: 'instituto_profesional',
              logoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/Logo_Iplacex.svg/960px-Logo_Iplacex.svg.png?utm_source=es.wikipedia.org&utm_campaign=index&utm_content=thumbnail',
          },
          {
            name: 'Universidad de Concepción',
            slug: 'udec',
            baseUrl: 'https://udec.trabajando.cl/trabajo-empleo/',
            scraperType: 'trabajando_cl',
            category: 'universidad_publica',
            logoUrl:
              'https://staticcdn.trabajando.cl/portal-comunidad/66f4222629ff84227c039d28/assets/logo.png',
          },
          {
            name: 'Universidad Técnica Federico Santa María',
            slug: 'usm',
            baseUrl: 'https://vra.usm.cl/ofertas-laborales/',
            scraperType: 'usm_vra',
            category: 'universidad_privada',
            logoUrl:
              'https://vra.usm.cl/wp-content/uploads/2022/07/cropped-cropped-favicon_usm-270x270-1-270x270.png',
          },
          {
            name: 'Universidad de Valparaíso',
            slug: 'uv',
            baseUrl: 'https://cyl.uv.cl/cargos',
            scraperType: 'uv_cargos',
            category: 'universidad_publica',
            logoUrl: 'https://cyl.uv.cl/images/base/favicon.png',
          },
        ])
        .returning();
      console.log('✅ 12 fuentes creadas');
    });

    console.log('✨ Seeding completado exitosamente');
  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    throw error;
  }
}