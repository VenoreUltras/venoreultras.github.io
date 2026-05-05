import { pl } from './i18n/pl.js';

export class PhysicsEngine {
  /**
   * Oblicza pozycję suwaka na osi Y w mechanizmie korbowo-wodzikowym.
   * Wzór: y = r * cos(alpha) + sqrt(l^2 - (r * sin(alpha))^2)
   *
   * @param {number} angle - Kąt obrotu wału (w radianach, 0 to górne martwe położenie)
   * @param {number} r - Promień korby (skok prasy to 2 * r)
   * @param {number} l - Długość korbowodu
   * @returns {number} Aktualna pozycja Y suwaka
   * @throws {Error} jeśli r/l są niedodatnie, nieskończone, lub r >= l (geometrycznie zwyrodniałe)
   */
  static calculateSliderPosition(angle, r, l) {
    // INFRA-04: walidacja wejść. Walidacja przy każdym wywołaniu — koszt znikomy
    // (3 porównania), pewność że tick loop nie przemyca NaN-ów.
    if (!Number.isFinite(r) || !Number.isFinite(l) || !Number.isFinite(angle)) {
      throw new Error(`${pl.physics.paramsNotFinite} (angle=${angle}, r=${r}, l=${l})`);
    }
    if (r <= 0) {
      throw new Error(`${pl.physics.rNotPositive} (otrzymano r=${r})`);
    }
    if (l <= 0) {
      throw new Error(`${pl.physics.lNotPositive} (otrzymano l=${l})`);
    }
    if (r >= l) {
      throw new Error(`${pl.physics.rNotLessThanL} (otrzymano r=${r}, l=${l})`);
    }
    const term1 = r * Math.cos(angle);
    const term2 = Math.sqrt(l * l - (r * Math.sin(angle)) ** 2);
    return term1 + term2;
  }
}
