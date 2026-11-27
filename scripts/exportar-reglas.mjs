// Genera el SQL para publicar en la nube las reglas de un año (tabla reglas_fiscales).
// Uso: node scripts/exportar-reglas.mjs 2026   → pega la salida en el SQL Editor de Supabase.
import { validar } from '../src/core/reglas.js';

const anio = Number(process.argv[2]);
if (!anio) { console.error('Indica el año: node scripts/exportar-reglas.mjs 2027'); process.exit(1); }
const { default: p } = await import(`../src/core/params/${anio}.js`);
const problemas = validar(p);
if (problemas.length) { console.error(`Las reglas ${anio} no pasan la validación: ${problemas.join(', ')}`); process.exit(1); }
const json = JSON.stringify(p).replace(/'/g, "''"); // Infinity se guarda como null
console.log(`-- Reglas fiscales ${anio}, revisión ${p.revision}. Revisadas por una persona antes de publicar.
insert into public.reglas_fiscales (anio, revision, datos, publicada, nota)
values (${anio}, ${p.revision}, '${json}'::jsonb, true, 'Publicada desde src/core/params/${anio}.js')
on conflict (anio) do update set revision = excluded.revision, datos = excluded.datos, publicada = excluded.publicada,
  nota = excluded.nota, actualizada = now()
where public.reglas_fiscales.revision < excluded.revision;`);
