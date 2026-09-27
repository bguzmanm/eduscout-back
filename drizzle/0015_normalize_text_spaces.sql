-- Limpia los espacios "invisibles" que traen los HTML de las instituciones
-- (&nbsp; y familia Unicode de espacios) en los textos de las ofertas.
--
-- U+00A0 y los thin/narrow spaces no son puntos de corte de línea: una frase
-- entera quedaba como una palabra indestructible y el ancho mínimo de la página
-- se disparaba (un título midió 698px en un viewport de 375px, dejando scroll
-- horizontal en móvil). Además se colapsan los espacios horizontales repetidos
-- y se recortan los extremos.

-- Textos de una línea: todo el espacio se reduce a separadores simples.
UPDATE jobs
SET
  title = btrim(regexp_replace(title, '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\s]+', ' ', 'g')),
  company = CASE WHEN company IS NULL THEN NULL
    ELSE btrim(regexp_replace(company, '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\s]+', ' ', 'g')) END,
  department = CASE WHEN department IS NULL THEN NULL
    ELSE btrim(regexp_replace(department, '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\s]+', ' ', 'g')) END,
  location = CASE WHEN location IS NULL THEN NULL
    ELSE btrim(regexp_replace(location, '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\s]+', ' ', 'g')) END,
  job_type = CASE WHEN job_type IS NULL THEN NULL
    ELSE btrim(regexp_replace(job_type, '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\s]+', ' ', 'g')) END,
  salary_range = CASE WHEN salary_range IS NULL THEN NULL
    ELSE btrim(regexp_replace(salary_range, '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\s]+', ' ', 'g')) END
WHERE title ~ '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]'
   OR company ~ '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]'
   OR department ~ '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]'
   OR location ~ '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]'
   OR job_type ~ '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]'
   OR salary_range ~ '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]';

-- HTML: se preservan los saltos de línea (los adapters los usan para separar
-- párrafos) y solo se colapsa el espacio horizontal repetido.
WITH cleaned AS (
  SELECT
    id,
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(description, '&nbsp;', ' ', 'g'),
          '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]',
          ' ',
          'g'
        ),
        '[^\S\n]{2,}',
        ' ',
        'g'
      )
    ) AS description,
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(requirements, '&nbsp;', ' ', 'g'),
          '[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]',
          ' ',
          'g'
        ),
        '[^\S\n]{2,}',
        ' ',
        'g'
      )
    ) AS requirements
  FROM jobs
  WHERE description IS NOT NULL OR requirements IS NOT NULL
)
UPDATE jobs
SET description = cleaned.description, requirements = cleaned.requirements
FROM cleaned
WHERE jobs.id = cleaned.id
  AND (
    jobs.description IS DISTINCT FROM cleaned.description
    OR jobs.requirements IS DISTINCT FROM cleaned.requirements
  );
