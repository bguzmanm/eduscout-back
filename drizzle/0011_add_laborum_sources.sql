-- Custom SQL migration file, put your code below! --

INSERT INTO "sources" ("name", "slug", "base_url", "scraper_type", "category", "logo_url")
VALUES (
  'Universidad Católica Silva Henríquez',
  'ucsh',
  'https://www.laborum.cl/perfiles/empresa_universidad-catolica-silva-henriquez_12000824.html',
  'laborum',
  'universidad_privada',
  'https://commons.wikimedia.org/wiki/Special:FilePath/Logo_ucsh.jpg?width=700'
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "sources" ("name", "slug", "base_url", "scraper_type", "category", "logo_url")
VALUES (
  'AIEP',
  'aiep',
  'https://www.laborum.cl/perfiles/empresa_instituto-profesional-aiep_13327053.html',
  'laborum',
  'instituto_profesional',
  'https://www.aiep.cl/assets/uploads/2022/04/logo.svg'
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "sources" ("name", "slug", "base_url", "scraper_type", "category", "logo_url")
VALUES (
  'IACC',
  'iacc',
  'https://www.laborum.cl/perfiles/empresa_instituto-profesional-iacc_12102077.html',
  'laborum',
  'instituto_profesional',
  'https://www.iacc.cl/wp-content/themes/iacc/assets/images/logo-iacc.webp'
)
ON CONFLICT ("slug") DO NOTHING;