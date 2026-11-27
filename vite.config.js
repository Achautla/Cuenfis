import { defineConfig, loadEnv } from 'vite';
import { AVISO_PRIVACIDAD, TERMINOS, ELIMINAR_CUENTA, VERSION_LEGAL, RESPONSABLE } from './src/legal/textos.js';

// Páginas legales estáticas (sin JavaScript): son las direcciones públicas que piden Google Play
// y las tiendas para el aviso de privacidad y la eliminación de cuenta.
function paginaLegal(titulo, secciones) {
  const otras = [['privacidad.html', 'Aviso de privacidad'], ['terminos.html', 'Términos y condiciones'], ['eliminar-cuenta.html', 'Eliminar tu cuenta']];
  return `<!doctype html><html lang="es-MX"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${titulo} · Cuenfis</title><meta name="robots" content="index" />
<style>:root{color-scheme:light dark;--fg:#0f1b2d;--mut:#3d4b5f;--acc:#1a6bd1;--bg:#f6f8fb;--card:#fff;--line:#e2e7ee}
@media (prefers-color-scheme:dark){:root{--fg:#e8edf4;--mut:#b4c0cf;--acc:#6aa8ff;--bg:#0b1220;--card:#121b2c;--line:#24324a}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 48px}h1{font-size:26px;margin:8px 0 4px}h2{font-size:18px;margin:24px 0 6px}
p,li{color:var(--mut)}a{color:var(--acc)}.doc{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:8px 20px 16px}
nav{display:flex;gap:14px;flex-wrap:wrap;font-size:14px;margin:16px 0}</style></head><body><main>
<p><a href="./">← Abrir Cuenfis</a></p><h1>${titulo}</h1><p>Versión ${VERSION_LEGAL} · Responsable: ${RESPONSABLE.nombre} · ${RESPONSABLE.correo}</p>
<div class="doc">${secciones.map(([h, html]) => `<h2>${h}</h2>${html}`).join('')}</div>
<nav>${otras.map(([f, t]) => `<a href="${f}">${t}</a>`).join('')}</nav></main></body></html>`;
}

// Política de seguridad de contenido: solo se cargan scripts propios y solo se habla con Supabase.
function csp(env) {
  const sb = env.VITE_SUPABASE_URL || '';
  const ws = sb.replace(/^https:/, 'wss:');
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self' data: blob:${sb ? ' ' + sb : ''}`,
    `connect-src 'self' data:${sb ? ` ${sb} ${ws}` : ''}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Rutas relativas: funciona igual en un dominio propio, en Vercel o en GitHub Pages (/Cuenfis/)
    base: './',
    plugins: [{
      name: 'cuenfis-legal',
      apply: 'build',
      generateBundle() {
        for (const [fileName, t, sec] of [['privacidad.html', 'Aviso de privacidad', AVISO_PRIVACIDAD], ['terminos.html', 'Términos y condiciones', TERMINOS], ['eliminar-cuenta.html', 'Eliminar tu cuenta y tus datos', ELIMINAR_CUENTA]]) {
          this.emitFile({ type: 'asset', fileName, source: paginaLegal(t, sec) });
        }
      },
    }, {
      name: 'cuenfis-csp',
      apply: 'build',
      transformIndexHtml(html) {
        if (process.env.CSP === '0') return html;
        return html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n  <meta http-equiv="Content-Security-Policy" content="${csp(env)}" />\n  <meta name="referrer" content="strict-origin-when-cross-origin" />`);
      },
    }],
  };
});
