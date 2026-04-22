const _sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const DB = {

  async getMoradores() {
    const { data, error } = await _sb
      .from('moradores')
      .select('*')
      .order('nome');
    if (error) throw error;
    return data;
  },

  async getMoradoresAtivos() {
    const { data, error } = await _sb
      .from('moradores')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return data;
  },

  async getLocais() {
    const { data, error } = await _sb
      .from('locais')
      .select('*')
      .order('ordem');
    if (error) throw error;
    return data;
  },

  async getFeriados() {
    const { data, error } = await _sb
      .from('feriados')
      .select('*')
      .order('data');
    if (error) throw error;
    return data;
  },

  async addFeriado(data, descricao) {
    const { error } = await _sb.from('feriados').insert({ data, descricao });
    if (error) throw error;
  },

  async removeFeriado(id) {
    const { error } = await _sb.from('feriados').delete().eq('id', id);
    if (error) throw error;
  },

  async getIndisponibilidades(startDate, endDate) {
    const { data, error } = await _sb
      .from('indisponibilidades')
      .select('*, moradores(nome)')
      .gte('data', startDate)
      .lte('data', endDate);
    if (error) throw error;
    return data;
  },

  async getIndisponibilidadesMorador(moradorId, startDate, endDate) {
    const { data, error } = await _sb
      .from('indisponibilidades')
      .select('data')
      .eq('morador_id', moradorId)
      .gte('data', startDate)
      .lte('data', endDate);
    if (error) throw error;
    return data.map(r => r.data);
  },

  async salvarIndisponibilidades(moradorId, datas, startDate, endDate) {
    const { error: delError } = await _sb
      .from('indisponibilidades')
      .delete()
      .eq('morador_id', moradorId)
      .gte('data', startDate)
      .lte('data', endDate);
    if (delError) throw delError;

    if (datas.length === 0) return;

    const rows = datas.map(data => ({ morador_id: moradorId, data }));
    const { error } = await _sb.from('indisponibilidades').insert(rows);
    if (error) throw error;
  },

  async getEscala(startDate, endDate) {
    const { data, error } = await _sb
      .from('escala')
      .select('*, moradores(nome), locais(nome, ordem)')
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data');
    if (error) throw error;
    // Supabase JS não suporta order por tabela relacionada; ordenar localmente
    data.sort((a, b) => {
      if (a.data < b.data) return -1;
      if (a.data > b.data) return 1;
      return (a.locais?.ordem ?? 0) - (b.locais?.ordem ?? 0);
    });
    return data;
  },

  async salvarEscala(rows) {
    const { error } = await _sb.from('escala').insert(rows);
    if (error) throw error;
  },

  async deletarEscala(startDate, endDate) {
    const { error } = await _sb
      .from('escala')
      .delete()
      .gte('data', startDate)
      .lte('data', endDate);
    if (error) throw error;
  },

  async getContagemHistorico() {
    // Limite alto: ~45 entradas/semana × 52 semanas = ~2340/ano; 50000 cobre ~21 anos
    const { data, error } = await _sb
      .from('escala')
      .select('morador_id')
      .limit(50000);
    if (error) throw error;
    const counts = {};
    data.forEach(r => {
      counts[r.morador_id] = (counts[r.morador_id] || 0) + 1;
    });
    return counts;
  },

  async toggleMorador(id, ativo) {
    const { error } = await _sb.from('moradores').update({ ativo }).eq('id', id);
    if (error) throw error;
  },

  async addMorador(nome) {
    const { error } = await _sb.from('moradores').insert({ nome });
    if (error) throw error;
  },

  // Retorna mapa { 'YYYY-MM-DD': [local_id, ...] } para a semana
  async getConfigLocaisSemana(semana) {
    const { data, error } = await _sb
      .from('config_locais_semana')
      .select('dia, local_id')
      .eq('semana', semana);
    if (error) throw error;
    const map = {};
    data.forEach(r => {
      if (!map[r.dia]) map[r.dia] = [];
      map[r.dia].push(r.local_id);
    });
    return map;
  },

  // Salva config de todos os dias da semana de uma vez
  async salvarConfigLocaisSemana(semana, dias, configPorDia) {
    // Remove toda a config da semana em uma única requisição
    const { error: delError } = await _sb
      .from('config_locais_semana')
      .delete()
      .in('dia', dias);
    if (delError) throw delError;

    const rows = [];
    for (const [dia, localIds] of Object.entries(configPorDia)) {
      localIds.forEach(local_id => rows.push({ semana, dia, local_id }));
    }
    if (rows.length === 0) return;
    const { error } = await _sb.from('config_locais_semana').insert(rows);
    if (error) throw error;
  }

};

// Utilitários de data
const DateUtil = {
  // Retorna a segunda-feira da semana para uma data
  getSegunda(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  // Retorna array de datas Seg-Sex para uma semana (offset em semanas)
  getDiasSemana(offset = 0) {
    const segunda = this.getSegunda();
    segunda.setDate(segunda.getDate() + offset * 7);
    const dias = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(segunda);
      d.setDate(segunda.getDate() + i);
      dias.push(d);
    }
    return dias;
  },

  // Formata Date para 'YYYY-MM-DD'
  toISO(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // Formata Date para 'DD/MM'
  toBR(date) {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  },

  // Formata Date para 'DD/MM/YYYY'
  toBRFull(date) {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  },

  DIAS_SEMANA: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
  DIAS_CURTO: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
};

// Utilitários gerais
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast${type ? ' ' + type : ''}`;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 3500);
}

function showLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
}
