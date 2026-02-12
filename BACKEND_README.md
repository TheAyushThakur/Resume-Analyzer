# JobTracker Backend 

## 1) Product and Scope

This backend supports a **tech job application assistant** workflow:

1. User creates a job application by either:
   - Providing a `job_url` for extraction, or
   - Providing manual `company_name + job_title + job_description`.
2. User uploads/selects a resume.
3. User starts AI analysis.
4. Frontend polls for result and renders ATS insights.

Target user profile: **tech job seekers (freshers and experienced)**.

---

## 2) Tech Stack and Runtime

- Framework: Django + Django REST Framework
- Auth: JWT (`rest_framework_simplejwt`)
- Async queue: Celery
- Broker: Redis (`redis://localhost:6379/0`)
- DB: SQLite (dev)
- AI provider: Groq (`llama-3.3-70b-versatile`)

Important runtime requirements:

1. Django server must run.
2. Redis must run.
3. Celery worker must run (for async tasks like analysis and job re-extraction on update).

Windows run commands (current project style):

```powershell
cd backend
..\env\Scripts\python.exe manage.py migrate
..\env\Scripts\python.exe manage.py runserver
..\env\Scripts\celery -A config worker -l info --pool=solo
```

---

## 3) Authentication Contract

All business endpoints require `Authorization: Bearer <access_token>`.

- `POST /api/token/`
- `POST /api/token/refresh/`

No separate signup endpoint is documented in this backend.

---

## 4) Core Data Models

## `JobApplication` (`apps.jobs.models`)

Key fields:

- `id`
- `user` (FK)
- `company_name` (blank allowed)
- `job_title` (blank allowed)
- `job_url` (`URLField(max_length=1000)`, blank/null allowed)
- `job_description` (blank allowed)
- `description_source`: `manual | extracted`
- `extraction_status`: `pending | success | failed | needs_manual`
- `extraction_error` (text)
- `created_at`, `updated_at`

## `Resume` (`apps.resumes.models`)

Key fields:

- `id`
- `user` (FK)
- `job_application` (optional FK)
- `file`
- `parsed_text` (auto-populated from PDF signal if parsing succeeds)
- `created_at`

## `AIAnalysis` (`apps.ai_engine.models`)

One analysis record per job (`OneToOne` with `JobApplication`, updated/reused).

Key fields:

- `id`
- `job_application` (OneToOne)
- `resume` (FK nullable)
- `candidate_level`: `fresher | experienced`
- `target_stack` (JSON list)
- `status`: `pending | processing | completed | failed`
- `ats_score` (0-100)
- `score_breakdown` (JSON object)
- `missing_keywords` (JSON list)
- `strengths` (JSON list)
- `suggestions` (JSON list)
- `error_message`
- `created_at`

---

## 5) Endpoint Reference

Base URL prefix from `config/urls.py`:

- `/api/jobs/...`
- `/api/resumes/...`
- `/api/ai/...`

## Jobs

### `POST /api/jobs/create/`

Creates a job application.

Accepted modes:

1. **Manual mode**:
   - send all: `company_name`, `job_title`, `job_description`
2. **URL mode**:
   - send `job_url`
   - backend attempts extraction during create

Important create behavior:

- If extraction fails and manual fields are not fully provided, request fails with `400` and **no DB row is created**.
- This prevents empty/incomplete rows on failed extraction.
- If extraction succeeds, row is created with extracted content.
- If extraction fails but complete manual fields are also present, row is created manually.

Validation rule:

- Must provide either `job_url` OR all manual fields.

### `GET /api/jobs/list/`

Returns jobs for authenticated user only.

### `GET /api/jobs/<pk>/`

Returns one job for authenticated user only.

### `PATCH /api/jobs/<pk>/update/` (or PUT)

Updates existing job.

Special behavior:

- If `job_url` is updated and non-empty:
  - sets `description_source=extracted`
  - sets `extraction_status=pending`
  - enqueues async extraction task
- If manual fields are updated and all required manual fields are complete:
  - sets `description_source=manual`
  - sets `extraction_status=success`

---

## Resumes

### `POST /api/resumes/upload/`

Upload resume file using `multipart/form-data`:

- required form field: `file` (actual binary file, not `file://...` string)
- optional: `job_application` id

Rules:

- Resume belongs to authenticated user.
- Serializer prevents attaching resume to another user's job.
- `parsed_text` is read-only and filled by server-side parsing signal.

### `GET /api/resumes/list/`

List resumes for authenticated user only.

---

## AI Engine

### `POST /api/ai/analyze/<job_id>/`

Starts async AI analysis.

Required:

- `resume_id`

Optional:

- `candidate_level`: `fresher` or `experienced` (default `experienced`)
- `target_stack`: list of strings or comma-separated string

Validation:

- job must belong to current user
- resume must belong to current user
- resume must have non-empty `parsed_text`
- job must have non-empty `job_description`

Returns `202` with:

- `analysis_id`
- `status: processing`
- normalized `candidate_level`
- normalized `target_stack`

### `GET /api/ai/result/<job_id>/`

Returns:

- `{"status": "pending"}` if no analysis record exists yet
- full `AIAnalysis` payload otherwise

---

## 6) Async and State Transitions

## Job extraction task (`extract_job_description_task`)

Used when job URL is updated via `PATCH /jobs/<id>/update/`.

Outcomes:

- `success`: description/title/company available
- `needs_manual`: extraction failed or missing required fields
- `failed`: unexpected exception

## AI task (`run_ai_analysis_task`)

Transitions:

1. `processing`
2. `completed` with scores and suggestions
3. `failed` with `error_message` if exception

Frontend should poll `GET /api/ai/result/<job_id>/` until non-processing terminal state.

---

## 7) AI Scoring Contract (Tech Specific)

AI returns:

- `ats_score` (0-100)
- `score_breakdown` with four buckets:
  - `skills_match` (0-25)
  - `project_impact` (0-25)
  - `tools_frameworks` (0-25)
  - `role_fit` (0-25)
- `missing_keywords` (string list)
- `strengths` (string list)
- `suggestions` (string list)

Normalization behavior:

- If `score_breakdown` is valid, `ats_score` is derived as sum of bucket scores.
- Otherwise falls back to normalized `ats_score`.

Prompt is tailored for tech roles and uses candidate context:

- fresher: emphasize projects/internships/fundamentals/learning
- experienced: emphasize impact/ownership/scale/architecture

---

## 8) Frontend Integration Checklist

1. Always send JWT bearer token for all `/api/jobs`, `/api/resumes`, `/api/ai` requests.
2. Job create screen:
   - support URL mode and manual mode
   - handle `400` extraction/manual fallback validation message
3. Resume upload:
   - use multipart form-data
   - pass real file binary in `file` field
4. Analyze action:
   - require selected `resume_id`
   - optionally pass `candidate_level` and `target_stack`
5. Polling:
   - poll `GET /api/ai/result/<job_id>/` until `completed` or `failed`
6. Display:
   - render overall score + score breakdown + missing keywords + suggestions

---

## 9) Example Payloads

## Create Job (manual)

```json
{
  "company_name": "noon",
  "job_title": "Software Development Engineer",
  "job_description": "Full JD text here"
}
```

## Create Job (URL)

```json
{
  "job_url": "https://example.com/job-posting"
}
```

## Update Job (trigger re-extract async)

```json
{
  "job_url": "https://example.com/updated-job-posting"
}
```

## Start AI analysis

```json
{
  "resume_id": 5,
  "candidate_level": "fresher",
  "target_stack": ["react", "typescript", "node.js"]
}
```

## Alternate target_stack format (also accepted)

```json
{
  "resume_id": 5,
  "candidate_level": "experienced",
  "target_stack": "django, python, postgresql, redis"
}
```

---

## 10) Known Constraints / Notes

1. `job_url` max length is currently `1000`.
2. List endpoints are not paginated yet.
3. No automated tests currently cover business flows.
4. AI analysis record is upserted per job (latest replaces previous values).
5. If frontend is hosted on another origin, CORS middleware/policy may need explicit configuration.

---


