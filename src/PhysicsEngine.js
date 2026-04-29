export class PhysicsEngine {
  /**
   * Oblicza pozycję suwaka na osi Y w mechanizmie korbowo-wodzikowym.
   * Wzór: y = r * cos(alpha) + sqrt(l^2 - (r * sin(alpha))^2)
   * 
   * @param {number} angle - Kąt obrotu wału (w radianach, 0 to górne martwe położenie)
   * @param {number} r - Promień korby (skok prasy to 2 * r)
   * @param {number} l - Długość korbowodu
   * @returns {number} Aktualna pozycja Y suwaka
   */
  static calculateSliderPosition(angle, r, l) {
    const term1 = r * Math.cos(angle);
    const term2 = Math.sqrt(Math.pow(l, 2) - Math.pow(r * Math.sin(angle), 2));
    return term1 + term2;
  }
}
