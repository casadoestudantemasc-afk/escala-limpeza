/**
 * Módulo de Utilidades de Data
 * Fornece funções para manipulação de datas
 */

/**
 * Obtém os dias úteis (segunda a sexta) da semana atual
 * @param {number} weekOffset - Deslocamento em semanas (0 = atual)
 * @returns {Date[]} Array de 5 dias úteis
 */
function getDiasSemana(weekOffset = 0) {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - hoje.getDay() + 1 + (weekOffset * 7));
  
  const dias = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    dias.push(d);
  }
  return dias;
}

/**
 * Converte data para formato ISO (YYYY-MM-DD)
 * @param {Date} d - Data
 * @returns {string} Data no formato ISO
 */
function toISO(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte data para formato brasileiro (DD/MM)
 * @param {Date} d - Data
 * @returns {string} Data no formato brasileiro
 */
function toBR(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Obtém os dias úteis da semana filtrando feriados
 * @param {number} weekOffset - Deslocamento em semanas
 * @param {string[]} feriados - Array de datas de feriados (ISO)
 * @returns {Date[]} Dias úteis não feriados
 */
function getDiasUteis(weekOffset = 0, feriados = []) {
  const feriadosISO = new Set(feriados.map(f => f.data));
  return getDiasSemana(weekOffset).filter(d => !feriadosISO.has(toISO(d)));
}

/**
 * Obtém o intervalo de datas da semana
 * @param {number} weekOffset - Deslocamento em semanas
 * @returns {[string, string]} Array com [inicio, fim] no formato ISO
 */
function getWeekRange(weekOffset = 0) {
  const dias = getDiasSemana(weekOffset);
  return [toISO(dias[0]), toISO(dias[4])];
}

// Exportação
export { getDiasSemana, toISO, toBR, getDiasUteis, getWeekRange };
