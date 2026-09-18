-- Custom SQL migration file, put your code below! --

INSERT INTO "sources" ("name", "slug", "base_url", "scraper_type", "category", "logo_url")
VALUES (
  'UNIACC',
  'uniacc',
  'https://uniacc.hiringroom.com/jobs',
  'hiringroom',
  'universidad_privada',
  'https://uniacc.hiringroom.com/data/accounts/uniacc/microsite/0efd03c1b971c6f3141bf2dc400ddc3f.png'
)
ON CONFLICT ("slug") DO NOTHING;