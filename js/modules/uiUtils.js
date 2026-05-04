/**
 * Módulo de Utilidades de UI
 * Fornece funções para manipulação da interface do usuário
 */

/**
 * Mostra toast de notificação
 * @param {string} msg - Mensagem
 * @param {string} type - Tipo (success, error, info)
 */
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/**
 * Mostra/esconde loading
 * @param {boolean} show - Se deve mostrar
 */
function showLoading(show, msg = '') {
  const loading = document.getElementById('loading');
  if (!loading) return;
  loading.classList.toggle('hidden', !show);
  const msgEl = document.getElementById('loading-msg');
  if (msgEl) msgEl.textContent = msg;
}

/**
 * Alterna aba ativa
 * @param {string} tab - Nome da aba
 */
function mudarTab(tab) {
  // Esconder todas as abas
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.remove('active');
  });
  
  // Remover classe ativa dos botões
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Mostrar aba selecionada
  const tabContent = document.getElementById(`tab-${tab}`);
  if (tabContent) {
    tabContent.classList.add('active');
  }
  
  // Ativar botão
  const tabBtn = document.querySelector(`[onclick="mudarTab('${tab}')"]`);
  if (tabBtn) {
    tabBtn.classList.add('active');
  }
  
  // Atualizar estado
  AppState.activeTab = tab;
}

/**
 * Atualiza navegação da semana
 */
function atualizarNavSemana() {
  const dias = getDiasSemana(AppState.weekOffset);
  const periodo = `${toBR(dias[0])} a ${toBR(dias[4])}`;
  const nav = document.getElementById('nav-semana');
  if (nav) {
    nav.textContent = `Semana: ${periodo}`;
  }
}

/**
 * Embaralha array (Fisher-Yates)
 * @param {Array} array - Array para embaralhar
 * @returns {Array} Array embaralhada
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Exportação
export { showToast, showLoading, mudarTab, atualizarNavSemana, shuffle };
