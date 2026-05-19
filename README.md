# 🎓 LearnHub – Online Learning Platform

A production-ready, AI-powered online learning platform built with a **microservices architecture**, deployed via **Docker Compose**. Features free & paid courses, JWT authentication, an AI tutor powered by a **local Ollama LLM**, and an automated feedback pipeline via **n8n**.

---

## 📐 Architecture Overview

```
                        ┌──────────────────────────┐
                        │   API Gateway (Nginx)     │
                        │      Port 80 / 443        │
                        └──────────────┬───────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                   │
          ┌─────────┴──────┐  ┌────────┴───────┐  ┌──────┴──────────┐
          │ Learning Portal │  │ Course Service │  │  User Service   │
          │ (Next.js 14)    │  │ (FastAPI:8001) │  │ (Express:8002)  │
          │    Port 3000    │  └────────┬───────┘  └──────┬──────────┘
          └─────────────────┘          │                   │
                    │          ┌───────┴────────┐  ┌──────┴──────────┐
                    │          │  Analytics Svc │  │  AI Tutor Svc   │
                    │          │ (FastAPI:8003) │  │ (FastAPI:8004)  │
                    │          └────────┬───────┘  └──────┬──────────┘
                    │                   │                   │
                    └──────────────┬────┘                   │ Local LLM
                                   │                        │ (Ollama)
                    ┌──────────────▼──────────────┐
                    │         Datastores           │
                    │  PostgreSQL · MongoDB        │
                    │  Redis · MinIO               │
                    └──────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │       n8n Automation         │
                    │    Feedback Workflow          │
                    │    Port 5678                  │
                    └─────────────────────────────-┘
```

---

## 🗂 Project Structure

```
learning-platform/
├── docker-compose.yml          # Orchestrates all 11 containers
├── .env.example                # All environment variables (copy to .env)
│
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf              # Reverse proxy: routes /api/* to microservices
│
├── infra/
│   └── postgres/
│       └── init.sql            # Schema + seed data (categories, courses, lessons)
│
├── services/
│   ├── course-service/         # FastAPI · Port 8001
│   │   ├── main.py             # App entry point, Redis init
│   │   ├── database.py         # SQLAlchemy engine + session
│   │   ├── models.py           # ORM models: Course, Lesson, Enrollment, Review
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── auth.py             # JWT decode middleware
│   │   └── routers/
│   │       ├── courses.py      # CRUD, search, pagination, reviews
│   │       ├── lessons.py      # CRUD + progress tracking
│   │       ├── enrollments.py  # Enroll/unenroll, check, list
│   │       └── categories.py   # List + create categories
│   │
│   ├── user-service/           # Node.js/Express · Port 8002
│   │   └── src/
│   │       ├── index.js        # Express app, MongoDB connect, rate limiting
│   │       ├── models/User.js  # Mongoose schema, bcrypt hashing
│   │       ├── routes/
│   │       │   ├── auth.js     # /register /login /me /logout
│   │       │   └── users.js    # Profile CRUD, admin user management
│   │       └── middleware/
│   │           ├── auth.js     # JWT verify middleware
│   │           └── errorHandler.js
│   │
│   ├── analytics-service/      # FastAPI · Port 8003
│   │   └── main.py             # Track views/enrollments, dashboard, trends
│   │
│   ├── ai-tutor-service/       # FastAPI · Port 8004
│   │   ├── main.py             # Q&A, quiz gen, recommendations, feedback analysis
│   │   └── llm_client.py       # Local LLM (Ollama) wrapper with Redis session memory
│   │
│   └── n8n/
│       └── workflows/
│           └── feedback-workflow.json  # Import into n8n UI
│
└── frontend/                   # Next.js 14 · Port 3000
    └── src/
        ├── app/
        │   ├── page.tsx                        # Homepage (hero, featured courses)
        │   ├── courses/page.tsx                # Catalogue (search, filters, pagination)
        │   ├── courses/[id]/page.tsx           # Course detail + enroll
        │   ├── courses/[id]/lessons/[lessonId] # Lesson player + progress
        │   ├── dashboard/page.tsx              # Student learning dashboard
        │   ├── admin/page.tsx                  # Analytics dashboard (recharts)
        │   ├── login/page.tsx
        │   └── register/page.tsx
        ├── components/
        │   ├── Navbar.tsx          # Auth-aware navigation
        │   ├── CourseCard.tsx      # Reusable course card
        │   ├── AIChatWidget.tsx    # Floating AI tutor chat
        │   └── FeedbackModal.tsx   # Feedback form → n8n webhook
        ├── contexts/AuthContext.tsx # JWT auth state (localStorage)
        └── lib/
            ├── api.ts             # Axios client + all service helpers
            ├── types.ts           # TypeScript interfaces
            └── utils.ts           # cn(), formatDuration(), formatPrice()
```

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 24

### 1. Clone and configure

```bash
git clone <repo-url>
cd learning-platform

# Copy the example env and fill in your values
cp .env.example .env
```

Open `.env` and set at minimum:
```env
SMTP_USER=your_email@gmail.com      # Required for n8n email alerts
SMTP_PASS=your_app_password         # Gmail App Password (not your login password)
```

### 2. Launch everything

```bash
docker compose up --build -d
```

This starts **12 containers**: nginx, frontend, 4 microservices, postgres, mongodb, redis, minio, n8n, and ollama.

First boot takes ~3–5 minutes for images to download and build.

### 3. Verify health

```bash
# Check all containers are running
docker compose ps

# Test each service
curl http://localhost/api/courses/health
curl http://localhost/api/users/health
curl http://localhost/api/analytics/health
curl http://localhost/api/ai/health
```

### 4. Access the platform

| URL | Description |
|-----|-------------|
| http://localhost | Learning portal (Next.js) |
| http://localhost/api/courses/docs | Course Service API docs (Swagger) |
| http://localhost/api/users/health | User Service health |
| http://localhost/api/ai/docs | AI Tutor API docs |
| http://localhost:5678 | n8n automation UI |
| http://localhost:9001 | MinIO object storage console |

---

## ⚙️ Services Detail

### API Gateway (Nginx) — Port 80
Routes incoming requests:
- `/api/courses/*` → Course Service :8001
- `/api/users/*` → User Service :8002
- `/api/analytics/*` → Analytics Service :8003
- `/api/ai/*` → AI Tutor Service :8004
- `/*` → Next.js frontend :3000

### Course Service (FastAPI) — Port 8001
Manages the full course lifecycle:
- **CRUD** for courses, lessons, categories
- **Enrollment** management with duplicate prevention
- **Lesson progress** tracking (per-user, per-lesson)
- **Reviews** with one-review-per-user constraint
- **Redis caching** for course lists (5-min TTL)
- **Role-based access**: only instructors/admins can create courses

### User Service (Node.js/Express) — Port 8002
Handles identity:
- **JWT issuance** on register/login (HS256, 7-day expiry)
- **bcrypt** password hashing (12 rounds)
- **Token blacklisting** in Redis on logout
- **Rate limiting**: 20 auth requests / 15 min
- **Roles**: `student` · `instructor` · `admin`
- **Profile management**: name, bio, avatar, social links

### Analytics Service (FastAPI) — Port 8003
Tracks platform activity:
- `POST /track/view` — course/lesson view events
- `POST /track/enrollment` — enroll/complete events
- `GET /dashboard` — aggregated stats (cached 60s)
- `GET /trends/enrollments` — daily enrollment chart data
- `GET /trends/views` — daily view chart data
- `GET /courses/{id}/stats` — per-course metrics

### AI Tutor Service (FastAPI + Ollama) — Port 8004
Powered by a local **Ollama model** (e.g., qwen2.5:0.5b):
- `POST /ask` — multi-turn Q&A with Redis session memory
- `POST /quiz` — generates N multiple-choice questions on any topic
- `POST /recommend` — personalised learning path suggestions
- `POST /analyze-feedback` — sentiment analysis + summary (called by n8n)

**How session memory works**: each chat session has a `session_id`. Conversation history is stored in Redis with a 1-hour TTL. When a new message arrives, the full history is included in the Ollama API call, enabling true multi-turn dialogue.

### n8n Automation — Port 5678

**Feedback workflow** (import `services/n8n/workflows/feedback-workflow.json`):

```
Webhook POST /feedback
    ↓
Extract & normalise fields
    ↓
POST → AI Tutor /analyze-feedback (Local LLM)
    ↓
INSERT into PostgreSQL feedbacks table
    ↓
IF sentiment ≠ positive:
    → Send email alert to admin (SMTP)
    ↓
Respond 200 to webhook caller
```

**How to import the workflow:**
1. Open http://localhost:5678
2. Login with `N8N_USER` / `N8N_PASSWORD` from your `.env`
3. Go to **Workflows → Import from file**
4. Upload `services/n8n/workflows/feedback-workflow.json`
5. Configure the **PostgreSQL credential** inside n8n pointing to `postgres:5432`
6. Activate the workflow

---

## 🗄 Databases

| Database | Used by | Data stored |
|----------|---------|-------------|
| PostgreSQL | Course, Analytics, n8n | Courses, lessons, enrollments, progress, reviews, events, feedback |
| MongoDB | User Service | User accounts, profiles, roles |
| Redis | All services | JWT blacklist, course cache, analytics cache, AI chat sessions |
| MinIO | Course Service | Course thumbnails, video uploads |

---

## 🤖 AI Tutor Setup (Ollama)

The platform runs a local `ollama` container as part of the `docker-compose.yml` stack. 
Upon startup, the `ollama` container automatically pulls the lightweight `qwen2.5:0.5b` model.

The AI Tutor appears as a **floating chat widget** on course detail and lesson pages (only for enrolled users). It automatically receives the current lesson's content as context so its answers are course-specific.

---

## 📊 Diagrams

The complete architecture documentation, including C4 Context, Container, Component diagrams, and UML Use Case, Class, Sequence, and Deployment diagrams, can be found in [docs/architecture.md](docs/architecture.md).

---

## 🛠 Development Tips

### View logs for a specific service
```bash
docker compose logs -f course-service
docker compose logs -f ai-tutor-service
docker compose logs -f n8n-automation
```

### Rebuild a single service after code changes
```bash
docker compose up --build course-service -d
```

### Access PostgreSQL directly
```bash
docker exec -it lp-postgres psql -U lpuser -d learningplatform
```

### Access MongoDB
```bash
docker exec -it lp-mongodb mongosh -u lpmongouser -p lpmongopwd123
```

### Reset all data (destructive!)
```bash
docker compose down -v   # removes all volumes
docker compose up --build -d
```

---

## 🔐 Default Seed Data

After startup, the database contains:

**Categories**: Web Development, DevOps & Cloud, Data Science, Cybersecurity, Mobile Development

**Courses** (ready to browse):
1. Docker & Docker Compose Masterclass (Free)
2. Next.js 14 Full-Stack Development ($29.99)
3. Python for Data Science ($19.99)
4. Kubernetes for Developers ($39.99)
5. Ethical Hacking Fundamentals (Free)

---

## 📦 Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| API Gateway | Nginx 1.25 |
| Course Service | Python 3.12, FastAPI, SQLAlchemy 2.0, PostgreSQL |
| User Service | Node.js 20, Express 4, Mongoose, MongoDB |
| Analytics Service | Python 3.12, FastAPI, PostgreSQL |
| AI Tutor | Python 3.12, FastAPI, **Ollama** (Local LLM) |
| Automation | n8n (self-hosted) |
| Cache | Redis 7 |
| Object Storage | MinIO |
| Containerisation | Docker Compose |
