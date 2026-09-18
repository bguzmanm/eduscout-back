-- Custom SQL migration file, put your code below! --

UPDATE "sources"
SET "scraper_type" = 'getonboard',
    "base_url" = 'https://www.getonbrd.com/'
WHERE "slug" = 'duoc';

UPDATE "jobs"
SET "is_active" = false
WHERE "source_id" = (SELECT "id" FROM "sources" WHERE "slug" = 'duoc');