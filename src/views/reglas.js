// Reglas fiscales: lo vigente para tu régimen, de dónde sale cada dato y qué cambió respecto al año anterior.
import { getFoto } from '../data/store.js';
import { REGIMENES } from '../data/catalogo.js';
import { reglas, aniosConReglas, datosPara, cambios, valor, fuente } from '../core/reglas.js';
import { FUENTES } from '../core/params/fuentes.js';
import { umaAnual } from '../core/fiscal.js';
import { regimenesEnRango } from '../core/regimen.js';
import { estadoReglas } from '../data/reglas-remotas.js';
import { chipFuente, avisoProvisional, leyenda } from '../ui/fuente.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, pct } from '../ui/dom.js';
import '../styles/views/reglas.css';

let anioSel = null, todos = false;

const lim = (x) => (x === Infinity || x == null ? 'En adelante' : money(x));

function tablaTarifa(t) {
  return `<details class="rg-tabla"><summary>Ver tarifa (${t.length} tramos)</summary><div class="table-wrap"><table>
    <thead><tr><th class="n">Límite inferior</th><th class="n">Límite superior</th><th class="n">Cuota fija</th><th class="n">% sobre excedente</th></tr></thead>
    <tbody>${t.map(([a, b, c, d]) => `<tr><td class="n num">${money(a)}</td><td class="n num">${lim(b)}</td><td class="n num">${money(c)}</td><td class="n num">${pct(d, 2)}</td></tr>`).join('')}</tbody>
  </table></div></details>`;
}

/** Valor legible de un dato. */
function mostrar(clave, p) {
  const v = valor(p, clave);
  switch (FUENTES[clave].formato) {
    case 'dinero': return `<span class="num">${money(clave === 'uma' ? v.diaria : v)}</span>${clave === 'uma' ? `<small>Anual: ${money(umaAnual(p))}</small>` : ''}`;
    case 'porcentaje': return `<span class="num">${pct(v, v * 100 % 1 ? 2 : 0)}</span>`;
    case 'fraccion': return Math.abs(v - 2 / 3) < 1e-6 ? '2/3 del IVA' : `<span class="num">${pct(v, 2)}</span>`;
    case 'dia': return `Día ${v} del mes siguiente`;
    case 'tasas': return `<div class="table-wrap"><table><thead><tr><th class="n">Cobros del mes hasta</th><th class="n">Tasa</th></tr></thead>
      <tbody>${v.map((f) => `<tr><td class="n num">${money(f.hasta)}</td><td class="n num">${pct(f.tasa, 2)}</td></tr>`).join('')}</tbody></table></div>`;
    case 'tarifa': return tablaTarifa(v);
    case 'subsidio': return v ? `${pct(v.porcentajeUmaMensual, 2)} de la UMA mensual (<span class="num">${money(p.uma.diaria * v.diasMes * v.porcentajeUmaMensual)}</span> al mes) si tu sueldo no pasa de <span class="num">${money(v.limiteIngresoMensual)}</span> al mes` : 'Sin subsidio este año';
    case 'topeDeducciones': return `El menor entre ${v.umasAnuales} UMA anuales (<span class="num">${money(umaAnual(p) * v.umasAnuales)}</span>) y ${pct(v.porcentajeIngresos)} de tus ingresos`;
    case 'topeAfore': return `El menor entre ${pct(v.porcentajeIngresos)} de tus ingresos y ${v.umasAnuales} UMA anuales (<span class="num">${money(umaAnual(p) * v.umasAnuales)}</span>)`;
    case 'topeDonativos': return `${pct(v.porcentajeIngresos)} de tus ingresos del año anterior`;
    case 'colegiaturas': return `<div class="table-wrap"><table><thead><tr><th>Nivel</th><th class="n">Tope anual por alumno</th></tr></thead><tbody>
      ${[['preescolar', 'Preescolar'], ['primaria', 'Primaria'], ['secundaria', 'Secundaria'], ['profesionalTecnico', 'Profesional técnico'], ['bachillerato', 'Bachillerato']]
        .map(([k, n]) => `<tr><td>${n}</td><td class="n num">${money(v[k])}</td></tr>`).join('')}</tbody></table></div>`;
    default: return esc(String(v));
  }
}

export function render(main) {
  const foto = getFoto();
  const hoy = +foto.hoy.slice(0, 4);
  const anios = [...new Set([...aniosConReglas(), hoy, hoy + 1])].filter((y) => y <= hoy + 1).sort((a, b) => b - a);
  if (!anios.includes(anioSel)) anioSel = hoy;
  const r = reglas(anioSel);
  const regsUsuario = regimenesEnRango(foto.perfil, `${anioSel}-01-01`, `${anioSel}-12-31`);
  const regs = todos || !regsUsuario.length ? null : regsUsuario;
  const claves = datosPara(regs);
  const cambiaron = new Set(cambios(anioSel));
  const est = estadoReglas();

  main.innerHTML = `<section class="view reglas">
    <div class="page-head"><div><h1>Reglas fiscales</h1>
      <p class="sub">Las tasas, tarifas y topes con los que Cuenfis calcula, y de dónde sale cada uno. ${regs ? `Se muestran las que aplican a ${esc(regs.map((x) => REGIMENES[x]?.corto ?? x).join(', '))}.` : 'Se muestran las de todos los regímenes.'}</p></div></div>
    <div class="card toolbar">
      <label class="field inline"><span>Año</span><select id="rgAnio">${anios.map((y) => `<option ${y === anioSel ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
      <span class="spacer"></span>
      ${regsUsuario.length ? `<label class="check"><input type="checkbox" id="rgTodos" ${todos ? 'checked' : ''} /> <span>Comparar con otros regímenes</span></label>` : ''}
    </div>
    ${avisoProvisional(anioSel, false)}
    ${todos ? `<div class="notice">${icon('info')}<span>Estás viendo reglas de regímenes que no tienes, solo para comparar. Tus cálculos usan únicamente las de tu régimen.</span></div>` : ''}
    <div class="rg-lista">${claves.map((k) => {
      const f = fuente(k, anioSel);
      const ajeno = regs === null && regsUsuario.length && !FUENTES[k].regs.some((x) => regsUsuario.includes(x));
      return `<article class="card rg-item${ajeno ? ' ajeno' : ''}">
        <div class="rg-top"><h2>${esc(f.titulo)}</h2>${cambiaron.has(k) ? `<span class="chip info">Cambió en ${r.base}</span>` : ''}${ajeno ? '<span class="chip">Otro régimen</span>' : ''}</div>
        <div class="rg-valor">${mostrar(k, r.p)}</div>
        <p class="rg-src">${esc(f.documento)}, ${esc(f.articulo)}${f.publicacion ? ` · ${esc(f.publicacion)}` : ''}</p>
        ${chipFuente(k, anioSel)}
      </article>`;
    }).join('')}</div>
    <p class="small muted rg-origen">${icon('info')} ${est.origen === 'nube' ? 'Reglas actualizadas desde la nube de Cuenfis.' : est.origen === 'copia' ? 'Reglas de la última actualización guardada en este dispositivo.' : 'Reglas incluidas en esta versión de la app.'} Cada cambio fiscal lo revisa una persona antes de publicarse.</p>
    <p class="disclaimer">Estimaciones con ${esc(leyenda(anioSel))}. No sustituyen la asesoría de un contador.</p>
  </section>`;

  $('#rgAnio', main).addEventListener('change', (e) => { anioSel = +e.target.value; render(main); });
  $('#rgTodos', main)?.addEventListener('change', (e) => { todos = e.target.checked; render(main); });
}
