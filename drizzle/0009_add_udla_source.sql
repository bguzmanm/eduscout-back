-- Custom SQL migration file, put your code below! --

INSERT INTO "sources" ("name", "slug", "base_url", "scraper_type", "category", "logo_url")
VALUES (
  'Universidad de Las Américas',
  'udla',
  'https://udla.trabajando.cl',
  'trabajando_cl',
  'universidad_privada',
  'https://staticcdn.trabajando.cl/portal-comunidad/66f4222629ff84227c039e45/assets/logo.png'
)
ON CONFLICT ("slug") DO NOTHING;