-- Custom SQL migration file, put your code below! --

INSERT INTO "sources" ("name", "slug", "base_url", "scraper_type", "category", "logo_url")
VALUES (
  'Universidad Mayor',
  'umayor',
  'https://umayor.trabajando.cl',
  'trabajando_cl',
  'universidad_privada',
  'https://staticcdn.trabajando.cl/portal-comunidad/66f4222629ff84227c039bd4/assets/logo.jpg'
)
ON CONFLICT ("slug") DO NOTHING;
