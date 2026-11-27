// Textos legales. Versión y fecha se registran con cada aceptación (tabla consentimientos).
// Datos del responsable proporcionados por él (2026-11-27). Conviene que un abogado revise ambos documentos.
export const VERSION_LEGAL = '2026-11-27.2';

export const RESPONSABLE = {
  nombre: 'Brayand Axel Achautla Hernández',
  domicilio: 'Calle Reforma Sur número 4, colonia Vicente Guerrero, Comalcalco, Tabasco, México',
  correo: 'cuenfis.soporte@gmail.com',
  sitio: 'https://achautla.github.io/Cuenfis/',
};

/** ¿Faltan datos del responsable? La app lo avisa en Información legal. */
export const faltanDatos = Object.values(RESPONSABLE).some((v) => v.startsWith('['));

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
    '<b>Asistente con IA (solo si lo activas):</b> el texto de tus preguntas y los datos que el asistente necesita para responder cada una (por ejemplo, totales de un mes o los movimientos que busca). Tus conversaciones se guardan solo en tu dispositivo; en el servidor solo contamos cuántos mensajes usas al mes. Lo que tú decides que el asistente recuerde (por ejemplo, una meta o tu estilo de respuesta preferido) se guarda con tus datos y puedes borrarlo en <i>Asistente → Memoria y estilo</i>.',
    '<b>Técnicos:</b> dispositivo y navegador desde los que guardas (para resolver conflictos entre dispositivos) y fecha de cada versión guardada.',
  ]) + P('No te pedimos datos sensibles. Si en una nota de un gasto médico escribes detalles de tu salud, esos datos se protegen igual; te recomendamos no escribirlos. Nunca te pediremos tu contraseña ni tu e.firma del SAT.')],
  ['Para qué los usamos', P('<b>Finalidades necesarias para el servicio:</b>') + L([
    'Registrar y organizar tus movimientos y calcular estimaciones fiscales y financieras.',
    'Guardar tu información en la nube, sincronizarla entre tus dispositivos y conservar versiones anteriores para que puedas recuperarlas.',
    'Generar los reportes que tú descargues y los avisos que tú actives.',
    'Mantener la seguridad de tu cuenta y atender tus solicitudes.',
    'Si activas el asistente: responder tus preguntas con tus propios datos y preparar movimientos que tú revisas antes de guardar.',
  ]) + P('<b>No hay finalidades secundarias:</b> no usamos tus datos para publicidad, perfiles comerciales ni los vendemos.')],
  ['Consentimiento', P('Por tratarse de datos financieros y patrimoniales, al crear tu cuenta te pedimos tu consentimiento expreso. Queda registrado con la fecha y la versión de este aviso. Puedes revocarlo en cualquier momento eliminando tu cuenta desde <i>Cuenta y nube</i>.') + P('El asistente con IA tiene su propio consentimiento, que te pedimos aparte y también queda registrado. Puedes retirarlo en <i>Ajustes → Asistente con IA</i> sin afectar el resto de la app.')],
  ['Con quién se comparten', P('<b>No transferimos tus datos a terceros.</b> Para operar usamos proveedores que los tratan solo por nuestra cuenta y bajo nuestras instrucciones (encargados):') + L([
    '<b>Supabase</b>: base de datos, autenticación y almacenamiento de archivos (servidores en Estados Unidos).',
    '<b>Proveedor de hospedaje</b> de la aplicación web, que no recibe tus datos financieros.',
    '<b>Anthropic</b> (Estados Unidos), solo si activas el asistente: procesa cada pregunta para generar la respuesta. Por contrato no usa estos datos para entrenar sus modelos.',
  ]) + P('Solo compartiríamos datos con autoridades cuando una ley o una orden judicial lo exija.')],
  ['Cómo limitar el uso de tus datos', P('Puedes usar Cuenfis sin cuenta, dejar vacíos los datos opcionales (nombre, RFC, notas, folios) y desactivar los avisos del dispositivo. También puedes borrar tus datos de la nube sin borrar los de tu dispositivo.')],
  ['Tus derechos ARCO', P('Tienes derecho a <b>Acceder</b> a tus datos, <b>Rectificarlos</b>, <b>Cancelarlos</b> y <b>Oponerte</b> a su tratamiento. La app te permite ejercer la mayoría directamente:') + L([
    'Acceso y portabilidad: <i>Ajustes → Descargar respaldo</i> o los reportes en Excel.',
    'Rectificación: edita cualquier dato en la app.',
    'Cancelación: <i>Cuenta y nube → Eliminar mi cuenta</i> borra tu cuenta, tus datos en la nube, su historial y tus acuses.',
  ]) + P(`Para cualquier otra solicitud escribe a <b>${RESPONSABLE.correo}</b> con tu nombre, el correo de tu cuenta, lo que solicitas y, en su caso, el dato a corregir. Responderemos en los plazos que fija la Ley. Si consideras que no se respetaron tus derechos, puedes acudir a la Secretaría Anticorrupción y Buen Gobierno.`)],
  ['Cómo eliminar tu cuenta y tus datos', P('Desde la app: <i>Cuenta y nube → Eliminar mi cuenta</i>. Se borra al momento tu cuenta, tus datos en la nube, las versiones guardadas y tus acuses.') + P(`Si ya no tienes la app, escribe desde el correo de tu cuenta a <b>${RESPONSABLE.correo}</b> con el asunto "Eliminar mi cuenta". La eliminamos en un máximo de 20 días hábiles y te confirmamos por correo. Más detalles en ${RESPONSABLE.sitio}eliminar-cuenta.html`)],
  ['Almacenamiento en tu dispositivo', P('Cuenfis guarda tu información y tu sesión en el almacenamiento interno de la app o del navegador para funcionar sin conexión. Si desinstalas la app o borras los datos del navegador, esa copia se borra; tu copia en la nube (si tienes cuenta) se conserva. No usamos cookies de rastreo, publicidad ni herramientas de analítica de terceros, y las tipografías vienen incluidas en la app.')],
  ['Permisos del dispositivo', L([
    '<b>Notificaciones (opcional):</b> solo si las activas en <i>Avisos</i>, para recordarte fechas límite. Puedes desactivarlas en cualquier momento.',
    '<b>Archivos:</b> la app solo lee los archivos que tú eliges (un acuse o un respaldo) y solo guarda los que tú descargas.',
    '<b>Cámara y fotos (opcional):</b> solo cuando tú tomas o eliges la foto de un ticket o factura. La foto se guarda únicamente en tu dispositivo, nunca en la nube. Si el asistente con IA está activo y la foto no trae el QR de una factura, se envía una versión reducida para leer el ticket y no se conserva en el servidor.',
    'No usamos tu ubicación, micrófono, contactos ni identificadores de publicidad.',
  ])],
  ['Menores de edad', P('Cuenfis está dirigida a personas mayores de 18 años. No recabamos a sabiendas datos de menores; si detectamos una cuenta de un menor, la eliminaremos.')],
  ['Seguridad y conservación', P('Cada usuario solo puede leer y escribir su propia información (seguridad a nivel de fila en la base de datos), la conexión va cifrada y los acuses se guardan en un espacio privado. Conservamos tus datos mientras tengas cuenta; al eliminarla se borran, salvo lo que una ley nos obligue a conservar.')],
  ['Cambios a este aviso', P(`Si cambia este aviso te lo mostraremos en la app antes de seguir usando la nube. Versión vigente: ${VERSION_LEGAL}.`)],
  ['Contacto', P(`Responsable: ${RESPONSABLE.nombre}. Domicilio: ${RESPONSABLE.domicilio}. Correo de privacidad: <b>${RESPONSABLE.correo}</b>.`)],
];

export const TERMINOS = [
  ['Qué es Cuenfis', P('Cuenfis es una herramienta para organizar tus finanzas personales y estimar tus obligaciones fiscales como persona física en México. Es informativa y educativa.')],
  ['No es asesoría fiscal', P('Los cálculos son <b>estimaciones</b> con las reglas fiscales vigentes que conocemos. No sustituyen la asesoría de un contador ni la información oficial del SAT. Antes de presentar una declaración, verifica las cifras con el prellenado del portal del SAT, tus CFDI y tus constancias. Tú decides qué declaras y eres responsable de tus declaraciones y pagos.')],
  ['Asistente con IA', P('El asistente es opcional. Sus respuestas pueden contener errores: las cifras fiscales las calcula Cuenfis con las reglas publicadas y siguen siendo estimaciones. Nunca guarda movimientos por ti; tú revisas y confirmas cada uno. Tiene un límite de mensajes al mes para mantener el servicio sostenible.')],
  ['Sin conexión con el SAT', P('Cuenfis no presenta declaraciones, no emite facturas y no se conecta con el SAT ni con tu banco. Todo lo que ves viene de lo que tú capturas.')],
  ['Quién puede usarla', P('Debes ser mayor de 18 años. Cuenfis está pensada para personas físicas que tributan en México; los cálculos no aplican a personas morales ni a otros países.')],
  ['Tu cuenta', P('Eres responsable de la confidencialidad de tu contraseña y de la información que registras. Si detectas un acceso que no reconoces, cambia tu contraseña y avísanos.')],
  ['Uso permitido', P('No debes usar Cuenfis para fines ilícitos, intentar acceder a datos de otros usuarios o afectar el funcionamiento del servicio.')],
  ['Disponibilidad', P('Procuramos que el servicio esté disponible y que tus datos estén respaldados (por eso guardamos versiones anteriores y puedes descargar respaldos), pero puede haber interrupciones. Te recomendamos descargar un respaldo de vez en cuando.')],
  ['Responsabilidad', P('En la medida que permita la ley, no somos responsables de multas, recargos, diferencias de impuestos ni decisiones financieras tomadas con base en las estimaciones de la app.')],
  ['Propiedad intelectual', P(`La app, su diseño, textos y código pertenecen a ${RESPONSABLE.nombre}, salvo las bibliotecas de terceros que usa bajo sus propias licencias (ver <i>Información legal</i>). Tus datos son tuyos: puedes descargarlos y borrarlos cuando quieras.`)],
  ['Suspensión y baja', P('Puedes dejar de usar Cuenfis y eliminar tu cuenta en cualquier momento. Podemos suspender una cuenta que se use para fines ilícitos o que intente afectar el servicio o a otros usuarios, avisándote cuando sea posible.')],
  ['Precio', P('Hoy Cuenfis es gratuito. Si en el futuro hubiera funciones de pago, te lo informaremos antes y nunca se cobrará sin tu aceptación.')],
  ['Cambios y ley aplicable', P(`Podemos actualizar estos términos; te avisaremos en la app. Se rigen por las leyes de México y, para cualquier controversia, te puedes dirigir a la Procuraduría Federal del Consumidor (Profeco) o a los tribunales competentes de tu domicilio. Versión vigente: ${VERSION_LEGAL}.`)],
  ['Contacto', P(`${RESPONSABLE.nombre} · ${RESPONSABLE.domicilio} · <b>${RESPONSABLE.correo}</b>`)],
];

/** Página pública para eliminar la cuenta (Google Play la pide aunque el usuario ya no tenga la app). */
export const ELIMINAR_CUENTA = [
  ['Desde la app (inmediato)', L([
    'Abre Cuenfis e inicia sesión.',
    'Ve a <i>Cuenta y nube → Tus datos y tus derechos</i>.',
    'Si quieres conservar una copia, toca <i>Descargar mis datos</i>.',
    'Toca <i>Eliminar mi cuenta</i>, escribe ELIMINAR y confirma.',
  ])],
  ['Sin la app (por correo)', P(`Escribe desde el correo de tu cuenta a <b>${RESPONSABLE.correo}</b> con el asunto "Eliminar mi cuenta". Para proteger tus datos, solo atendemos solicitudes enviadas desde el correo registrado. La eliminamos en un máximo de 20 días hábiles y te confirmamos por correo.`)],
  ['Qué se borra', L([
    'Tu cuenta y tu correo de acceso.',
    'Todos tus datos en la nube: movimientos, cuentas, regímenes, declaraciones, metas, presupuestos, clientes y facturas registradas.',
    'Las versiones anteriores guardadas y los acuses que hayas subido.',
    'El registro de tu consentimiento.',
  ])],
  ['Qué se conserva', P('Nada en nuestros servidores, salvo lo que una ley nos obligue a conservar. Los datos guardados en tu propio dispositivo se borran al desinstalar la app o al usar <i>Ajustes → Borrar todo</i>.')],
  ['Solo quieres borrar tus datos, no la cuenta', P('En <i>Cuenta y nube</i> usa <i>Borrar mis datos de la nube</i>: se borra tu información guardada en la nube y conservas tu cuenta y los datos de tu dispositivo.')],
];

export const DESCARGO = 'Cuenfis da estimaciones con las reglas fiscales vigentes que conocemos (2026). No es asesoría fiscal, no presenta declaraciones ni emite facturas y no se conecta con el SAT ni con tu banco. Verifica tus cifras con el portal del SAT o con un contador.';

export const LICENCIAS = [
  ['@supabase/supabase-js', 'MIT', 'Cuenta, base de datos y archivos en la nube'],
  ['write-excel-file', 'MIT', 'Reportes en Excel'],
  ['Inter e Inter Tight (Fontsource)', 'SIL Open Font License 1.1', 'Tipografías'],
  ['Vite', 'MIT', 'Construcción de la app'],
];
