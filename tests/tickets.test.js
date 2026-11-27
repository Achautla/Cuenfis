import { describe, it, expect } from 'vitest';
import { leerQrCfdi, ligaVerificacion } from '../src/ia/cfdi.js';

const QR = 'https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=5FB2822E-396D-4725-8521-CDC4BDD20CCF&re=WAL9709244W4&rr=XAXX010101000&tt=1234.50&fe=ZnF8dw==';

describe('QR de facturas (CFDI)', () => {
  it('lee folio, RFC y total de la liga del verificador del SAT', () => {
    expect(leerQrCfdi(QR)).toEqual({ uuid: '5FB2822E-396D-4725-8521-CDC4BDD20CCF', rfcEmisor: 'WAL9709244W4', rfcReceptor: 'XAXX010101000', total: 1234.5, sello: 'ZnF8dw==' });
  });
  it('acepta el formato antiguo (CFDI 3.3) con solo parámetros y totales con ceros', () => {
    const c = leerQrCfdi('?re=AAA010101AAA&rr=BBB020202BB1&tt=0000000500.000000&id=5fb2822e-396d-4725-8521-cdc4bdd20ccf');
    expect(c).toMatchObject({ total: 500, rfcEmisor: 'AAA010101AAA', uuid: '5FB2822E-396D-4725-8521-CDC4BDD20CCF' });
  });
  it('rechaza QR que no son del SAT o vienen incompletos', () => {
    expect(leerQrCfdi('https://sitio-falso.com/default.aspx?id=5FB2822E-396D-4725-8521-CDC4BDD20CCF&re=WAL9709244W4&tt=10')).toBeNull();
    expect(leerQrCfdi(QR.replace('tt=1234.50', 'tt=0'))).toBeNull();
    expect(leerQrCfdi(QR.replace('id=5FB2822E', 'id=XYZ'))).toBeNull();
    expect(leerQrCfdi('hola')).toBeNull();
  });
  it('arma la liga para verificar en el SAT', () => {
    expect(ligaVerificacion(leerQrCfdi(QR))).toMatch(/^https:\/\/verificacfdi\.facturaelectronica\.sat\.gob\.mx\/default\.aspx\?id=5FB2822E/);
  });
});
