// Tablas legibles en celular: en pantallas angostas cada fila se vuelve una tarjeta con
// "etiqueta ........ valor", en vez de una tabla que se corta y hay que deslizar de lado.
// Etiqueta cada celda con el encabezado de su columna (data-label) cuando la tabla aparece.

/** Prepara una tabla: etiquetas por columna y clases para el modo apilado. */
export function prepararTabla(t) {
  if (t.dataset.lista) return;
  const cab = t.tHead?.rows[0];
  if (!cab) return;
  const titulos = [...cab.cells].map((c) => c.textContent.trim());
  t.dataset.lista = '1';
  if (titulos.length < 3) return; // 2 columnas caben bien como tabla
  t.classList.add('apilable');
  // Si la 1a columna es texto (fecha, mes, nombre), sirve de título de la tarjeta
  if (!cab.cells[0].classList.contains('n')) t.classList.add('con-titulo');
  for (const fila of [...t.tBodies].flatMap((b) => [...b.rows]).concat(t.tFoot ? [...t.tFoot.rows] : [])) {
    [...fila.cells].forEach((c, i) => { if (titulos[i]) c.dataset.label = titulos[i]; });
  }
}

/** Vigila un contenedor y prepara cada tabla que se pinte dentro. */
export function vigilarTablas(raiz) {
  const todo = () => raiz.querySelectorAll('table:not([data-lista])').forEach(prepararTabla);
  todo();
  new MutationObserver(todo).observe(raiz, { childList: true, subtree: true });
}
