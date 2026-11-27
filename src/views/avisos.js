import { getEstado, getFoto } from '../data/store.js';
import { recordatorios } from '../core/recordatorios.js';
import * as notif from '../ui/notificaciones.js';
import { icon } from '../ui/icons.js';
import { $, esc, fechaLarga, toast } from '../ui/dom.js';
import '../styles/views/avisos.css';

const ICONO = { declaracion: 'file', deudas: 'credit-card', recurrentes: 'clock', clientes: 'receipt', presupuestos: 'target' };

export function render(main) {
  const estado = getEstado(), foto = getFoto();
  const lista = recordatorios(estado, foto);
  const sop = notif.soportadas(), on = notif.activas();
  const bloqueadas = sop && Notification.permission === 'denied';

  main.innerHTML = `<section class="view avisos">
    <div class="page-head"><div><h1>Avisos</h1><p class="sub">Lo que conviene atender pronto, según tu régimen y tus datos.</p></div></div>
    <div class="card av-notif">
      <span class="av-ico">${icon('bell')}</span>
      <span><b>Avisos en este dispositivo</b><span class="small muted">${!sop ? 'Este navegador no permite avisos. Instala la app en tu pantalla de inicio para recibirlos.'
        : bloqueadas ? 'Bloqueaste los avisos para Cuenfis. Actívalos en la configuración del navegador.'
        : on ? 'Activos. Te avisamos al abrir la app, una vez al día por cada pendiente.' : 'Te avisamos de fechas límite y pagos al abrir la app.'}</span></span>
      ${sop && !bloqueadas ? `<button class="btn ${on ? '' : 'primary'} sm" id="tgl">${on ? 'Desactivar' : 'Activar'}</button>` : ''}
    </div>
    ${lista.length ? `<ul class="av-list">${lista.map((r) => `<li class="${r.nivel}"><a href="#/${r.ruta}">
        <span class="av-ico">${icon(ICONO[r.ruta] ?? 'bell')}</span>
        <span class="av-main"><b>${esc(r.titulo)}</b><span class="small muted">${esc(r.texto)}</span></span>
        <span class="small av-f">${r.nivel === 'urgente' ? '<span class="chip warn">Urgente</span>' : ''}${esc(fechaLarga(r.fecha))}</span></a></li>`).join('')}</ul>`
      : `<div class="card empty">${icon('check-circle')}<p>Todo en orden. No tienes pendientes por ahora.</p></div>`}
    <p class="disclaimer">Fechas según las reglas generales del SAT y de tu banco. Si un día límite cae en fin de semana o día inhábil, suele recorrerse al siguiente día hábil.</p>
  </section>`;

  $('#tgl', main)?.addEventListener('click', async () => {
    if (on) { notif.desactivar(); toast('Avisos desactivados en este dispositivo', icon('bell')); render(main); return; }
    const r = await notif.activar();
    toast(r === 'granted' ? 'Avisos activados' : 'No se activaron los avisos. Puedes intentarlo después.', icon('bell'));
    if (r === 'granted') notif.revisar(estado, foto);
    render(main);
  });
}
