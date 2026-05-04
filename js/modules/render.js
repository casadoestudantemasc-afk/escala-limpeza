/**
 * Módulo de Renderização
 * Centraliza todas as funções de renderização da UI
 */

import { AppState, EMOJIS_LOCAIS, DIAS_SEMANA, DIAS_CURTO } from './state.js';
import { getDiasSemana, toISO, toBR } from './dateUtil.js';
import DB from './db.js';

// ============== RENDERIZAÇÃO DA ESCALA ============

/**
 * Renderiza a aba de escala
 */
function renderizarEscalaTab() {
  renderizarEscala();
}

/**
 * Renderiza a tabela de escala
 */
function renderizarEscala() {
  const container = document.getElementById('escala-container');
  const actionsEl = document.getElementById('escala-actions');

  if (!container || !actionsEl) return;

  if (AppState.escalaAtual.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhuma escala gerada para esta semana.</p>';
    actionsEl.innerHTML = `
      <button class="btn btn-primary" onclick="gerarEscala()">⚡ Gerar Escala</button>
    `;
    return;
  }

  // Agrupar por data
  const porDia = {};
  AppState.escalaAtual.forEach(row => {
    if (!porDia[row.data]) porDia[row.data] = [];
    porDia[row.data].push(row);
  });

  let html = '';
  Object.keys(porDia).sort().forEach(data => {
    const d = new Date(data + 'T12:00:00');
    html += `<div class="escala-dia">`;
    html += `<h3 class="escala-dia-titulo">${DIAS_SEMANA[d.getDay()]}, ${toBR(d)}</h3>`;
    html += `<table class="schedule-table"><tbody>`;
    porDia[data].forEach(row => {
      const emoji = EMOJIS_LOCAIS[row.locais.nome] || '📍';
      html += `<tr>
        <td class="td-local">${emoji} ${row.locais.nome}</td>
        <td class="td-morador">${row.moradores.nome}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  });

  container.innerHTML = html;
  actionsEl.innerHTML = `
    <button class="btn btn-success" onclick="copiarEscalaWhatsApp()">📋 Copiar para WhatsApp</button>
    <button class="btn btn-primary" onclick="exportarEscalaPDF()">📄 Exportar PDF</button>
    <button class="btn btn-secondary" onclick="gerarEscala(true)">🔄 Regenerar</button>
  `;
}

// ============== RENDERIZAÇÃO DE INDISPONIBILIDADES ============

/**
 * Renderiza o resumo de indisponibilidades
 */
function renderizarResumoIndisponibilidades() {
  const container = document.getElementById('resumo-indisponibilidades');
  if (!container) return;

  container.innerHTML = '';

  const feriadosISO = new Set(AppState.feriados.map(f => f.data));
  const feriadoMap = {};
  AppState.feriados.forEach(f => {
    feriadoMap[f.data] = f.descricao;
  });

  // Mapa de data -> nomes de moradores
  const indispMap = {};
  AppState.indisponibilidadesAtual.forEach(i => {
    if (!indispMap[i.data]) indispMap[i.data] = [];
    indispMap[i.data].push(i.moradores?.nome || i.morador_nome);
  });

  getDiasSemana(AppState.weekOffset).forEach(d => {
    const iso = toISO(d);
    const ehFeriado = feriadosISO.has(iso);
    const card = document.createElement('div');
    card.className = `unavail-day-card${ehFeriado ? ' holiday-card' : ''}`;

    const nomeDia = DIAS_CURTO[d.getDay()];
    const header = document.createElement('h4');
    header.textContent = `${nomeDia} ${toBR(d)}${ehFeriado ? ' 🏖️' : ''}`;
    card.appendChild(header);

    if (ehFeriado) {
      const desc = document.createElement('p');
      desc.className = 'no-unavail';
      desc.textContent = feriadoMap[iso] || 'Feriado';
      card.appendChild(desc);
    } else {
      const nomes = indispMap[iso] || [];
      if (nomes.length === 0) {
        const p = document.createElement('p');
        p.className = 'no-unavail';
        p.textContent = 'Ninguém marcou';
        card.appendChild(p);
      } else {
        nomes.forEach(nome => {
          const p = document.createElement('p');
          p.className = 'unavail-name';
          p.textContent = nome.split(' ').slice(0, 2).join(' ');
          card.appendChild(p);
        });
      }
    }

    container.appendChild(card);
  });

  // Atualizar contagem de respostas
  const moradorRespondeu = new Set(AppState.indisponibilidadesAtual.map(i => i.morador_id));
  const totalAtivos = AppState.moradores.filter(m => m.ativo).length;
  const contagemEl = document.getElementById('contagem-respostas');
  if (contagemEl) {
    contagemEl.textContent = `${moradorRespondeu.size} de ${totalAtivos} moradores marcaram indisponibilidade`;
  }
}

// ============== RENDERIZAÇÃO DE MORADORES ============

/**
 * Renderiza a aba de moradores
 */
function renderizarMoradoresTab() {
  const container = document.getElementById('lista-moradores');
  if (!container) return;

  let html = '';
  AppState.moradores.forEach(morador => {
    html += `
      <div class="morador-item${morador.ativo ? '' : ' inactive'}">
        <span class="name">${morador.nome}</span>
        <label class="toggle">
          <input type="checkbox" ${morador.ativo ? 'checked' : ''} onchange="alternarMorador(${morador.id}, this.checked)">
          <span class="toggle-track"></span>
          <span class="toggle-thumb"></span>
        </label>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ============== RENDERIZAÇÃO DE FERIADOS ============

/**
 * Renderiza a aba de feriados
 */
function renderizarFeriadosTab() {
  const container = document.getElementById('lista-feriados');
  if (!container) return;

  if (AppState.feriados.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhum feriado cadastrado.</p>';
    return;
  }

  let html = '';
  AppState.feriados.forEach(feriado => {
    const d = new Date(feriado.data + 'T12:00:00');
    html += `
      <div class="feriado-item">
        <span class="date">${toBR(d)}</span>
        <span class="desc">${feriado.descricao}</span>
        <button class="btn btn-sm btn-danger" onclick="removerFeriado(${feriado.id})">Remover</button>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ============== RENDERIZAÇÃO DE CONFIGURAÇÕES ============

/**
 * Renderiza a aba de configurações
 */
function renderizarConfigTab() {
  const container = document.getElementById('config-locais-container');
  if (!container) return;

  const dias = getDiasSemana(AppState.weekOffset);
  const segunda = toISO(dias[0]);
  const locaisConfigurados = AppState.configLocaisSemana[segunda] || [];

  let html = `<p class="config-hint">Selecione os locais ativos para esta semana (padrão: todos):</p>`;
  html += `<div class="locais-config-grid">`;
  
  AppState.locais.forEach(local => {
    const isChecked = locaisConfigurados.includes(local.id) ? 'checked' : '';
    const emoji = EMOJIS_LOCAIS[local.nome] || '📍';
    html += `
      <label class="locais-config-item">
        <input type="checkbox" value="${local.id}" ${isChecked} onchange="atualizarConfigLocais()">
        <span class="locais-config-emoji">${emoji}</span>
        <span class="locais-config-nome">${local.nome}</span>
      </label>
    `;
  });
  
  html += `</div>`;
  html += `
    <button class="btn btn-secondary" onclick="usarTodosLocais()">Usar todos os locais</button>
    <button class="btn btn-primary" onclick="salvarConfigLocais()">💾 Salvar Configuração</button>
  `;

  container.innerHTML = html;
}

// Exportação
export {
  renderizarEscalaTab,
  renderizarEscala,
  renderizarResumoIndisponibilidades,
  renderizarMoradoresTab,
  renderizarFeriadosTab,
  renderizarConfigTab
};
