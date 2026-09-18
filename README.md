# EduScout — Backend

API REST para el agregador de ofertas académicas de EduScout.

## Stack

- **Runtime:** Bun
- **Framework:** NestJS 11
- **Base de datos:** PostgreSQL 17
- **ORM:** Drizzle ORM
- **Scraping:** Axios, Cheerio, Playwright
- **Documentación:** Swagger

## Requisitos previos

- [Bun](https://bun.sh/) >= 1.0
- [Docker](https://docs.docker.com/get-docker/) (para PostgreSQL)

## Setup

```bash
# 1. Instalar dependencias
bun install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar PostgreSQL
bun run docker:up

# 4. Generar migraciones y aplicar
bun run db:generate
bun run db:migrate

# 5. Sembrar fuentes iniciales (9 universidades)
bun run db:seed

# 6. Iniciar servidor en modo desarrollo
bun run start:dev
```

El servidor arranca en `http://localhost:3001`. Swagger disponible en `/api`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `bun run build` | Compilar el proyecto |
| `bun run start:dev` | Iniciar con hot-reload |
| `bun run start:prod` | Iniciar en producción |
| `bun run lint` | Lint + autofix |
| `bun run test` | Ejecutar tests |
| `bun run docker:up` | Levantar PostgreSQL |
| `bun run docker:down` | Detener PostgreSQL |
| `bun run db:generate` | Generar migraciones Drizzle |
| `bun run db:migrate` | Aplicar migraciones |
| `bun run db:studio` | Abrir Drizzle Studio (UI) |
| `bun run db:seed` | Sembrar datos iniciales |

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3001` | Puerto del servidor |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/eduscout?client_encoding=utf8` | URL de conexión a PostgreSQL |
| `DATABASE_NAME` | `eduscout` | Nombre de la base de datos |
| `DATABASE_USER` | `postgres` | Usuario de PostgreSQL |
| `DATABASE_PASSWORD` | `postgres` | Contraseña de PostgreSQL |
| `DATABASE_HOST` | `localhost` | Host de PostgreSQL |
| `DATABASE_PORT` | `5432` | Puerto de PostgreSQL |

## Estructura del proyecto

```
src/
├── main.ts                          # Bootstrap de la aplicación
├── app.module.ts                    # Registro de módulos
├── db/
│   ├── schema.ts                    # Schema de Drizzle (sources, jobs)
│   └── seed.ts                      # Función de seeding
├── modules/
│   ├── database/
│   │   └── database.module.ts       # Proveedor global de Drizzle
│   ├── sources/
│   │   ├── sources.module.ts
│   │   ├── controllers/             # CRUD /api/sources
│   │   ├── services/
│   │   ├── repositories/
│   │   └── dtos/
│   ├── jobs/
│   │   ├── jobs.module.ts
│   │   ├── controllers/             # Lectura /api/jobs
│   │   ├── services/
│   │   ├── repositories/
│   │   └── dtos/
│   └── scraping/
│       ├── scraping.module.ts
│       ├── scraping.controller.ts   # POST /api/scraping/run
│       ├── scraping.service.ts      # Orquestación de scrapers
│       ├── scraping.scheduler.ts    # Cron diario 6:00 AM
│       └── adapters/                # 5 adaptadores de scraping
│           ├── base.interface.ts
│           ├── uchile.adapter.ts
│           ├── uc.adapter.ts
│           ├── trabajando-cl.adapter.ts
│           ├── uai.adapter.ts
│           └── laborum.adapter.ts
├── common/
│   ├── decorators/
│   ├── dto/
│   ├── filters/
│   ├── interceptors/
│   ├── pipes/
│   ├── types/
│   └── utils/
scripts/
└── seed.ts                          # Entry point para seeding
```

## Endpoints de la API

### Sources (CRUD)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/sources` | Listar todas las fuentes |
| `GET` | `/api/sources/:id` | Obtener fuente por ID |
| `POST` | `/api/sources` | Crear fuente |
| `PATCH` | `/api/sources/:id` | Actualizar fuente |
| `DELETE` | `/api/sources/:id` | Eliminar fuente |

### Jobs (Lectura)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/jobs` | Buscar ofertas (paginado, con filtros) |
| `GET` | `/api/jobs/stats` | Estadísticas (total, por fuente, por región) |
| `GET` | `/api/jobs/:id` | Obtener oferta por ID |

**Parámetros de búsqueda:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `q` | string | Búsqueda por título |
| `source` | string | Filtrar por slug de fuente |
| `region` | string | Filtrar por región |
| `jobType` | string | Filtrar por tipo de jornada |
| `fromDate` | string | Fecha mínima de publicación |
| `page` | number | Página (default: 1) |
| `limit` | number | Resultados por página (default: 20) |

### Scraping

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/scraping/run` | Ejecutar scraping (todas las fuentes activas) |
| `POST` | `/api/scraping/run?source={slug}` | Ejecutar scraping para una fuente específica |

## Scraping

EduScout scraping 5 tipos de sitios web mediante adaptadores especializados:

| Adaptador | Tipo | Técnica | Fuentes |
|-----------|------|---------|---------|
| `UchileAdapter` | `uchile_api` | Axios + API REST | U. de Chile |
| `UcAdapter` | `wordpress` | Axios + Cheerio (HTML) | UC, IP Santo Tomás |
| `TrabajandoClAdapter` | `trabajando_cl` | Axios + parsing `__NUXT_DATA__` | UNAB, INACAP, Duoc, UDLA |
| `UaiAdapter` | `html` | Axios + Cheerio (HTML) | UAI |
| `LaborumAdapter` | `laborum` | Playwright (headless Chromium) | IP Chile |

El scraping se ejecuta automáticamente todos los días a las **6:00 AM** vía `@nestjs/schedule`. También se puede trigger manualmente con el endpoint `POST /api/scraping/run`.

## Base de datos

**Tabla `sources`** — Fuentes de scraping:
- `id`, `name`, `slug` (único), `baseUrl`, `scraperType`, `isActive`, `lastScraped`, `createdAt`

**Tabla `jobs`** — Ofertas laborales:
- `id`, `sourceId` (FK → sources), `externalId`, `title`, `company`, `department`, `location`, `region`, `jobType`, `description`, `requirements`, `salaryRange`, `publishedAt`, `deadline`, `applyUrl`, `isActive`, `scrapedAt`, `createdAt`, `updatedAt`
- Restricción única: `(sourceId, externalId)`
