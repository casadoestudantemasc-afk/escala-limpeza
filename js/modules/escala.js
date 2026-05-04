/**
 * Módulo de Geração de Escala
 * Contém o algoritmo principal de geração da escala de limpeza
 */

import { AppState, EMOJIS_LOCAIS, DIAS_SEMANA, DIAS_CURTO } from './state.js';
import { getDiasSemana, toISO, toBR, getDiasUteis, getWeekRange } from './dateUtil.js';
import DB from './db.js';
import { showToast, showLoading } from './uiUtils.js';

// ============== GERAÇÃO DA ESCALA ============

/**
 * Gera a escala de limpeza para a semana atual
 * @param {boolean} forcar - Se true, regenera mesmo já existindo escala
 */
async function gerarEscala(forcar = false) {
  const diasUteis = getDiasUteis(AppState.weekOffset, AppState.feriados);
  if (diasUteis.length === 0) {
    showToast('Não há dias úteis nesta semana.', 'error');
    return;
  }

  if (!forcar && AppState.escalaAtual.length > 0) {
    if (!confirm('Já existe uma escala para esta semana. Deseja regenerar?')) return;
  }

  showLoading(true, 'Gerando escala...');
  try {
    const [start, end] = getWeekRange(AppState.weekOffset);
    await DB.deletarEscala(start, end);

    const historico = await DB.getContagemHistorico();
    const segunda = toISO(getDiasSemana(AppState.weekOffset)[0]);

    // Mapa indisponibilidades: data -> Set de morador_ids
    const indispMap = {};
    AppState.indisponibilidadesAtual.forEach(i => {
      if (!indispMap[i.data]) indispMap[i.data] = new Set();
      indispMap[i.data].add(i.morador_id);
    });

    const moradorAtivos = AppState.moradores.filter(m => m.ativo);
    const rows = [];
    let avisos = [];

    for (const dia of diasUteis) {
      const iso = toISO(dia);
      const indispHoje = indispMap[iso] || new Set();

      // Locais ativos para este dia (config ou todos)
      const temConfigDia = Object.prototype.hasOwnProperty.call(AppState.configLocaisSemana, iso);
      const idsConfigurados = AppState.configLocaisSemana[iso] || [];
      const locaisHoje = temConfigDia
        ? AppState.locais.filter(l => idsConfigurados.includes(l.id))
        : AppState.locais;

      const disponiveis = moradorAtivos.filter(m => !indispHoje.has(m.id));

      if (disponiveis.length < locaisHoje.length) {
        avisos.push(`${DIAS_CURTO[dia.getDay()]} ${toBR(dia)}: apenas ${disponiveis.length} disponíveis para ${locaisHoje.length} locais`);
      }

      // Ordenar por menos aparições no histórico; empates resolvidos por chave aleatória fixa
      const ordenados = disponiveis
        .map(m => ({ m, count: historico[m.id] || 0, rand: Math.random() }))
        .sort((a, b) => a.count !== b.count ? a.count - b.count : a.rand - b.rand)
        .map(({ m }) => m);

      const selecionados = ordenados.slice(0, Math.min(locaisHoje.length, ordenados.length));
      const embaralhados = shuffle(selecionados);

      locaisHoje.forEach((local, i) => {
        if (embaralhados[i]) {
          rows.push({
            morador_id: embaralhados[i].id,
            local_id: local.id,
            data: iso,
            semana: segunda
          });
          // Incrementa o historico em tempo real para evitar repetição na mesma semana
          historico[embaralhados[i].id] = (historico[embaralhados[i].id] || 0) + 1;
        }
      });
    }

    await DB.salvarEscala(rows);
    await carregarDadosSemana();
    renderizarEscala();

    if (avisos.length > 0) {
      showToast('Escala gerada! Atenção: ' + avisos.join('; '), 'error');
    } else {
      showToast('Escala gerada com sucesso!', 'success');
    }
  } catch (e) {
    showToast('Erro ao gerar escala: ' + e.message, 'error');
  } finally {
    showLoading(false);
  }
}

// ============== EXPORTAÇÃO DA ESCALA ============

/**
 * Copia a escala para o WhatsApp
 */
function copiarEscalaWhatsApp() {
  if (AppState.escalaAtual.length === 0) {
    showToast('Gere a escala primeiro.', 'error');
    return;
  }

  const porDia = {};
  AppState.escalaAtual.forEach(row => {
    if (!porDia[row.data]) porDia[row.data] = [];
    porDia[row.data].push(row);
  });

  const dias = getDiasSemana(AppState.weekOffset);
  const periodo = `${toBR(dias[0])} a ${toBR(dias[4])}`;

  let texto = `🏠 *ESCALA DE LIMPEZA*\n`;
  texto += `📅 Semana: *${periodo}*\n`;

  Object.keys(porDia).sort().forEach(data => {
    const d = new Date(data + 'T12:00:00');
    const nomeDia = DIAS_SEMANA[d.getDay()];
    texto += `\n━━━━━━━━━━━━━\n`;
    texto += `📌 *${nomeDia}, ${toBR(d)}*\n`;
    porDia[data].forEach(row => {
      const emoji = EMOJIS_LOCAIS[row.locais.nome] || '▪️';
      const primeiroNome = row.moradores.nome.split(' ')[0];
      const sobrenome = row.moradores.nome.split(' ').slice(-1)[0];
      const nomeAbrev = `${primeiroNome} ${sobrenome}`;
      texto += `${emoji} *${row.locais.nome}:* ${nomeAbrev}\n`;
    });
  });

  texto += `\n━━━━━━━━━━━━━\n`;
  texto += `📲 *Escala gerada automaticamente*\n`;
  texto += `🔗 *Mais detalhes:* ${window.location.href}\n`;

  navigator.clipboard.writeText(texto).then(() => {
    showToast('Escala copiada! Cole no grupo do WhatsApp.', 'success');
  }).catch(() => {
    showToast('Erro ao copiar. Selecione o texto manualmente.', 'error');
  });
}

/**
 * Exporta a escala para PDF
 */
function exportarEscalaPDF() {
  if (AppState.escalaAtual.length === 0) {
    showToast('Gere a escala primeiro.', 'error');
    return;
  }

  const porDia = {};
  AppState.escalaAtual.forEach(row => {
    if (!porDia[row.data]) porDia[row.data] = [];
    porDia[row.data].push(row);
  });

  const dias = getDiasSemana(AppState.weekOffset);
  const periodo = `${toBR(dias[0])} a ${toBR(dias[4])}`;

  let html = `
    <html>
    <head>
      <title>Escala de Limpeza - ${periodo}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; color: #2c3e50; }
        h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #3498db; color: white; }
        .periodo { text-align: center; font-size: 18px; color: #7f8c8d; }
      </style>
    </head>
    <body>
      <h1>🏠 Escala de Limpeza</h1>
      <p class="periodo">📅 Semana: ${periodo}</p>
  `;

  Object.keys(porDia).sort().forEach(data => {
    const d = new Date(data + 'T12:00:00');
    const nomeDia = DIAS_SEMANA[d.getDay()];
    html += `<h2>${nomeDia}, ${toBR(d)}</h2>`;
    html += `<table><tr><th>Local</th><th>Morador</th></tr>`;
    porDia[data].forEach(row => {
      const emoji = EMOJIS_LOCAIS[row.locais.nome] || '📍';
      html += `<tr><td>${emoji} ${row.locais.nome}</td><td>${row.moradores.nome}</td></tr>`;
    });
    html += `</table>`;
  });

  html += `
      <p style="text-align: center; margin-top: 30px; color: #95a5a6; font-size: 12px;">
        Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
      </p>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}

// ============== COMPARTILHAMENTO DE INDISPONIBILIDADES ============

/**
 * Compartilha link de indisponibilidades no WhatsApp
 */
async function compartilharWhatsApp() {
  const dias = getDiasSemana(AppState.weekOffset);
  const periodo = `${toBR(dias[0])} a ${toBR(dias[4])}`;
  const url = `${window.location.origin}${window.location.pathname}?semana=${toISO(dias[0])}`;
  
  const texto = `🏠 *Escalada Casa do Estudante*\n\n` +
    `📅 *Indisponibilidades da semana:* ${periodo}\n\n` +
    `Marque seus horários indisponíveis:\n` +
    `${url}\n\n` +
    `⏰ *Prazo:* até ${toBR(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000))}`;
  
  const encoded = encodeURIComponent(texto);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

// ============== FERIADOS ============

/**
 * Adiciona um feriado
 */
async function adicionarFeriado() {
  const data = document.getElementById('input-feriado-data').value;
  const descricao = document.getElementById('input-feriado-desc').value.trim();

  if (!data) { showToast('Selecione uma data.', 'error'); return; }
  if (!descricao) { showToast('Digite a descrição do feriado.', 'error'); return; }

  try {
    await DB.adicionarFeriado(data, descricao);
    document.getElementById('input-feriado-data').value = '';
    document.getElementById('input-feriado-desc').value = '';
    await carregarDadosSemana();
    renderizarFeriadosTab();
    showToast('Feriado adicionado!', 'success');
  } catch (e) {
    showToast('Erro ao adicionar feriado: ' + e.message, 'error');
  }
}

/**
 * Remove um feriado
 */
async function removerFeriado(id) {
  if (!confirm('Remover este feriado?')) return;

  try {
    await DB.removerFeriado(id);
    await carregarDadosSemana();
    renderizarFeriadosTab();
    showToast('Feriado removido!', 'success');
  } catch (e) {
    showToast('Erro ao remover feriado: ' + e.message, 'error');
  }
}

// ============== MORADORES ============

/**
 * Filtra moradores na lista
 */
function filtrarMoradores() {
  const filter = document.getElementById('input-busca-morador').value.toLowerCase();
  document.querySelectorAll('#lista-moradores .morador-item').forEach(item => {
    const nome = item.querySelector('.name')?.textContent.toLowerCase() || '';
    item.style.display = nome.includes(filter) ? '' : 'none';
  });
}

/**
 * Alterna status do morador
 */
async function alternarMorador(id, ativo) {
  try {
    await DB.alternarMorador(id, ativo);
    await carregarDadosSemana();
    renderizarMoradoresTab();
    showToast(ativo ? 'Morador ativado!' : 'Morador desativado!', 'success');
  } catch (e) {
    showToast('Erro ao alterar morador: ' + e.message, 'error');
  }
}

/**
 * Adiciona novo morador
 */
async function adicionarMorador() {
  const input = document.getElementById('input-novo-morador');
  const nome = input.value.trim();
  
  if (!nome) {
    showToast('Digite o nome do morador.', 'error');
    return;
  }

  if (nome.length < 2) {
    showToast('Nome muito curto.', 'error');
    return;
  }

  if (AppState.moradores.length >= AppState.CONFIG.MAX_MORADORES) {
    showToast(`Máximo de ${AppState.CONFIG.MAX_MORADORES} moradores atingido.`, 'error');
    return;
  }

  try {
    await DB.adicionarMorador(nome);
    input.value = '';
    await carregarDadosSemana();
    renderizarMoradoresTab();
    showToast('Morador adicionado!', 'success');
  } catch (e) {
    showToast('Erro ao adicionar morador: ' + e.message, 'error');
  }
}

// ============== CONFIGURAÇÕES ============

/**
 * Salva configuração de locais da semana
 */
async function salvarConfigLocais() {
  const dias = getDiasSemana(AppState.weekOffset);
  const segunda = toISO(dias[0]);
  const configPorDia = {};

  dias.forEach(d => {
    const iso = toISO(d);
    const checkboxesDia = document.querySelectorAll(
      `#config-locais-container input[type="checkbox"][data-dia="${iso}"]:checked`
    );
    configPorDia[iso] = Array.from(checkboxesDia).map(cb => parseInt(cb.value));
  });

  try {
    await DB.salvarConfigLocais(segunda, configPorDia);
    dias.forEach(d => {
      const iso = toISO(d);
      AppState.configLocaisSemana[iso] = [...(configPorDia[iso] || [])];
    });
    showToast('Configuração salva!', 'success');
  } catch (e) {
    showToast('Erro ao salvar configuração: ' + e.message, 'error');
  }
}

/**
 * Usa todos os locais para a semana
 */
function usarTodosLocais() {
  const checkboxes = document.querySelectorAll('#config-locais-container input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
  atualizarConfigLocais();
}

/**
 * Limpa todos os locais da semana inteira
 */
function limparTodosLocais() {
  const checkboxes = document.querySelectorAll('#config-locais-container input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  atualizarConfigLocais();
}

/**
 * Marca todos os locais de um dia específico
 */
function marcarTodosLocaisDia(diaISO) {
  const checkboxes = document.querySelectorAll(
    `#config-locais-container input[type="checkbox"][data-dia="${diaISO}"]`
  );
  checkboxes.forEach(cb => cb.checked = true);
  atualizarConfigLocais();
}

/**
 * Limpa todos os locais de um dia específico
 */
function limparLocaisDia(diaISO) {
  const checkboxes = document.querySelectorAll(
    `#config-locais-container input[type="checkbox"][data-dia="${diaISO}"]`
  );
  checkboxes.forEach(cb => cb.checked = false);
  atualizarConfigLocais();
}

/**
 * Atualiza visualização da configuração de locais
 */
function atualizarConfigLocais() {
  const totalLocais = AppState.locais.length || 0;
  const dias = getDiasSemana(AppState.weekOffset).map(toISO);

  // Atualiza estado visual de cada item (desmarcado)
  document.querySelectorAll('#config-locais-container .config-local-item').forEach(item => {
    const cb = item.querySelector('input[type="checkbox"]');
    if (!cb) return;
    item.classList.toggle('desmarcado', !cb.checked);
  });

  // Atualiza contador por dia
  dias.forEach(iso => {
    const countDia = document.querySelectorAll(
      `#config-locais-container input[type="checkbox"][data-dia="${iso}"]:checked`
    ).length;
    const countDiaEl = document.querySelector(`[data-count-dia="${iso}"]`);
    if (countDiaEl) {
      countDiaEl.textContent = `${countDia} de ${totalLocais} locais`;
    }
  });

  // Atualiza contador geral da semana
  const checkboxes = document.querySelectorAll('#config-locais-container input[type="checkbox"]:checked');
  const countEl = document.getElementById('count-locais-config');
  if (countEl) {
    countEl.textContent = `${checkboxes.length} marcações na semana`;
  }
}

// ============== UTILITÁRIOS ============

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
export {
  gerarEscala,
  copiarEscalaWhatsApp,
  exportarEscalaPDF,
  compartilharWhatsApp,
  adicionarFeriado,
  removerFeriado,
  filtrarMoradores,
  alternarMorador,
  adicionarMorador,
  salvarConfigLocais,
  usarTodosLocais,
  limparTodosLocais,
  marcarTodosLocaisDia,
  limparLocaisDia,
  atualizarConfigLocais
};
