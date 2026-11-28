import { describe, it, expect, vi } from 'vitest';

// Los plugins de Capacitor son Proxy: responden a CUALQUIER método, también a "then".
// Si el código resuelve una promesa con el plugin (o lo devuelve desde una función async),
// JavaScript llama a Plugin.then(), que en Android lanza "Plugin.then() is not implemented"
// y la espera nunca termina. Esta prueba simula ese Proxy y revisa que la app no caiga en eso.
const proxy = (nombre, metodos) => new Proxy({}, {
  get(_, prop) {
    if (prop in metodos) return metodos[prop];
    return () => { throw new Error(`"${nombre}.${String(prop)}()" is not implemented on android`); };
  },
});

const simular = () => {
vi.resetModules();
vi.doMock('../src/native.js', () => ({ nativo: true }));
vi.doMock('@capgo/capacitor-native-biometric', () => ({
  NativeBiometric: proxy('NativeBiometric', { isAvailable: async () => ({ isAvailable: true }), verifyIdentity: async () => {} }),
}));
vi.doMock('@capacitor/local-notifications', () => ({
  LocalNotifications: proxy('LocalNotifications', {
    addListener: async () => ({ remove() {} }),
    checkPermissions: async () => ({ display: 'granted' }),
    requestPermissions: async () => ({ display: 'granted' }),
    getPending: async () => ({ notifications: [] }),
  }),
}));
};

globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

const aTiempo = (p) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('se quedó esperando')), 500))]);

describe('plugins nativos (Proxy de Capacitor)', () => {
  it('la huella responde sin llamar a NativeBiometric.then()', async () => {
    simular();
    const huella = await import('../src/ui/huella.js');
    await expect(aTiempo(huella.disponible())).resolves.toBe(true);
  });
});
