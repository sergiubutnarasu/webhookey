# Webhookey

A self-hosted webhook proxy with SSE streaming, HMAC verification, OAuth 2.0 Device Login Flow, and a CLI/dashboard for managing channels.

## Quick Start

### Prerequisites

- Node.js >=22
- Docker and Docker Compose
- Yarn 4

### Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd webhookey

# Install dependencies
corepack enable
yarn install

# Set up environment
cp apps/server/.env.example apps/server/.env
# Edit apps/server/.env with your secrets

# Start PostgreSQL
docker compose up postgres -d

# Run migrations
cd apps/server
npx prisma migrate dev
npx prisma db seed

# Start development servers
yarn dev
```

### Docker Deployment

```bash
# Create .env file with required variables
cat > .env << EOF
MASTER_KEY=your-master-key-min-32-characters
JWT_SECRET=your-jwt-secret-min-32-characters
BASE_URL=http://localhost:3000
WEB_ORIGIN=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF

# Start all services
docker compose up -d
```

### CLI Usage

```bash
# Install globally
npm install -g @webhookey/cli

# Or run from source
cd apps/cli
yarn build
./bin/run.js login
```

### Commands

| Command | Description |
|---------|-------------|
| `webhookey login` | Authenticate via device flow |
| `webhookey logout` | Clear stored credentials |
| `webhookey new <name>` | Create a new channel |
| `webhookey remove <name>` | Remove a channel |
| `webhookey ls` | List your channels |
| `webhookey whoami` | Show current user |
| `webhookey listen <name> -- <cmd>` | Listen for webhooks and execute commands |
| `webhookey config set-url <url>` | Target a self-hosted instance |

### Self-Hosting Guide

Webhookey uses two API URLs:

- `NEXT_PUBLIC_API_URL` - Public-facing URL for browser API calls (build-time)
- `INTERNAL_API_URL` - Internal Docker network URL for server-side rendering (runtime)

In `compose.yml`:
- `NEXT_PUBLIC_API_URL` is passed as a build arg to the web service
- `INTERNAL_API_URL` is set to `http://server:3000` for container-to-container communication

## Architecture

```
Webhook POST /hooks/{slug}
        │
        ▼
  HooksService
        │
        ▼
pubClient.publish("hook:{slug}")
        │
        ▼
    ┌─ Redis ─┐
    │  Channel  │
    └──────────┘
        │
    ┌───┴───┐
    ▼       ▼
 Server1  Server2  (behind load balancer)
    │       │
 subClient.on('message')
    │       │
    ▼       ▼
 Local   Local
 Subjects Subjects
    │       │
    ▼       ▼
  SSE     SSE
```

## License

MIT
