let moradores = [];
let locais = [];
let feriados = [];
let weekOffset = 0;
let escalaAtual = [];
let indisponibilidadesAtual = [];
let configLocaisSemana = {}; // { 'YYYY-MM-DD': [local_id, ...] }
let activeTab = 'escala';

const EMOJIS_LOCAIS = {
  'Lavanderias': '🧺',
  'Área Externa | Águas': '💧',
  'Corredor 3º': '3️⃣',
  'Corredor 2º': '2️⃣',
  'Corredor 1º': '1️⃣',
  'Escadas': '🪜',
  'Banheiros | Sala de estudo': '🚿',
  'Hall': '🚪',
  'Cozinha': '🍳'
};

// ============================================================
// AUTENTICAÇÃO
// ============================================================

function verificarAuth() {
  const auth = sessionStorage.getItem('admin_auth');
  if (auth === 'ok') {
    document.getElementById('modal-login').classList.add('hidden');
    inicializar();
  } else {
    document.getElementById('modal-login').classList.remove('hidden');
  }
}

function tentarLogin() {
  const senha = document.getElementById('input-senha').value;
  if (senha === CONFIG.ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', 'ok');
    document.getElementById('modal-login').classList.add('hidden');
    document.getElementById('erro-senha').classList.add('hidden');
    inicializar();
  } else {
    document.getElementById('erro-senha').classList.remove('hidden');
    document.getElementById('input-senha').value = '';
    document.getElementById('input-senha').focus();
  }
}

function logout() {
  sessionStorage.removeItem('admin_auth');
  location.reload();
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function inicializar() {
  showLoading(true);
  try {
    [moradores, locais, feriados] = await Promise.all([
      DB.getMoradores(),
      DB.getLocais(),
      DB.getFeriados()
    ]);
    atualizarNavSemana();
    await carregarDadosSemana();
    mudarTab('escala');
  } catch (e) {
    showToast('Erro ao carregar dados.', 'error');
  } finally {
    showLoading(false);
  }
}

// ============================================================
// NAVEGAÇÃO DE SEMANAS
// ============================================================

function semanaAnterior() { weekOffset--; trocarSemana(); }
function proximaSemana() { weekOffset++; trocarSemana(); }

async function trocarSemana() {
  atualizarNavSemana();
  showLoading(true);
  try {
    await carregarDadosSemana();
    mudarTab(activeTab); // re-renderiza qualquer aba que estiver ativa
  } catch (e) {
    showToast('Erro ao carregar dados da semana.', 'error');
  } finally {
    showLoading(false);
  }
}

function atualizarNavSemana() {
  const dias = DateUtil.getDiasSemana(weekOffset);
  const label = `${DateUtil.toBR(dias[0])} a ${DateUtil.toBR(dias[4])} de ${dias[0].getFullYear()}`;
  document.getElementById('week-label').textContent = label;
}

function getWeekRange() {
  const dias = DateUtil.getDiasSemana(weekOffset);
  return [DateUtil.toISO(dias[0]), DateUtil.toISO(dias[4])];
}

function getDiasUteis() {
  const feriadosISO = new Set(feriados.map(f => f.data));
  return DateUtil.getDiasSemana(weekOffset).filter(d => !feriadosISO.has(DateUtil.toISO(d)));
}

async function carregarDadosSemana() {
  const [start, end] = getWeekRange();
  const segunda = DateUtil.toISO(DateUtil.getDiasSemana(weekOffset)[0]);

  // Config é carregada separadamente: se a tabela ainda não existe (migração pendente),
  // o app continua funcionando normalmente sem a feature de config
  let config = {};
  try {
    config = await DB.getConfigLocaisSemana(segunda);
  } catch (e) {
    console.warn('Tabela config_locais_semana indisponível. Execute supabase-migration-01.sql.');
  }

  [escalaAtual, indisponibilidadesAtual] = await Promise.all([
    DB.getEscala(start, end),
    DB.getIndisponibilidades(start, end)
  ]);
  configLocaisSemana = config;
}

// ============================================================
// TABS
// ============================================================

function mudarTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `tab-${tab}`);
  });
  if (tab === 'escala') renderizarEscalaTab();
  if (tab === 'feriados') renderizarFeriadosTab();
  if (tab === 'moradores') renderizarMoradoresTab();
  if (tab === 'config') renderizarConfigTab();
}

// ============================================================
// ABA ESCALA
// ============================================================

function renderizarEscalaTab() {
  renderizarResumoIndisponibilidades();
  renderizarEscala();
}

function renderizarResumoIndisponibilidades() {
  const feriadosISO = new Set(feriados.map(f => f.data));
  const feriadoMap = {};
  feriados.forEach(f => { feriadoMap[f.data] = f.descricao; });

  // Mapa: data -> nomes dos moradores indisponíveis
  const indispMap = {};
  indisponibilidadesAtual.forEach(i => {
    if (!indispMap[i.data]) indispMap[i.data] = [];
    indispMap[i.data].push(i.moradores.nome);
  });

  const container = document.getElementById('resumo-indisponibilidades');
  container.innerHTML = '';

  DateUtil.getDiasSemana(weekOffset).forEach(d => {
    const iso = DateUtil.toISO(d);
    const ehFeriado = feriadosISO.has(iso);
    const card = document.createElement('div');
    card.className = `unavail-day-card${ehFeriado ? ' holiday-card' : ''}`;

    const nomeDia = DateUtil.DIAS_CURTO[d.getDay()];
    const header = document.createElement('h4');
    header.textContent = `${nomeDia} ${DateUtil.toBR(d)}${ehFeriado ? ' 🏖️' : ''}`;
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
  const moradorRespondeu = new Set(indisponibilidadesAtual.map(i => i.morador_id));
  // Moradores que responderam = que têm ao menos 1 registro nessa semana
  // Mas também moradores que não marcaram nada também "responderam" se submeteram
  // Como não temos flag de "submeteu", mostramos só quem marcou indisponibilidade
  const totalAtivos = moradores.filter(m => m.ativo).length;
  document.getElementById('contagem-respostas').textContent =
    `${moradorRespondeu.size} de ${totalAtivos} moradores marcaram indisponibilidade`;
}

function renderizarEscala() {
  const container = document.getElementById('escala-container');
  const actionsEl = document.getElementById('escala-actions');

  if (escalaAtual.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhuma escala gerada para esta semana.</p>';
    actionsEl.innerHTML = `
      <button class="btn btn-primary" onclick="gerarEscala()">⚡ Gerar Escala</button>
    `;
    return;
  }

  // Agrupar por data
  const porDia = {};
  escalaAtual.forEach(row => {
    if (!porDia[row.data]) porDia[row.data] = [];
    porDia[row.data].push(row);
  });

  let html = '';
  Object.keys(porDia).sort().forEach(data => {
    const d = new Date(data + 'T12:00:00');
    html += `<div class="escala-dia">`;
    html += `<h3 class="escala-dia-titulo">${DateUtil.DIAS_SEMANA[d.getDay()]}, ${DateUtil.toBR(d)}</h3>`;
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
    <button class="btn btn-success" onclick="copiarWhatsapp()">📋 Copiar para WhatsApp</button>
    <button class="btn btn-secondary" onclick="gerarEscala(true)">🔄 Regenerar</button>
  `;
}

async function gerarEscala(forcar = false) {
  const diasUteis = getDiasUteis();
  if (diasUteis.length === 0) {
    showToast('Não há dias úteis nesta semana.', 'error');
    return;
  }

  if (!forcar && escalaAtual.length > 0) {
    if (!confirm('Já existe uma escala para esta semana. Deseja regenerar?')) return;
  }

  showLoading(true);
  try {
    const [start, end] = getWeekRange();
    await DB.deletarEscala(start, end);

    const historico = await DB.getContagemHistorico();
    const segunda = DateUtil.toISO(DateUtil.getDiasSemana(weekOffset)[0]);

    // Mapa indisponibilidades: data -> Set de morador_ids
    const indispMap = {};
    indisponibilidadesAtual.forEach(i => {
      if (!indispMap[i.data]) indispMap[i.data] = new Set();
      indispMap[i.data].add(i.morador_id);
    });

    const moradorAtivos = moradores.filter(m => m.ativo);
    const rows = [];
    let avisos = [];

    for (const dia of diasUteis) {
      const iso = DateUtil.toISO(dia);
      const indispHoje = indispMap[iso] || new Set();

      // Locais ativos para este dia (config ou todos)
      const idsConfigurados = configLocaisSemana[iso];
      const locaisHoje = idsConfigurados && idsConfigurados.length > 0
        ? locais.filter(l => idsConfigurados.includes(l.id))
        : locais;

      const disponiveis = moradorAtivos.filter(m => !indispHoje.has(m.id));

      if (disponiveis.length < locaisHoje.length) {
        avisos.push(`${DateUtil.DIAS_CURTO[dia.getDay()]} ${DateUtil.toBR(dia)}: apenas ${disponiveis.length} disponíveis para ${locaisHoje.length} locais`);
      }

      // Ordenar por menos aparições no histórico (com aleatoriedade nos empates)
      const ordenados = [...disponiveis].sort((a, b) => {
        const diff = (historico[a.id] || 0) - (historico[b.id] || 0);
        return diff !== 0 ? diff : Math.random() - 0.5;
      });

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

function copiarWhatsapp() {
  if (escalaAtual.length === 0) { showToast('Gere a escala primeiro.', 'error'); return; }

  const porDia = {};
  escalaAtual.forEach(row => {
    if (!porDia[row.data]) porDia[row.data] = [];
    porDia[row.data].push(row);
  });

  const dias = DateUtil.getDiasSemana(weekOffset);
  const periodo = `${DateUtil.toBR(dias[0])} a ${DateUtil.toBR(dias[4])}`;

  let texto = `🏠 *ESCALA DE LIMPEZA*\n`;
  texto += `📅 Semana: *${periodo}*\n`;

  Object.keys(porDia).sort().forEach(data => {
    const d = new Date(data + 'T12:00:00');
    const nomeDia = DateUtil.DIAS_SEMANA[d.getDay()];
    texto += `\n━━━━━━━━━━━━━\n`;
    texto += `📌 *${nomeDia}, ${DateUtil.toBR(d)}*\n`;
    porDia[data].forEach(row => {
      const emoji = EMOJIS_LOCAIS[row.locais.nome] || '▪️';
      const primeiroNome = row.moradores.nome.split(' ')[0];
      const sobrenome = row.moradores.nome.split(' ').slice(-1)[0];
      const nomeAbrev = `${primeiroNome} ${sobrenome}`;
      texto += `${emoji} ${row.locais.nome} → ${nomeAbrev}\n`;
    });
  });

  navigator.clipboard.writeText(texto).then(() => {
    showToast('Texto copiado! Cole no WhatsApp.', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = texto;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Texto copiado! Cole no WhatsApp.', 'success');
  });
}

// ============================================================
// ABA FERIADOS
// ============================================================

function renderizarFeriadosTab() {
  const container = document.getElementById('lista-feriados');
  container.innerHTML = '';

  if (feriados.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhum feriado cadastrado.</p>';
    return;
  }

  feriados.forEach(f => {
    const d = new Date(f.data + 'T12:00:00');
    const item = document.createElement('div');
    item.className = 'feriado-item';
    item.innerHTML = `
      <span class="date">${DateUtil.toBRFull(d)}</span>
      <span class="desc">${f.descricao || ''}</span>
      <button class="btn btn-sm btn-danger" onclick="removerFeriado(${f.id})">Remover</button>
    `;
    container.appendChild(item);
  });
}

async function adicionarFeriado() {
  const dataInput = document.getElementById('input-feriado-data');
  const descInput = document.getElementById('input-feriado-desc');
  const data = dataInput.value;
  const descricao = descInput.value.trim();

  if (!data) { showToast('Informe a data do feriado.', 'error'); return; }

  showLoading(true);
  try {
    await DB.addFeriado(data, descricao);
    feriados = await DB.getFeriados();
    dataInput.value = '';
    descInput.value = '';
    renderizarFeriadosTab();
    showToast('Feriado adicionado!', 'success');
  } catch (e) {
    showToast('Erro ao adicionar feriado.', 'error');
  } finally {
    showLoading(false);
  }
}

async function removerFeriado(id) {
  if (!confirm('Remover este feriado?')) return;
  showLoading(true);
  try {
    await DB.removeFeriado(id);
    feriados = await DB.getFeriados();
    renderizarFeriadosTab();
    showToast('Feriado removido.', 'success');
  } catch (e) {
    showToast('Erro ao remover feriado.', 'error');
  } finally {
    showLoading(false);
  }
}

// ============================================================
// ABA MORADORES
// ============================================================

function renderizarMoradoresTab() {
  document.getElementById('contagem-moradores').textContent =
    `${moradores.filter(m => m.ativo).length} ativos de ${moradores.length}`;

  const container = document.getElementById('lista-moradores');
  container.innerHTML = '';

  moradores.forEach(m => {
    const item = document.createElement('div');
    item.className = `morador-item${m.ativo ? '' : ' inactive'}`;
    item.innerHTML = `
      <span class="name">${m.nome}</span>
      <label class="toggle">
        <input type="checkbox" ${m.ativo ? 'checked' : ''}
          onchange="alternarMorador(${m.id}, this.checked)">
        <span class="toggle-track"></span>
        <span class="toggle-thumb"></span>
      </label>
    `;
    container.appendChild(item);
  });
}

async function alternarMorador(id, ativo) {
  try {
    await DB.toggleMorador(id, ativo);
    moradores = await DB.getMoradores();
    renderizarMoradoresTab();
  } catch (e) {
    showToast('Erro ao atualizar morador.', 'error');
    moradores = await DB.getMoradores();
    renderizarMoradoresTab();
  }
}

async function adicionarMorador() {
  const input = document.getElementById('input-novo-morador');
  const nome = input.value.trim();
  if (!nome) { showToast('Informe o nome do morador.', 'error'); return; }

  showLoading(true);
  try {
    await DB.addMorador(nome);
    moradores = await DB.getMoradores();
    input.value = '';
    renderizarMoradoresTab();
    showToast(`${nome} adicionado!`, 'success');
  } catch (e) {
    showToast('Erro ao adicionar. Nome já existe?', 'error');
  } finally {
    showLoading(false);
  }
}

// ============================================================
// ABA CONFIGURAÇÃO DE LOCAIS
// ============================================================

function renderizarConfigTab() {
  const diasUteis = getDiasUteis();
  const feriadosISO = new Set(feriados.map(f => f.data));
  const container = document.getElementById('config-locais-container');
  container.innerHTML = '';

  if (diasUteis.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhum dia útil nesta semana.</p>';
    return;
  }

  diasUteis.forEach(d => {
    const iso = DateUtil.toISO(d);
    const idsAtivos = configLocaisSemana[iso]; // undefined = nenhuma config salva = todos ativos
    const nomeDia = DateUtil.DIAS_SEMANA[d.getDay()];

    const card = document.createElement('div');
    card.className = 'card config-dia-card';
    card.dataset.dia = iso;

    let html = `<h4 class="config-dia-titulo">${nomeDia}, ${DateUtil.toBR(d)}</h4>`;
    html += `<div class="config-locais-grid">`;

    locais.forEach(local => {
      const checked = !idsAtivos || idsAtivos.includes(local.id);
      const emoji = EMOJIS_LOCAIS[local.nome] || '📍';
      html += `<label class="config-local-item${checked ? '' : ' desmarcado'}">
        <input type="checkbox" data-local-id="${local.id}" ${checked ? 'checked' : ''}
          onchange="this.closest('.config-local-item').classList.toggle('desmarcado', !this.checked)">
        <span>${emoji} ${local.nome}</span>
      </label>`;
    });

    html += `</div>`;
    card.innerHTML = html;
    container.appendChild(card);
  });
}

async function salvarConfigLocais() {
  const diasUteis = getDiasUteis();
  const segunda = DateUtil.toISO(DateUtil.getDiasSemana(weekOffset)[0]);
  const configPorDia = {};

  diasUteis.forEach(d => {
    const iso = DateUtil.toISO(d);
    const card = document.querySelector(`.config-dia-card[data-dia="${iso}"]`);
    if (!card) return;
    const checkboxes = card.querySelectorAll('input[type="checkbox"]');
    const localIds = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.dataset.localId));
    configPorDia[iso] = localIds;
  });

  showLoading(true);
  try {
    const diasISO = diasUteis.map(d => DateUtil.toISO(d));
    await DB.salvarConfigLocaisSemana(segunda, diasISO, configPorDia);
    configLocaisSemana = await DB.getConfigLocaisSemana(segunda);
    showToast('Configuração salva!', 'success');
  } catch (e) {
    showToast('Erro ao salvar configuração.', 'error');
  } finally {
    showLoading(false);
  }
}

function usarTodosLocais() {
  document.querySelectorAll('.config-dia-card input[type="checkbox"]').forEach(cb => {
    cb.checked = true;
    cb.closest('.config-local-item').classList.remove('desmarcado');
  });
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  verificarAuth();

  document.getElementById('input-senha').addEventListener('keydown', e => {
    if (e.key === 'Enter') tentarLogin();
  });
});
