# Corretora API

Uma API Express completa para uma plataforma de corretora de valores, com autenticação JWT, gerenciamento de portfólio e operações de compra/venda.

## 🚀 Features

- ✅ Autenticação com JWT
- ✅ Gerenciamento de usuários (depósito, saque, transações)
- ✅ Catálogo de ações com busca
- ✅ Portfólio com cálculo de ganhos/perdas
- ✅ Sistema de ordens (compra/venda)
- ✅ Watchlist de ações
- ✅ Validação com Zod
- ✅ Logging com Pino
- ✅ Banco de dados PostgreSQL (driver `pg`, pool de conexões)
- ✅ TypeScript completo

## 📋 Arquitetura

```
src/
├── config/          # Configurações (database)
├── controllers/     # Controllers das rotas
├── middlewares/     # Middlewares (auth, validation)
├── routes/         # Definição das rotas
├── schemas/        # Schemas Zod para validação
├── services/       # Lógica de negócio
├── utils/          # Utilidades (logger)
├── app.ts          # Configuração Express
├── index.ts        # Arquivo de entrada
└── seed.ts         # Seed do banco de dados
```

## 🛠 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
```

## 🏃 Rodando a API

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

### Type checking
```bash
npm run typecheck
```

## 📚 Endpoints

### Health
- `GET /api/health` - Verifica saúde da API

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login
- `POST /api/auth/change-password` - Alterar senha (requer autenticação)
- `POST /api/auth/reset-password` - Resetar senha

### Usuários
- `GET /api/users/me` - Obter dados do usuário (requer autenticação)
- `POST /api/users/me/deposit` - Depositar dinheiro (requer autenticação)
- `POST /api/users/me/withdraw` - Sacar dinheiro (requer autenticação)
- `GET /api/users/me/transactions` - Obter transações (requer autenticação)

### Ações (Stocks)
- `GET /api/stocks` - Listar todas as ações
- `GET /api/stocks/:id` - Obter ação por ID
- `GET /api/stocks/symbol/:symbol` - Obter ação por símbolo
- `GET /api/stocks/search?q=query` - Buscar ações
- `POST /api/stocks` - Criar nova ação
- `PATCH /api/stocks/:id/price` - Atualizar preço da ação

### Portfólio
- `GET /api/portfolio` - Obter portfólio do usuário (requer autenticação)
- `GET /api/portfolio/:stockId` - Obter posição específica (requer autenticação)

### Ordens
- `GET /api/orders` - Listar ordens do usuário (requer autenticação)
- `POST /api/orders` - Criar nova ordem (requer autenticação)
- `GET /api/orders/history` - Histórico de ordens (requer autenticação)

### Watchlist
- `GET /api/watchlist` - Obter watchlist (requer autenticação)
- `POST /api/watchlist` - Adicionar à watchlist (requer autenticação)
- `DELETE /api/watchlist/:stockId` - Remover de watchlist (requer autenticação)

## 📝 Exemplos de Requisição

### Registrar usuário
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "password": "senha123"
  }'
```

### Fazer login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "password": "senha123"
  }'
```

### Depositar dinheiro
```bash
curl -X POST http://localhost:3000/api/users/me/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 1000
  }'
```

### Criar ordem de compra
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "stockId": 1,
    "type": "BUY",
    "quantity": 10,
    "price": 27.45
  }'
```

### Obter portfólio
```bash
curl -X GET http://localhost:3000/api/portfolio \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔐 Autenticação

A API usa JWT para autenticação. Após fazer login, você receberá um token que deve ser enviado no header:

```
Authorization: Bearer <seu_token>
```

O token expira em 7 dias.

## 📊 Banco de Dados

A API usa PostgreSQL via o driver `pg`. As tabelas são criadas automaticamente (CREATE TABLE IF NOT EXISTS) na inicialização do servidor, desde que a variável `DATABASE_URL` aponte para um banco PostgreSQL válido.

Para desenvolvimento local, você pode rodar um Postgres com Docker:

```bash
docker run --name corretora-db -e POSTGRES_PASSWORD=senha -e POSTGRES_DB=corretora -p 5432:5432 -d postgres:16
```

E então definir no `.env`:

```
DATABASE_URL=postgresql://postgres:senha@localhost:5432/corretora
```

Em produção no Render, crie um banco PostgreSQL gratuito no dashboard (ou use o `render.yaml` incluído, que já provisiona o banco e injeta `DATABASE_URL` automaticamente no serviço web).

### Tabelas
- `users` - Usuários da plataforma
- `stocks` - Ações disponíveis
- `portfolio` - Posições dos usuários
- `orders` - Ordens de compra/venda
- `transactions` - Histórico de transações
- `watchlist` - Ações favoritas dos usuários

## 📦 Dependências Principais

- **Express** - Framework web
- **Zod** - Validação de schemas
- **JWT** - Autenticação
- **bcryptjs** - Hash de senhas
- **Pino** - Logging
- **pg** - Driver PostgreSQL
- **TypeScript** - Type safety

## 🔧 Variáveis de Ambiente

```
PORT - Porta do servidor (padrão: 3000)
NODE_ENV - Ambiente (development/production)
LOG_LEVEL - Nível de logging (debug/info/warn/error)
JWT_SECRET - Chave secreta para JWT
DATABASE_URL - String de conexão do PostgreSQL (ex: postgresql://usuario:senha@host:5432/banco)
CORS_ORIGIN - Origem CORS permitida
```

## 📄 Licença

MIT

## 👨‍💻 Autor

Desenvolvido com ❤️

---

**Nota**: Em produção, mude a `JWT_SECRET` para uma chave segura e forte!
