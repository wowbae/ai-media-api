# AI Media API - Project Context

## Project Overview

**AI Media API** is a full-stack media generation platform that provides AI-powered image and video generation capabilities through multiple providers (Wavespeed AI, Kie.ai, LaoZhang, OpenRouter). The application features a React frontend with TanStack Router, an Express.js backend, PostgreSQL database with Prisma ORM, and Telegram bot integration.

### Core Features

- **Media Generation**: Image-to-image, video generation, LoRA training via multiple AI providers
- **User Authentication**: JWT-based auth with email password reset
- **Token System**: Credit-based payment system for media generation
- **Telegram Integration**: Bot for notifications and media group management
- **Task Tracking**: Background job system for async media generation polling

## Tech Stack

| Category         | Technology                                            |
| ---------------- | ----------------------------------------------------- |
| **Frontend**     | React 19, TypeScript, TanStack Router, TanStack Start |
| **Styling**      | Tailwind CSS v4, shadcn/ui, Radix UI                  |
| **Backend**      | Node.js, Express 5, TypeScript                        |
| **Database**     | PostgreSQL, Prisma ORM                                |
| **Runtime**      | Bun (preferred), Node.js                              |
| **Build**        | Vite 7, Vitest                                        |
| **AI Providers** | Wavespeed AI, Kie.ai, LaoZhang, OpenRouter            |
| **Bot**          | Grammy (Telegram Bot Framework)                       |

## Project Structure

```
ai-media-api/
├── src/                    # Frontend React application
│   ├── components/         # UI components (custom, media, ui)
│   ├── hooks/              # React hooks
│   ├── redux/              # Redux state management
│   ├── routes/             # TanStack Router routes
│   ├── lib/                # Utilities
│   └── data/               # Data layer
├── server/                 # Backend Express application
│   ├── features/           # Feature modules
│   │   ├── ai/             # AI assistant config
│   │   ├── auth/           # Authentication
│   │   ├── media/          # Media generation core
│   │   ├── telegram/       # Telegram bot
│   │   └── tokens/         # Token management
│   ├── routes.ts           # Route registration
│   ├── config.ts           # Server configuration
│   └── init.ts             # Server entry point
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── migrations/         # Database migrations
│   └── client.ts           # Prisma client
├── ai-media/               # Media storage (images, videos, loras)
├── docs/
│   ├── tasks/todo.md       # Main task checklist
│   ├── tech/               # Technical documentation
│   └── archive/            # Archived docs
└── .cursor/rules/
    └── lessons.md          # Agent lessons (mandatory updates)
```

## Building and Running

### Prerequisites

- **Runtime**: Bun (recommended) or Node.js 20+
- **Database**: PostgreSQL 14+
- **Environment**: Copy `.env.example` to `.env` and configure

### Installation

```bash
# Install dependencies (Bun)
bun install

# Install dependencies (npm)
npm install
```

### Development

```bash
# Start both frontend dev server and backend watcher
bun run dev

# Frontend only (Vite dev server on port 3000)
bunx vite dev

# Backend only (Express on port 4000)
bun --watch server/init.ts
```

### Production Build

```bash
# Build frontend
bun run build

# Start production server
bun run start:prod
```

### Database Commands

```bash
# Generate Prisma client
bunx prisma generate

# Run migrations
bunx prisma migrate deploy

# Create new migration
bunx prisma migrate dev --name <migration_name>

# Open Prisma Studio
bunx prisma studio
```

### Testing

```bash
# Run tests
bun run test
```

### Type Checking

```bash
# TypeScript check
bunx tsc --noEmit
```

## Environment Configuration

Key environment variables (see `.env.example`):

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_media_db"

# AI Providers
OPENROUTER_API_KEY="..."
WAVESPEED_API_KEY="..."
KIEAI_API_KEY="..."
LAOZHANG_API_KEY="..."

# Telegram
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_MEDIA_GROUP_ID="..."

# Auth
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"

# Server
PORT=4000
APP_URL="http://localhost:3000"
VITE_API_URL="http://localhost:4000/api/media"

# Media Storage
MEDIA_STORAGE_PATH="ai-media"
MAX_FILE_SIZE_MB=50
MEDIA_PUBLIC_BASE_URL="https://your-ngrok-url.ngrok.io"  # For external access
```

## Development Conventions

### Code Style

- **Functional programming** over heavy OOP
- **Early returns** to reduce nesting, happy path at the end
- **State-oriented names**: `isLoading`, `hasError`, `hasData`
- **Directory naming**: lowercase kebab-case (`components/auth-wizard`)
- **File limit**: ~500 lines, split into smaller modules when needed
- **Comments**: Preserve existing comments during edits, add high-value comments only

### TypeScript

- **Strict mode** required
- **No `any`** type allowed
- **Prefer `interface`** for object contracts
- **`const` objects with `as const`** instead of `enum` where practical
- **Functional components** with interface-based props

### React & Styling

- **Tailwind CSS only** (no CSS files)
- **Linear gradients** via utility classes, not `gradient-*` utilities
- **shadcn/ui** component patterns
- **Named exports** for components

### Architecture

- **Low coupling, high cohesion** modules
- **Early validation** and error handling
- **Shared constants** for cross-cutting values (AI model names, Telegram IDs)
- **Singleton pattern** only when it reduces complexity

### Mandatory Workflow

1. **Task Planning**: Create todo-list before implementation for non-trivial tasks
2. **Verification**: Never mark done without evidence (tests, logs, direct checks)
3. **Lessons Update**: After each task, update `.cursor/rules/lessons.md` with:
    - Context, mistake, root cause
    - Prevention rule
    - Checklist item
4. **Main Task Document**: Track tasks in `docs/tasks/todo.md`

### Package Manager

- **Prefer `bun`** over `npm` when project supports it

## Database Schema

Key entities:

- **User**: Authentication, token balance, role (USER/ADMIN)
- **MediaChat**: Chat sessions for media generation
- **MediaRequest**: Generation requests with prompt, model, status
- **MediaFile**: Generated media files (local paths + external URLs)
- **TokenTransaction**: Credit transactions (TOPUP, SPEND, REFUND, BONUS)
- **TelegramGroup**: Linked Telegram groups for notifications

## API Endpoints

| Endpoint                   | Description                        |
| -------------------------- | ---------------------------------- |
| `POST /api/auth/*`         | Authentication routes              |
| `GET/POST /api/media/*`    | Media generation, file management  |
| `GET/POST /api/telegram/*` | Telegram bot webhooks              |
| `/media-files/*`           | Static media file serving (cached) |

## AI Provider Models

Supported providers and model types:

- **Wavespeed AI**: Image generation, video (WAN 2.2, Kling), LoRA training
- **Kie.ai**: Nano Banana Pro, Seedream editing
- **LaoZhang**: Google Native image generation
- **OpenRouter**: Multi-provider routing

Model configurations and payload mappings are in `server/features/media/providers/`.

## Important Notes

- **Media Storage**: Files stored in `ai-media/` directory, served via `/media-files/` with 7-day cache
- **Task Tracking**: Background service polls async generation tasks, handles recovery on restart
- **Telegram Bot**: Optional, initialized only if `TELEGRAM_BOT_TOKEN` is set
- **Ngrok/Media URLs**: Use `MEDIA_PUBLIC_BASE_URL` for external provider access to local files
- **Body Limits**: Default 150MB for video base64 payloads (adjust via `BODY_LIMIT_MB`)

## Common Issues & Solutions

| Issue                               | Solution                                            |
| ----------------------------------- | --------------------------------------------------- |
| Port already in use                 | Check running processes, use different PORT         |
| Media files 404 in prod             | Set `MEDIA_PUBLIC_BASE_URL` to public domain        |
| Task stuck in PENDING               | Check TaskTrackingService logs, provider API status |
| LoRA URL broken after ngrok restart | Use relative paths `/media-files/loras/*`           |
