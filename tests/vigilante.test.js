import { describe, it, expect } from 'vitest';
import { buscarPublicaciones, ultimosDias } from '../scripts/vigilar-dof.mjs';

describe('Vigilante del DOF', () => {
  it('encuentra publicaciones fiscales en el sumario y descarta lo demás', () => {
    const html = `<html><script>var x = "Resolución Miscelánea Fiscal";</script><body>
      <a class="enlaces" href="#">RESOLUCIÓN Miscelánea Fiscal para 2027 y sus anexos 1, 1-A, 8 y 15.</a>
      <a href="#">Acuerdo por el que se da a conocer el horario de atención en oficinas de la Secretaría de Salud.</a>
      <p>Valor de la Unidad de Medida y Actualización&nbsp;para el año 2027.</p>
      <a class="enlaces" href="#">RESOLUCIÓN Miscelánea Fiscal para 2027 y sus anexos 1, 1-A, 8 y 15.</a></body></html>`;
    expect(buscarPublicaciones(html)).toEqual([
      'RESOLUCIÓN Miscelánea Fiscal para 2027 y sus anexos 1, 1-A, 8 y 15.',
      'Valor de la Unidad de Medida y Actualización para el año 2027.',
    ]);
  });
  it('cuenta los días en hora de la Ciudad de México', () => {
    expect(ultimosDias(3, new Date('2027-01-01T03:00:00Z'))).toEqual(['2026-12-31', '2026-12-30', '2026-12-29']);
  });
});
