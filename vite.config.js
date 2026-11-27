import { defineConfig, loadEnv } from 'vite';

// Política de seguridad de contenido: solo se cargan scripts propios y solo se habla con Supabase.
function csp(env) {
  const sb = env.VITE_SUPABASE_URL || '';
  const ws = sb.replace(/^https:/, 'wss:');
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
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
      name: 'cuenfis-csp',
      apply: 'build',
      transformIndexHtml(html) {
        if (process.env.CSP === '0') return html;
        return html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n  <meta http-equiv="Content-Security-Policy" content="${csp(env)}" />\n  <meta name="referrer" content="strict-origin-when-cross-origin" />`);
      },
    }],
  };
});
