# JobTracker SaaS

JobTracker is a full-stack SaaS-style platform for tracking job applications, extracting job descriptions, uploading resumes, and running AI ATS analysis.

## Features

- JWT authentication with refresh flow
- Self-serve onboarding (`/api/auth/signup/`)
- User profile APIs (`/api/auth/me/`, `/api/auth/me/update/`)
- Job tracking with URL extraction fallback to manual entry
- Resume upload + parsing pipeline
- Async AI analysis using Celery + Redis
- Free-plan usage limit control for AI analysis
- Production-ready settings via environment variables
- Dockerized services (backend, worker, redis, postgres, frontend)

## Tech Stack

- Backend: Django + DRF + Celery
- Frontend: React + Vite + Tailwind CSS
- Queue/Broker: Redis
- Database: PostgreSQL
- AI Provider: Groq API

## Local Development

### 1. Backend

```powershell
cd backend
..\env\Scripts\python.exe -m pip install -r requirements.txt
..\env\Scripts\python.exe manage.py migrate
..\env\Scripts\python.exe manage.py runserver
```

### 2. Celery Worker

```powershell
cd backend
..\env\Scripts\celery -A config worker -l info --pool=solo
```

### 3. Redis

Run local Redis on `localhost:6379`.

### 4. Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Production (Docker Compose)

```powershell
docker compose up --build
```

Services:

- Frontend: `http://localhost:4173`
- Backend API: `http://localhost:8000`
- Health check: `http://localhost:8000/health/`

## Core Environment Variables

Use `.env.example` as a base and point `DATABASE_URL` to PostgreSQL.

- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `DATABASE_URL`
- `CELERY_BROKER_URL`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `GROQ_API_KEY`
- `FREE_PLAN_ANALYSIS_LIMIT`

## Test Commands

```powershell
cd backend
..\env\Scripts\python.exe manage.py test
```

```powershell
cd frontend
npm run lint
npm run build
```
