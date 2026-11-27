// Genera docs/auditoria-fase1.md con la tabla esperado vs obtenido.
import { writeFileSync } from 'node:fs';
import { correr } from '../tests/escenarios.js';

const fmt = (v) => typeof v === 'number' ? (Math.abs(v) < 1 && v !== 0 ? v.toFixed(3) : v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : v === true ? 'Sí' : v === false ? 'No' : String(v);
const res = correr();
let ok = 0, total = 0;
let md = '# Auditoría Fase 1: esperado vs obtenido\n\n';
md += '_Cálculos estimados con reglas 2026. No sustituyen la asesoría de un contador._\n\n';
for (const e of res) {
  md += `## ${e.id}. ${e.nombre}\n\n${e.detalle}\n\n| Prueba | Esperado | Obtenido | Resultado |\n|---|---:|---:|:---:|\n`;
  for (const f of e.filas) { total++; if (f.ok) ok++; md += `| ${f.que} | ${fmt(f.esperado)} | ${fmt(f.obtenido)} | ${f.ok ? '✅' : '❌'} |\n`; }
  md += '\n';
}
md = md.replace('\n\n_Cálculos', `\n\n**${ok} de ${total} pruebas correctas.**\n\n_Cálculos`);
writeFileSync(new URL('../docs/auditoria-fase1.md', import.meta.url), md);
console.log(`${ok}/${total}`);
for (const e of res) for (const f of e.filas) if (!f.ok) console.log('FALLA', e.id, f.que, 'esperado', f.esperado, 'obtenido', f.obtenido);
process.exit(ok === total ? 0 : 1);
