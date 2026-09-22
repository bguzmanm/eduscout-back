-- Actualiza los logos de las fuentes de Laborum (UCSH, AIEP, IACC) usando
-- los logos oficiales alojados en jobscdn.com (misma CDN de Laborum).

UPDATE sources
SET logo_url = 'https://imgbum.jobscdn.com/portal/img/empresas/1007/static/logoMainPic_12000824_bum_v2af749a4.jpg'
WHERE slug = 'ucsh';

UPDATE sources
SET logo_url = 'https://imgbum.jobscdn.com/portal/img/empresas/1007/static/logoMainPic_13327053_bum_ve121baca.jpg'
WHERE slug = 'aiep';

UPDATE sources
SET logo_url = 'https://imgbum.jobscdn.com/portal/img/empresas/1007/static/logoMainPic_12102077_bum_vc83099c6.jpg'
WHERE slug = 'iacc';