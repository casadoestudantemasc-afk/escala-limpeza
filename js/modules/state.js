/**
 * Módulo de Gerenciamento de Estado Global
 * Centraliza todas as variáveis de estado e fornece métodos de acesso
 */

// ============== ESTADO GLOBAL ============
const AppState = {
  // Dados principais
  moradores: [],
  locais: [],
  feriados: [],
  
  // Estado da semana
  weekOffset: 0,
  escalaAtual: [],
  indisponibilidadesAtual: [],
  configLocaisSemana: {},
  
  // Estado da UI
  activeTab: 'escala',
  
  // Configurações
  CONFIG: {
    MAX_MORADORES: 200,
    DEFAULT_LOCAIS: [
      'Lavanderias',
      'Área Externa | Águas',
      'Corredor 3º',
      'Corredor 2º',
      'Corredor 1º',
      'Escadas',
      'Banheiros | Sala de estudo',
      'Hall',
      'Cozinha'
    ]
  }
};

// ============== CONSTANTES ============
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

const DIAS_SEMANA = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

const DIAS_CURTO = [
  'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'
];

// ============== EXPORTAÇÃO ============
export { AppState, EMOJIS_LOCAIS, DIAS_SEMANA, DIAS_CURTO };
