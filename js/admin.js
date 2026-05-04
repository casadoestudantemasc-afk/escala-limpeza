/**
 * Admin.js - Versão Modularizada
 * Arquivo principal que importa todos os módulos
 */

import { AppState, EMOJIS_LOCAIS, DIAS_SEMANA, DIAS_CURTO } from './modules/state.js';
import { getDiasSemana, toISO, toBR, getDiasUteis, getWeekRange } from './modules/dateUtil.js';
import DB, { _sb } from './modules/db.js';
import { showToast, showLoading, mudarTab, atualizarNavSemana, shuffle } from './modules/uiUtils.js';
import {
  renderizarEscalaTab,
  renderizarEscala,
  renderizarResumoIndisponibilidades,
  renderizarMoradoresTab,
  renderizarFeriadosTab,
  renderizarConfigTab
} from './modules/render.js';
import {
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
  atualizarConfigLocais
} from './modules/escala.js';

// Expor DB para funções que precisam dele
window.DB = DB;

// ============== VARIÁVEIS GLOBAIS ============
let weekOffset = 0;
let escalaAtual = [];
let indisponibilidadesAtual = [];
let configLocaisSemana = {};
let feriados = [];
let locais = [];
let moradores = [];

// ============== INICIALIZAÇÃO ============

/**
 * Inicializa o modo escuro
 */
function initDarkMode() {
  const saved = localStorage.getItem('darkMode');
  if (saved === 'true') {
    document.body.classList.add('dark-mode');
    const toggle = document.getElementById('dark-mode-toggle') || document.getElementById('btn-dark-mode');
    if (toggle) {
      toggle.innerHTML = '☀️';
      toggle.title = 'Modo claro';
    }
  }
}

/**
 * Alterna modo escuro
 */
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark);
  
  const toggle = document.getElementById('dark-mode-toggle') || document.getElementById('btn-dark-mode');
  if (toggle) {
    toggle.innerHTML = isDark ? '☀️' : '🌙';
    toggle.title = isDark ? 'Modo claro' : 'Modo escuro';
  }
}

// ============== AUTENTICAÇÃO ============

async function tentarLogin() {
  const password = document.getElementById('admin-password').value;
  if (!password) return;

  showLoading(true, 'Autenticando...');
  const { error } = await _sb.auth.signInWithPassword({
    email: 'casadoestudantemasc@gmail.com',
    password
  });
  showLoading(false);

  if (error) {
    document.getElementById('admin-password').value = '';
    document.getElementById('erro-senha').classList.remove('hidden');
    setTimeout(() => document.getElementById('erro-senha').classList.add('hidden'), 3000);
  } else {
    mostrarAdmin();
    await carregarDadosSemana();
    atualizarNavSemana();
    mudarTab('escala');
  }
}

async function logout() {
  await _sb.auth.signOut();
  mostrarLogin();
}

// ============== NAVEGAÇÃO DA SEMANA ============

function semanaAnterior() {
  weekOffset--;
  AppState.weekOffset = weekOffset;
  trocarSemana();
}

function proximaSemana() {
  weekOffset++;
  AppState.weekOffset = weekOffset;
  trocarSemana();
}

/**
 * Alterna para semana diferente
 */
async function trocarSemana() {
  // Carregar dados da semana
  await carregarDadosSemana();
  atualizarNavSemana();
  
  // Atualizar abas
  const activeTab = document.querySelector('.tab-btn.active');
  if (activeTab) {
    const tabName = activeTab.getAttribute('onclick').match(/'([^']+)'/)[1];
    mudarTab(tabName);
  }
}

// ============== CARREGAMENTO DE DADOS ============

/**
 * Carrega todos os dados da semana
 */
async function carregarDadosSemana() {
  showLoading(true, 'Carregando dados da semana...');
  try {
    AppState.weekOffset = weekOffset;

    const [start, end] = getWeekRange(weekOffset);
    const dias = getDiasSemana(weekOffset);
    const segunda = toISO(dias[0]);

    // Carregar dados base
    [moradores, locais, feriados] = await Promise.all([
      DB.getMoradores(),
      DB.getLocais(),
      DB.getFeriados()
    ]);

    // Carregar dados da semana
    [escalaAtual, indisponibilidadesAtual, configLocaisSemana] = await Promise.all([
      DB.getEscala(start, end),
      DB.getIndisponibilidades(start, end),
      DB.getConfigLocaisSemana(segunda)
    ]);

    // Sincronizar estado utilizado pelos módulos de render e regras
    AppState.moradores = moradores;
    AppState.locais = locais;
    AppState.feriados = feriados;
    AppState.escalaAtual = escalaAtual;
    AppState.indisponibilidadesAtual = indisponibilidadesAtual;
    AppState.configLocaisSemana = configLocaisSemana || {};

    // Backward compatibility para funções globais legadas
    window.weekOffset = AppState.weekOffset;
    window.moradores = AppState.moradores;
    window.locais = AppState.locais;
    window.feriados = AppState.feriados;
    window.escalaAtual = AppState.escalaAtual;
    window.indisponibilidadesAtual = AppState.indisponibilidadesAtual;
    window.configLocaisSemana = AppState.configLocaisSemana;

  } catch (e) {
    showToast('Erro ao carregar dados: ' + e.message, 'error');
  } finally {
    showLoading(false);
  }
}

// ============== EXPOSIÇÃO GLOBAL (backward compatibility) ============

// Expor funções para onclick inline
window.mudarTab = mudarTab;
window.semanaAnterior = semanaAnterior;
window.proximaSemana = proximaSemana;
window.toggleDarkMode = toggleDarkMode;
window.tentarLogin = tentarLogin;
window.logout = logout;
window.carregarDadosSemana = carregarDadosSemana;
window.trocarSemana = trocarSemana;

// Renderização
window.renderizarEscalaTab = renderizarEscalaTab;
window.renderizarResumoIndisponibilidades = renderizarResumoIndisponibilidades;
window.renderizarEscala = renderizarEscala;
window.renderizarMoradoresTab = renderizarMoradoresTab;
window.renderizarFeriadosTab = renderizarFeriadosTab;
window.renderizarConfigTab = renderizarConfigTab;

// Geração de escala
window.gerarEscala = gerarEscala;
window.copiarEscalaWhatsApp = copiarEscalaWhatsApp;
window.exportarEscalaPDF = exportarEscalaPDF;
window.compartilharWhatsApp = compartilharWhatsApp;

// Feriados
window.adicionarFeriado = adicionarFeriado;
window.removerFeriado = removerFeriado;

// Moradores
window.filtrarMoradores = filtrarMoradores;
window.alternarMorador = alternarMorador;
window.adicionarMorador = adicionarMorador;

// Configurações
window.salvarConfigLocais = salvarConfigLocais;
window.usarTodosLocais = usarTodosLocais;
window.atualizarConfigLocais = atualizarConfigLocais;

// Estado global
window.AppState = AppState;
window.EMOJIS_LOCAIS = EMOJIS_LOCAIS;
window.DIAS_SEMANA = DIAS_SEMANA;
window.DIAS_CURTO = DIAS_CURTO;
window.weekOffset = weekOffset;
window.escalaAtual = escalaAtual;
window.indisponibilidadesAtual = indisponibilidadesAtual;
window.configLocaisSemana = configLocaisSemana;
window.feriados = feriados;
window.locais = locais;
window.moradores = moradores;

// Utilitários
window.getWeekRange = getWeekRange;
window.getDiasUteis = getDiasUteis;
window.getDiasSemana = getDiasSemana;
window.toISO = toISO;
window.toBR = toBR;
window.showToast = showToast;
window.showLoading = showLoading;
window.shuffle = shuffle;
window.DB = DB;

// ============== ATALHOS DE TECLADO ============

function initAtalhos() {
  document.addEventListener('keydown', (e) => {
    // Não capturar se estiver em input
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    switch(e.key) {
      case '1': mudarTab('escala'); break;
      case '2': mudarTab('indisponibilidades'); break;
      case '3': mudarTab('moradores'); break;
      case '4': mudarTab('feriados'); break;
      case '5': mudarTab('config'); break;
      case 'ArrowLeft': semanaAnterior(); break;
      case 'ArrowRight': proximaSemana(); break;
      case 'g': gerarEscala(); break;
      case 'G': gerarEscala(true); break;
      case 'c': copiarEscalaWhatsApp(); break;
      case 'p': exportarEscalaPDF(); break;
      case 'd': toggleDarkMode(); break;
      case 's': salvarConfigLocais(); break;
      case 'l': logout(); break;
      case 'Escape':
        document.getElementById('loading').style.display = 'none';
        break;
    }
  });
}

// ============== FUNÇÕES DE UI ============

function mostrarLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-panel').style.display = 'none';
}

function mostrarAdmin() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
}

// ============== INICIALIZAÇÃO PRINCIPAL ============

async function inicializar() {
  initDarkMode();
  initAtalhos();

  const { data } = await _sb.auth.getSession();
  if (data.session) {
    mostrarAdmin();
    await carregarDadosSemana();
    atualizarNavSemana();
    mudarTab('escala');
  } else {
    mostrarLogin();
  }
}

// Iniciar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
