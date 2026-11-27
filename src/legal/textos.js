// Textos legales. Versión y fecha se registran con cada aceptación (tabla consentimientos).
// IMPORTANTE: antes del lanzamiento, el responsable debe completar los datos marcados con [ ] y
// conviene que un abogado revise ambos documentos.
export const VERSION_LEGAL = '2026-11-27';

export const RESPONSABLE = {
  nombre: '[Nombre completo o razón social del responsable]',
  domicilio: '[Domicilio completo en México]',
  correo: '[correo de privacidad, p. ej. privacidad@tu-dominio.mx]',
};

const P = (t) => `<p>${t}</p>`;
const L = (xs) => `<ul>${xs.map((x) => `<li>${x}</li>`).join('')}</ul>`;

export const AVISO_SIMPLIFICADO = `${RESPONSABLE.nombre} es responsable del tratamiento de tus datos en Cuenfis. Los usamos solo para darte el servicio:
registrar tus movimientos, calcular tus estimaciones fiscales y, si creas una cuenta, guardarlos en la nube y sincronizarlos. No los vendemos ni los usamos para publicidad.`;

export const AVISO_PRIVACIDAD = [
  ['Quién es responsable de tus datos', P(`${RESPONSABLE.nombre}, con domicilio en ${RESPONSABLE.domicilio}, es responsable del tratamiento de los datos personales que se recaban en Cuenfis, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (DOF 20 de marzo de 2025).`)],
  ['Qué datos tratamos', P('Según cómo uses Cuenfis:') + L([
    '<b>Sin cuenta:</b> todo se guarda solo en tu dispositivo. No recibimos ninguno de tus datos.',
    '<b>Identificación y contacto (con cuenta):</b> correo electrónico; y si lo capturas, nombre y RFC.',
    '<b>Financieros y patrimoniales (con cuenta):</b> cuentas, saldos, deudas, tarjetas, ingresos, gastos, régimen fiscal, cálculos de impuestos, declaraciones, números de operación y acuses que adjuntes, clientes y facturas que registres, metas y presupuestos.',
    '<b>Técnicos:</b> dispositivo y navegador desde los que guardas (para resolver conflictos entre dispositivos) y fecha de cada versión guardada.',
  ]) + P('No te pedimos datos sensibles. Si en una nota de un gasto médico escribes detalles de tu salud, esos datos se protegen igual; te recomendamos no escribirlos. Nunca te pediremos tu contraseña ni tu e.firma del SAT.')],
  ['Para qué los usamos', P('<b>Finalidades necesarias para el servicio:</b>') + L([
    'Registrar y organizar tus movimientos y calcular estimaciones fiscales y financieras.',
    'Guardar tu información en la nube, sincronizarla entre tus dispositivos y conservar versiones anteriores para que puedas recuperarlas.',
    'Generar los reportes que tú descargues y los avisos que tú actives.',
    'Mantener la seguridad de tu cuenta y atender tus solicitudes.',
  ]) + P('<b>No hay finalidades secundarias:</b> no usamos tus datos para publicidad, perfiles comerciales ni los vendemos.')],
  ['Consentimiento', P('Por tratarse de datos financieros y patrimoniales, al crear tu cuenta te pedimos tu consentimiento expreso. Queda registrado con la fecha y la versión de este aviso. Puedes revocarlo en cualquier momento eliminando tu cuenta desde <i>Cuenta y nube</i>.')],
  ['Con quién se comparten', P('<b>No transferimos tus datos a terceros.</b> Para operar usamos proveedores que los tratan solo por nuestra cuenta y bajo nuestras instrucciones (encargados):') + L([
    '<b>Supabase</b>: base de datos, autenticación y almacenamiento de archivos (servidores en Estados Unidos).',
    '<b>Proveedor de hospedaje</b> de la aplicación web, que no recibe tus datos financieros.',
  ]) + P('Solo compartiríamos datos con autoridades cuando una ley o una orden judicial lo exija.')],
  ['Cómo limitar el uso de tus datos', P('Puedes usar Cuenfis sin cuenta, dejar vacíos los datos opcionales (nombre, RFC, notas, folios) y desactivar los avisos del dispositivo. También puedes borrar tus datos de la nube sin borrar los de tu dispositivo.')],
  ['Tus derechos ARCO', P('Tienes derecho a <b>Acceder</b> a tus datos, <b>Rectificarlos</b>, <b>Cancelarlos</b> y <b>Oponerte</b> a su tratamiento. La app te permite ejercer la mayoría directamente:') + L([
    'Acceso y portabilidad: <i>Ajustes → Descargar respaldo</i> o los reportes en Excel.',
    'Rectificación: edita cualquier dato en la app.',
    'Cancelación: <i>Cuenta y nube → Eliminar mi cuenta</i> borra tu cuenta, tus datos en la nube, su historial y tus acuses.',
  ]) + P(`Para cualquier otra solicitud escribe a <b>${RESPONSABLE.correo}</b> con tu nombre, el correo de tu cuenta, lo que solicitas y, en su caso, el dato a corregir. Responderemos en los plazos que fija la Ley. Si consideras que no se respetaron tus derechos, puedes acudir a la Secretaría Anticorrupción y Buen Gobierno.`)],
  ['Almacenamiento en tu dispositivo', P('Cuenfis guarda tu información y tu sesión en el almacenamiento local del navegador para funcionar sin conexión. No usamos cookies de rastreo ni herramientas de publicidad o analítica de terceros.')],
  ['Seguridad y conservación', P('Cada usuario solo puede leer y escribir su propia información (seguridad a nivel de fila en la base de datos), la conexión va cifrada y los acuses se guardan en un espacio privado. Conservamos tus datos mientras tengas cuenta; al eliminarla se borran, salvo lo que una ley nos obligue a conservar.')],
  ['Cambios a este aviso', P(`Si cambia este aviso te lo mostraremos en la app antes de seguir usando la nube. Versión vigente: ${VERSION_LEGAL}.`)],
];

export const TERMINOS = [
  ['Qué es Cuenfis', P('Cuenfis es una herramienta para organizar tus finanzas personales y estimar tus obligaciones fiscales como persona física en México. Es informativa y educativa.')],
  ['No es asesoría fiscal', P('Los cálculos son <b>estimaciones</b> con las reglas fiscales vigentes que conocemos. No sustituyen la asesoría de un contador ni la información oficial del SAT. Antes de presentar una declaración, verifica las cifras con el prellenado del portal del SAT, tus CFDI y tus constancias. Tú decides qué declaras y eres responsable de tus declaraciones y pagos.')],
  ['Sin conexión con el SAT', P('Cuenfis no presenta declaraciones, no emite facturas y no se conecta con el SAT ni con tu banco. Todo lo que ves viene de lo que tú capturas.')],
  ['Tu cuenta', P('Eres responsable de la confidencialidad de tu contraseña y de la información que registras. Si detectas un acceso que no reconoces, cambia tu contraseña y avísanos.')],
  ['Uso permitido', P('No debes usar Cuenfis para fines ilícitos, intentar acceder a datos de otros usuarios o afectar el funcionamiento del servicio.')],
  ['Disponibilidad', P('Procuramos que el servicio esté disponible y que tus datos estén respaldados (por eso guardamos versiones anteriores y puedes descargar respaldos), pero puede haber interrupciones. Te recomendamos descargar un respaldo de vez en cuando.')],
  ['Responsabilidad', P('En la medida que permita la ley, no somos responsables de multas, recargos, diferencias de impuestos ni decisiones financieras tomadas con base en las estimaciones de la app.')],
  ['Precio', P('Hoy Cuenfis es gratuito. Si en el futuro hubiera funciones de pago, te lo informaremos antes y nunca se cobrará sin tu aceptación.')],
  ['Cambios y ley aplicable', P(`Podemos actualizar estos términos; te avisaremos en la app. Se rigen por las leyes de México. Versión vigente: ${VERSION_LEGAL}.`)],
];
