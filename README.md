# 📦 Pedidu Interno

Sistema de gestão interno desenvolvido com **Laravel** + **React** + **shadcn/ui**, focado em gerenciamento de clientes, serviços e pedidos.

---

## 🚀 Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Laravel 11 (PHP) |
| Frontend | React 18 + Vite |
| UI Components | shadcn/ui + Tailwind CSS |
| Autenticação | Laravel Session (web guard) |
| Banco de Dados | MySQL |
| Estilização | Tailwind CSS + DM Sans |
| HTTP Client | Axios |
| Ícones | Font Awesome 6 |

---

## 📋 Módulos

### 🔐 Autenticação
- Login e logout com validação de sessão
- Recuperação de senha por e-mail
- Verificação de e-mail no cadastro
- Bloqueio de conta por inatividade

### 📊 Dashboard
- Cards de resumo: total de usuários, clientes, serviços e categorias
- Visão geral do sistema em tempo real

### 👥 Usuários
- CRUD completo de usuários administrativos
- Controle de roles (Admin / Usuário)
- Toggle ativo/inativo e exclusão lógica (soft delete)

### 🏢 Clientes
- Cadastro de Pessoa Física (CPF) e Pessoa Jurídica (CNPJ)
- Auto-preenchimento via **BrasilAPI** e **ViaCEP**
- Agrupamento de clientes por grupo
- Toggle ativo/inativo e exclusão lógica

### 👥 Grupos de Clientes
- CRUD de grupos para segmentação de clientes

### 📦 Serviços / Produtos
- CRUD completo com categorização
- Sistema de cobrança flexível:
  - **Gratuito**
  - **Uma Vez** (pagamento único)
  - **Recorrente** (mensal, trimestral, semestral, anual)

### 🏷️ Categorias
- CRUD de categorias vinculadas a serviços

### 📄 Pedidos
- Criação de pedidos com múltiplos itens
- Seleção de ciclo de cobrança por item
- Aplicação de cupons de desconto (percentual ou fixo)
- Controle de status: Pendente → Confirmado → Cancelado
- Visualização de pedidos agrupados por cliente

### 💳 Formas de Pagamento
- CRUD de formas de pagamento disponíveis

### 👤 Perfil
- Alteração de senha com indicador de força
- Exclusão de conta com confirmação

---

## ⚙️ Instalação e Configuração

### Pré-requisitos
- PHP >= 8.2
- Composer
- Node.js >= 18
- MySQL

### Passo a Passo

**1. Clone o repositório**
```bash
git clone https://github.com/seu-usuario/pedidu-interno.git
cd pedidu-interno
```

**2. Instale as dependências PHP**
```bash
composer install
```

**3. Instale as dependências Node**
```bash
npm install
```

**4. Configure o ambiente**
```bash
cp .env.example .env
php artisan key:generate
```

**5. Configure o banco de dados no `.env`**
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pedidu_interno
DB_USERNAME=root
DB_PASSWORD=
```

**6. Execute as migrations**
```bash
php artisan migrate
```

**7. Compile os assets**
```bash
npm run dev
```

**8. Inicie o servidor**
```bash
php artisan serve
```

Acesse em: `http://127.0.0.1:8000`

---

## 🗂️ Estrutura de Branches

| Branch | Descrição |
|---|---|
| `main` | Código principal estável |
| `feature/autenticacao` | Sistema de autenticação |
| `feature/dashboard` | Dashboard e métricas |
| `feature/usuarios` | Módulo de usuários |
| `feature/clientes` | Módulo de clientes e grupos |
| `feature/catalogo` | Serviços e categorias |
| `feature/pedidos` | Módulo de pedidos |
| `feature/perfil` | Perfil do usuário |

---

## 🔑 Variáveis de Ambiente Importantes

```env
APP_NAME="Pedidu Interno"
APP_ENV=local
APP_URL=http://127.0.0.1:8000

MAIL_MAILER=smtp
MAIL_HOST=seu-smtp
MAIL_PORT=587
MAIL_USERNAME=seu-email
MAIL_PASSWORD=sua-senha
MAIL_FROM_ADDRESS=noreply@seudominio.com
MAIL_FROM_NAME="Pedidu Interno"
```

---

## 📁 Estrutura Frontend

```
resources/js/
├── pages/
│   ├── Clients/         # Telas de clientes
│   ├── Orders/          # Telas de pedidos
│   ├── Users/           # Telas de usuários
│   ├── Services/        # Telas de serviços
│   ├── Categories/      # Telas de categorias
│   ├── PaymentMethods/  # Formas de pagamento
│   ├── Dashboard/       # Dashboard
│   └── Profile/         # Perfil do usuário
├── components/
│   ├── ui/              # Componentes shadcn/ui
│   └── Sidebar.jsx      # Sidebar global
└── *.jsx                # Entry points por módulo
```

---

## 👨‍💻 Desenvolvido por

**Arthur** — Sistema interno de gestão de clientes e pedidos.
