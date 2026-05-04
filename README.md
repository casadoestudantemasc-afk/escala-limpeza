# 🏠 Escala de Limpeza — Casa do Estudante

Sistema web para gerenciar escalas de limpeza rotativas para casas de estudantes.

## ✨ Funcionalidades

### Para Moradores
- **📱 Visualização responsiva** — Escala da semana atual acessível por link público
- **📋 Formato WhatsApp** — Copia escala formatada com emojis para compartilhar
- **📅 Navegação por semana** — Veja semanas anteriores e futuras

### Para Síndico/Admin
- **🔐 Painel administrativo** — Login protegido por senha
- **⚡ Geração automática** — Algoritmo distribui limpeza igualmente entre moradores
- **🚫 Indisponibilidades** — Marque ausências (viagens, férias, etc.)
- **🏖️ Gestão de feriados** — Cadastre feriados para excluir da escala
- **👥 Gestão de moradores** — Adicionar/remover/ativar-desativar moradores
- **📍 Configuração de locais** — Defina quais locais participam de cada dia
- **🌙 Modo escuro** — Toggle entre tema claro e escuro
- **📄 Exportar PDF** — Imprima a escala em formato A4
- **🔍 Busca de moradores** — Filtre lista por nome
- **⌨️ Atalhos de teclado** — `Ctrl+K` busca, `Ctrl+D` dark mode, `Ctrl+E` gerar, `Ctrl+P` PDF, `Ctrl+S` WhatsApp

## 🚀 Instalação

### 1. Banco de Dados (Supabase)

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Execute o SQL do arquivo `supabase-migration-01.sql` em **SQL Editor**

### 2. Configuração

Edite `js/config.js` com suas credenciais:

```javascript
const CONFIG = {
  SUPABASE_URL: 'https://SEU-Projeto.supabase.co',
  SUPABASE_ANON_KEY: 'sua-chave-anon',
  ADMIN_PASSWORD: 'sua-senha-aqui',  // Altere!
  SEMANA_INICIO: 'monday'  // ou 'sunday'
};
```

### 3. Hospedagem

Deploy em qualquer serviço estático:

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod --dir=.

# GitHub Pages
gh-pages -d .
```

Ou simplesmente abra `admin.html` e `index.html` localmente.

## 📁 Estrutura do Projeto

```
├── index.html              # Página pública (moradores)
├── admin.html              # Painel administrativo
├── escala-impressao.html   # Página de impressão/PDF
├── style.css               # Estilos globais
├── style-admin.css         # Estilos do admin
├── js/
│   ├── config.js           # Configurações
│   ├── db.js               # Camada de banco (Supabase)
│   ├── admin.js            # Lógica do painel admin
│   └── index.js            # Lógica da página pública
├── supabase-migration-01.sql  # Schema do banco
└── README.md               # Este arquivo
```

## ⌨️ Atalhos de Teclado (Admin)

| Atalho | Ação |
|--------|------|
| `Ctrl + K` | Focar busca de moradores |
| `Ctrl + D` | Alternar modo escuro |
| `Ctrl + E` | Gerar escala |
| `Ctrl + P` | Exportar PDF |
| `Ctrl + S` | Compartilhar WhatsApp |
| `Ctrl + Enter` | Adicionar morador (no input) |
| `Escape` | Fechar loading |

## 🔧 Algoritmo de Escala

O algoritmo segue estas regras:

1. **Distribuição igualitária** — Cada morador recebe o mesmo número de dias
2. **Respeita indisponibilidades** — Não escala ausentes
3. **Evita dias consecutivos** — Máximo 1 dia seguido
4. **Rotação justa** — Considera histórico de escalas anteriores
5. **Feriados excluídos** — Dias de feriado não geram escala

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Ícones**: Emojis nativos
- **Fonte**: Inter (Google Fonts)
- **Deploy**: Qualquer hospedagem estática

## 📱 Compatibilidade

- ✅ Chrome/Edge (desktop e mobile)
- ✅ Firefox (desktop e mobile)
- ✅ Safari (iOS e macOS)
- ✅ Opera

## 🔒 Segurança

- Senha do admin configurável em `config.js`
- Dados sensíveis não expostos no frontend
- Chave anon do Supabase com RLS (Row Level Security)

## 📝 Licença

MIT License

## 🤝 Contribuindo

1. Fork o projeto
2. Crie branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Abra Pull Request

---

**Feito com ❤️ para a Casa do Estudante**
