-- Normaliza jobs.region a las 16 regiones canónicas de Chile.
--
-- Los adapters scrapean la región como texto libre ("RM", "Región del Biobío",
-- "Providencia, Metropolitana, Chile", "Biobio"), por lo que el home terminaba
-- contando 18 "regiones". Aquí cada valor se lleva a su nombre canónico corto y
-- lo que no se puede identificar pasa a NULL (la comuna/free text sigue en
-- jobs.location, así que no se pierde información para el usuario).

UPDATE jobs
SET region = CASE
  WHEN r IN ('tarapaca', 'iquique', 'pica', 'pozo almonte', 'alto hospicio') THEN 'Tarapacá'
  WHEN r IN ('arica y parinacota', 'arica', 'parinacota', 'putre') THEN 'Arica y Parinacota'
  WHEN r IN ('antofagasta', 'calama', 'mejillones', 'tocopilla') THEN 'Antofagasta'
  WHEN r IN ('atacama', 'copiapo', 'vallenar', 'chanaral', 'huasco') THEN 'Atacama'
  WHEN r IN ('coquimbo', 'la serena', 'ovalle', 'illapel', 'combarbala') THEN 'Coquimbo'
  WHEN r IN ('valparaiso', 'vina del mar', 'quillota', 'quintero', 'san antonio', 'limache') THEN 'Valparaíso'
  WHEN r IN ('metropolitana', 'metropolitana de santiago', 'santiago', 'rm', 'providencia', 'las condes', 'vitacura', 'lo prado', 'puente alto', 'maipu', 'nunoa', 'huchuraba', 'huechuraba') THEN 'Metropolitana'
  WHEN r IN ('o''higgins', 'o higgins', 'libertador general bernardo o''higgins', 'libertador general bernardo o higgins', 'rancagua', 'san fernando', 'rengo', 'pichilemu') THEN 'O''Higgins'
  WHEN r IN ('maule', 'curico', 'linares', 'talca', 'tenca') THEN 'Maule'
  WHEN r IN ('nuble', 'chillan', 'san carlos', 'bulnes') THEN 'Ñuble'
  WHEN r IN ('biobio', 'bio bio', 'concepcion', 'talcahuano', 'los angeles', 'coronel') THEN 'Biobío'
  WHEN r IN ('araucania', 'la araucania', 'temuco', 'angol', 'villarrica', 'pocon') THEN 'Araucanía'
  WHEN r IN ('los rios', 'valdivia', 'la union') THEN 'Los Ríos'
  WHEN r IN ('los lagos', 'puerto montt', 'osorno', 'castro', 'ancud') THEN 'Los Lagos'
  WHEN r IN ('aysen', 'aysen del general carlos ibanez del campo', 'carlos ibanez del campo', 'coyhaique', 'puerto aysen') THEN 'Aysén'
  WHEN r IN ('magallanes', 'magallanes y de la antartica chilena', 'antartica', 'punta arenas', 'porvenir', 'rio verde') THEN 'Magallanes'
  ELSE NULL
END
FROM (
  SELECT
    id,
    trim(
      regexp_replace(
        regexp_replace(
          replace(
            replace(
              translate(
                lower(region),
                'áàäâãéèëêíìïîóòöôõúùüûñç',
                'aaaaaeeeeiiiiooooouuuunc'
              ),
              '’', ''''
            ),
            '‘', ''''
          ),
          '\s+', ' ', 'g'
        ),
        '^region (de |del |de la |de los )?',
        ''
      )
    ) AS r
  FROM jobs
  WHERE region IS NOT NULL
) folded
WHERE jobs.id = folded.id;

-- Invariante: si quedara alguna región fuera de la lista canónica, se descarta.
UPDATE jobs
SET region = NULL
WHERE region IS NOT NULL
  AND region <> ALL (ARRAY[
    'Tarapacá', 'Arica y Parinacota', 'Antofagasta', 'Atacama', 'Coquimbo',
    'Valparaíso', 'Metropolitana', 'O''Higgins', 'Maule', 'Ñuble', 'Biobío',
    'Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'
  ]);
