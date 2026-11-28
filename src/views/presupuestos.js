import { getFoto, getEstado, aplicar } from '../data/store.js';
import { CATEGORIAS } from '../data/catalogo.js';
import { estadoPresupuestos } from '../core/presupuestos.js';
import { periodo, rangoMes, ym } from '../core/motor.js';
import { categoriasDisponibles } from '../core/regimen.js';
import { icon } from '../ui/icons.js';
import { esc, money, pct, nombreMes, toast } from '../ui/dom.js';
import '../styles/views/presupuestos.css';

let mesSel = null;

const mesesAtras = (k, n) => {
  const out = [k];
  for (let i = 1; i < n; i++) { const [y, m] = out.at(-1).split('-').map(Number); out.push(new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7)); }
  return out;
};

export function render(main) {
  const foto = getFoto();
  const pres = getEstado().presupuestos ?? {};
  const hoyK = ym(foto.hoy);
  const opciones = mesesAtras(hoyK, 6);
  if (!opciones.includes(mesSel)) mesSel = hoyK;
  const est = estadoPresupuestos(foto, pres, mesSel);
  const [a, b] = rangoMes(mesSel);
  const gastoMes = periodo(foto, a, b).porCategoria;
  // Promedio de gasto real de los 3 meses anteriores, para sugerir
  const prev = mesesAtras(hoyK, 4).slice(1).map((k) => { const [x, y] = rangoMes(k); return periodo(foto, x, y).porCategoria; });
  const conGasto = prev.filter((p) => Object.values(p).some((v) => v > 0)).length || 1;
  const prom = (c) => prev.reduce((s, p) => s + (p[c] ?? 0), 0) / conGasto;
  const cats = categoriasDisponibles(foto.perfil, foto.hoy, 'salida', CATEGORIAS);
  const porCat = Object.fromEntries(est.filas.map((f) => [f.categoria, f]));
  const sinPres = Object.entries(gastoMes).filter(([c, v]) => v > 0 && !pres[c]).reduce((s, [, v]) => s + v, 0);

  main.innerHTML = `<section class="view pres">
    <div class="page-head"><div><h1>Presupuestos</h1><p class="sub">Un límite mensual por categoría. Te avisamos al llegar al 80% y al 100%.</p></div><span class="spacer"></span>
      <label class="field inline"><span>Mes</span><select id="presMes">${opciones.map((k) => `<option value="${k}" ${k === mesSel ? 'selected' : ''}>${esc(nombreMes(k))}</option>`).join('')}</select></label></div>

    <div class="card pres-sum">
      <div><span>Presupuesto del mes</span><b class="num">${money(est.total)}</b></div>
      <div><span>Gastado en esas categorías</span><b class="num">${money(est.gastado)}</b></div>
      <div><span>Te queda</span><b class="num ${est.total - est.gastado < 0 ? 'neg' : 'pos'}">${money(est.total - est.gastado)}</b></div>
      <div><span>Gasto sin presupuesto</span><b class="num">${money(sinPres)}</b></div>
    </div>
    ${est.alertas.map((f) => `<div class="notice warn">${icon('alert')}<span><b>${esc(CATEGORIAS.find((c) => c.id === f.categoria)?.nombre)}: ${f.nivel === 'excedido' ? `te pasaste por ${money(-f.restante)}` : `llevas el ${pct(f.uso)}`}.</b>${f.nivel === 'excedido' ? 'Revisa si puedes compensarlo en otra categoría.' : `Te quedan ${money(f.restante)} este mes.`}</span></div>`).join('')}

    <div class="card">
      <div class="card-head"><h2>Límites por categoría</h2><span class="spacer"></span><button class="btn sm" id="sugerir">${icon('sparkle')}Sugerir con mi promedio</button></div>
      <ul class="pres-list">${cats.map((c) => {
        const f = porCat[c.id]; const g = gastoMes[c.id] ?? 0; const lim = pres[c.id] ?? '';
        const uso = lim ? g / lim : 0;
        return `<li class="${f?.nivel ?? ''}">
          <span class="avatar sm" style="background:${c.color}">${icon(c.icono)}</span>
          <span class="pl-main"><span class="pl-top"><b>${esc(c.nombre)}</b><span class="num small">${money(g)}${lim ? ` de ${money(lim)}` : ''}</span></span>
            ${lim ? `<span class="pl-track"><i style="--w:${Math.min(100, uso * 100)}%"></i></span>` : `<span class="small muted">${prom(c.id) ? `Promedio: ${money(prom(c.id))} al mes` : 'Sin límite'}</span>`}</span>
          <label class="pl-in"><span class="sr-only">Límite mensual de ${esc(c.nombre)}</span><input type="number" min="0" step="0.01" inputmode="decimal" data-cat="${c.id}" value="${esc(lim)}" placeholder="Límite" /></label>
        </li>`; }).join('')}</ul>
    </div>
  </section>`;

  main.querySelector('#presMes').onchange = (e) => { mesSel = e.target.value; render(main); };
  main.querySelectorAll('[data-cat]').forEach((inp) => inp.addEventListener('change', () => {
    const v = Number(inp.value) || 0;
    aplicar((s) => { const p = { ...(s.presupuestos ?? {}) }; if (v > 0) p[inp.dataset.cat] = v; else delete p[inp.dataset.cat]; return { ...s, presupuestos: p }; });
  }));
  main.querySelector('#sugerir').onclick = () => {
    const nuevos = Object.fromEntries(cats.map((c) => [c.id, Math.ceil(prom(c.id) / 100) * 100]).filter(([id, v]) => v > 0 && !pres[id]));
    if (!Object.keys(nuevos).length) { toast('Necesitas gastos de meses anteriores para sugerir límites', icon('info')); return; }
    aplicar((s) => ({ ...s, presupuestos: { ...(s.presupuestos ?? {}), ...nuevos } }));
    toast(`${Object.keys(nuevos).length} límite(s) sugeridos con tu promedio`, icon('sparkle'));
  };
}
