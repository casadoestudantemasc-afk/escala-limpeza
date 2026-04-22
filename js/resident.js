let moradores = [];
let feriados = [];
let selectedMorador = null;
let weekOffset = 0;
let diasSemana = [];

async function init() {
  showLoading(true);
  try {
    [moradores, feriados] = await Promise.all([
      DB.getMoradoresAtivos(),
      DB.getFeriados()
    ]);
    setupBusca();
    // Sugere próxima semana se for qui/sex
    const dow = new Date().getDay();
    if (dow >= 4) weekOffset = 1;
  } catch (e) {
    showToast('Erro ao carregar dados. Tente novamente.', 'error');
  } finally {
    showLoading(false);
  }
}

function setupBusca() {
  const input = document.getElementById('search-input');
  const suggestions = document.getElementById('suggestions');

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    suggestions.innerHTML = '';
    if (!q) { suggestions.classList.add('hidden'); return; }

    const matches = moradores.filter(m => m.nome.toLowerCase().includes(q));
    if (matches.length === 0) { suggestions.classList.add('hidden'); return; }

    matches.forEach(m => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.textContent = m.nome;
      div.addEventListener('click', () => selecionarMorador(m));
      suggestions.appendChild(div);
    });
    suggestions.classList.remove('hidden');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#search-input') && !e.target.closest('#suggestions')) {
      suggestions.classList.add('hidden');
    }
  });
}

function selecionarMorador(m) {
  selectedMorador = m;
  document.getElementById('search-input').value = '';
  document.getElementById('suggestions').classList.add('hidden');
  document.getElementById('selected-text').textContent = m.nome;
  document.getElementById('selected-name').classList.remove('hidden');
  mostrarEtapaSemana();
}

function clearName() {
  selectedMorador = null;
  document.getElementById('selected-name').classList.add('hidden');
  document.getElementById('step-week').classList.add('hidden');
  document.getElementById('step-availability').classList.add('hidden');
}

function mostrarEtapaSemana() {
  const stepWeek = document.getElementById('step-week');
  stepWeek.classList.remove('hidden');
  atualizarTabsSemana();
  selecionarSemana(weekOffset);
}

function atualizarTabsSemana() {
  document.getElementById('tab-current').classList.toggle('active', weekOffset === 0);
  document.getElementById('tab-next').classList.toggle('active', weekOffset === 1);
}

async function selecionarSemana(offset) {
  weekOffset = offset;
  atualizarTabsSemana();
  diasSemana = DateUtil.getDiasSemana(offset);
  const feriadosISO = feriados.map(f => f.data);
  const diasUteis = diasSemana.filter(d => !feriadosISO.includes(DateUtil.toISO(d)));

  const inicio = DateUtil.toBR(diasSemana[0]);
  const fim = DateUtil.toBR(diasSemana[4]);
  document.getElementById('week-label').textContent = `${inicio} a ${fim}`;

  if (diasUteis.length === 0) {
    showToast('Semana inteira com feriados. Escolha outra semana.', 'error');
    document.getElementById('step-availability').classList.add('hidden');
    return;
  }

  await carregarDisponibilidade();
}

async function carregarDisponibilidade() {
  if (!selectedMorador) return;
  showLoading(true);
  try {
    const start = DateUtil.toISO(diasSemana[0]);
    const end = DateUtil.toISO(diasSemana[4]);
    const indisps = await DB.getIndisponibilidadesMorador(selectedMorador.id, start, end);
    renderizarDias(indisps);
    document.getElementById('step-availability').classList.remove('hidden');
  } catch (e) {
    showToast('Erro ao carregar disponibilidade.', 'error');
  } finally {
    showLoading(false);
  }
}

function renderizarDias(indisps) {
  const container = document.getElementById('days-list');
  const feriadosISO = feriados.map(f => f.data);
  const feriadoMap = {};
  feriados.forEach(f => { feriadoMap[f.data] = f.descricao; });

  container.innerHTML = '';

  diasSemana.forEach(d => {
    const iso = DateUtil.toISO(d);
    const ehFeriado = feriadosISO.includes(iso);
    const indisponivel = indisps.includes(iso);
    const nomeDia = DateUtil.DIAS_SEMANA[d.getDay()];

    const item = document.createElement('label');
    item.className = `day-item${ehFeriado ? ' holiday' : ''}${indisponivel ? ' unavailable' : ''}`;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = iso;
    cb.checked = indisponivel;
    cb.disabled = ehFeriado;
    cb.addEventListener('change', () => {
      item.classList.toggle('unavailable', cb.checked);
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'day-name';
    nameSpan.textContent = nomeDia;

    const dateSpan = document.createElement('span');
    dateSpan.className = 'day-date';
    dateSpan.textContent = DateUtil.toBR(d);

    item.appendChild(cb);
    item.appendChild(nameSpan);
    item.appendChild(dateSpan);

    if (ehFeriado) {
      const badge = document.createElement('span');
      badge.className = 'holiday-badge';
      badge.textContent = feriadoMap[iso] || 'Feriado';
      item.appendChild(badge);
    }

    container.appendChild(item);
  });
}

async function salvarDisponibilidade() {
  if (!selectedMorador) return;

  const checkboxes = document.querySelectorAll('#days-list input[type="checkbox"]');
  const datasIndisponiveis = Array.from(checkboxes)
    .filter(cb => cb.checked && !cb.disabled)
    .map(cb => cb.value);

  const start = DateUtil.toISO(diasSemana[0]);
  const end = DateUtil.toISO(diasSemana[4]);

  showLoading(true);
  const btn = document.getElementById('btn-save');
  btn.disabled = true;

  try {
    await DB.salvarIndisponibilidades(selectedMorador.id, datasIndisponiveis, start, end);
    const semana = `${DateUtil.toBR(diasSemana[0])} a ${DateUtil.toBR(diasSemana[4])}`;
    if (datasIndisponiveis.length === 0) {
      document.getElementById('success-msg').textContent =
        `Você marcou disponibilidade para todos os dias da semana de ${semana}.`;
    } else {
      document.getElementById('success-msg').textContent =
        `Indisponibilidade registrada para a semana de ${semana}.`;
    }
    mostrarSucesso();
  } catch (e) {
    showToast('Erro ao salvar. Tente novamente.', 'error');
  } finally {
    showLoading(false);
    btn.disabled = false;
  }
}

function mostrarSucesso() {
  document.getElementById('step-name').classList.add('hidden');
  document.getElementById('step-week').classList.add('hidden');
  document.getElementById('step-availability').classList.add('hidden');
  document.getElementById('step-success').classList.remove('hidden');
}

function resetForm() {
  selectedMorador = null;
  weekOffset = new Date().getDay() >= 4 ? 1 : 0;
  document.getElementById('selected-name').classList.add('hidden');
  document.getElementById('search-input').value = '';
  document.getElementById('step-week').classList.add('hidden');
  document.getElementById('step-availability').classList.add('hidden');
  document.getElementById('step-success').classList.add('hidden');
  document.getElementById('step-name').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', init);
