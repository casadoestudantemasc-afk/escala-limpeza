/**
 * Módulo de Banco de Dados (Supabase)
 * Centraliza todas as operações de banco de dados
 */

const _sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

export { _sb };

/**
 * Retorna os 5 dias (Seg-Sex) de uma semana em ISO.
 */
function getDiasISOdaSemana(segunda) {
  const base = new Date(`${segunda}T12:00:00`);
  const dias = [];

  for (let i = 0; i < 5; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dias.push(d.toISOString().slice(0, 10));
  }

  return dias;
}

const DB = {
  /**
   * Carrega todos os moradores ativos
   */
  async getMoradores() {
    const { data, error } = await _sb
      .from('moradores')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    
    if (error) throw error;
    return data;
  },

  /**
   * Carrega todos os locais
   */
  async getLocais() {
    const { data, error } = await _sb
      .from('locais')
      .select('*')
      .order('ordem');
    
    if (error) throw error;
    return data;
  },

  /**
   * Carrega feriados
   */
  async getFeriados() {
    const { data, error } = await _sb
      .from('feriados')
      .select('*')
      .order('data');
    
    if (error) throw error;
    return data;
  },

  /**
   * Obtém escala da semana
   */
  async getEscala(start, end) {
    const { data, error } = await _sb
      .from('escala')
      .select(`
        *,
        moradores (id, nome),
        locais (id, nome, ordem)
      `)
      .gte('data', start)
      .lte('data', end)
      .order('data');

    if (error) throw error;

    data.sort((a, b) => {
      if (a.data < b.data) return -1;
      if (a.data > b.data) return 1;
      return (a.locais?.ordem ?? 0) - (b.locais?.ordem ?? 0);
    });
    return data;
  },

  /**
   * Obtém indisponibilidades da semana
   */
  async getIndisponibilidades(start, end) {
    const { data, error } = await _sb
      .from('indisponibilidades')
      .select(`
        *,
        moradores (id, nome)
      `)
      .gte('data', start)
      .lte('data', end)
      .order('data');
    
    if (error) throw error;
    return data;
  },

  /**
   * Salva escala da semana
   */
  async salvarEscala(rows) {
    const { error } = await _sb
      .from('escala')
      .upsert(rows, { onConflict: ['morador_id', 'local_id', 'data'] });
    
    if (error) throw error;
  },

  /**
   * Deleta escala da semana
   */
  async deletarEscala(start, end) {
    const { error } = await _sb
      .from('escala')
      .delete()
      .gte('data', start)
      .lte('data', end);
    
    if (error) throw error;
  },

  /**
   * Obtém contagem histórica de aparições por morador
   */
  async getContagemHistorico() {
    const { data, error } = await _sb
      .from('escala')
      .select('morador_id')
      .gte('semana', '2025-01-01');
    
    if (error) throw error;
    
    const contagem = {};
    data.forEach(row => {
      contagem[row.morador_id] = (contagem[row.morador_id] || 0) + 1;
    });
    return contagem;
  },

  /**
   * Salva configuração de locais por semana
   */
  async getConfigLocaisSemana(segunda) {
    const diasSemana = getDiasISOdaSemana(segunda);

    try {
      // Schema atual: uma linha por local/dia (semana, dia, local_id)
      const { data, error } = await _sb
        .from('config_locais_semana')
        .select('dia, local_id')
        .eq('semana', segunda);

      if (!error) {
        const map = {};
        (data || []).forEach(row => {
          if (!map[row.dia]) map[row.dia] = [];
          map[row.dia].push(row.local_id);
        });
        return map;
      }

      // Fallback para schema legado: uma linha por semana com array "locais"
      const { data: legado, error: legadoError } = await _sb
        .from('config_locais_semana')
        .select('locais')
        .eq('semana', segunda)
        .maybeSingle();

      if (legadoError) throw legadoError;

      const locais = legado?.locais || [];
      const map = {};
      diasSemana.forEach(dia => {
        map[dia] = [...locais];
      });
      return map;
    } catch (e) {
      // Tabela não existe ainda (migração pendente)
      console.warn('Tabela config_locais_semana indisponível ou incompatível', e);
      return {};
    }
  },

  /**
   * Salva configuração de locais por semana
   */
  async salvarConfigLocais(segunda, locais) {
    const diasSemana = getDiasISOdaSemana(segunda);

    try {
      // Schema atual: uma linha por dia/local.
      const { error: delError } = await _sb
        .from('config_locais_semana')
        .delete()
        .eq('semana', segunda);
      if (delError) throw delError;

      if (!Array.isArray(locais) || locais.length === 0) return;

      const rows = [];
      diasSemana.forEach(dia => {
        locais.forEach(localId => {
          rows.push({ semana: segunda, dia, local_id: localId });
        });
      });

      const { error } = await _sb.from('config_locais_semana').insert(rows);
      if (error) throw error;
    } catch (schemaAtualError) {
      // Fallback para schema legado: um registro por semana com coluna array.
      const { error: legadoError } = await _sb
        .from('config_locais_semana')
        .upsert({ semana: segunda, locais }, { onConflict: 'semana' });

      if (legadoError) throw schemaAtualError;
    }
  },

  /**
   * Adiciona morador
   */
  async adicionarMorador(nome) {
    const { data, error } = await _sb
      .from('moradores')
      .insert([{ nome, ativo: true }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Alterna status do morador
   */
  async alternarMorador(id, ativo) {
    const { error } = await _sb
      .from('moradores')
      .update({ ativo })
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * Adiciona feriado
   */
  async adicionarFeriado(data, descricao) {
    const { data: feriado, error } = await _sb
      .from('feriados')
      .insert([{ data, descricao }])
      .select()
      .single();
    
    if (error) throw error;
    return feriado;
  },

  /**
   * Remove feriado
   */
  async removerFeriado(id) {
    const { error } = await _sb
      .from('feriados')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

export default DB;
