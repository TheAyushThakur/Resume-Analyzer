import re


MIN_DESCRIPTION_LENGTH = 180

AUTH_WALL_MARKERS = (
    "linkedin login",
    "sign in | linkedin",
    "sign in to linkedin",
    "join linkedin",
    "new to linkedin",
    "create your account",
    "log in to continue",
    "verify you are human",
    "access denied",
    "please sign in",
)

JOB_HINT_MARKERS = (
    "responsibilities",
    "requirements",
    "qualifications",
    "experience",
    "skills",
    "about the role",
    "what you'll do",
    "what you will do",
    "job description",
    "preferred qualifications",
)

GENERIC_NON_JOB_TITLES = {
    "linkedin",
    "linkedin login, sign in | linkedin",
    "sign in | linkedin",
    "log in | linkedin",
    "linkedin: log in or sign up",
}


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def _contains_any(text: str, markers) -> bool:
    return any(marker in text for marker in markers)


def get_extraction_rejection_reason(
    *,
    job_description: str,
    job_title: str = "",
    company_name: str = "",
) -> str | None:
    description = _normalize(job_description)
    title = _normalize(job_title)
    company = _normalize(company_name)

    if not description:
        return "Extracted page did not contain job description text."

    if len(description) < MIN_DESCRIPTION_LENGTH:
        return "Extracted content is too short to be a valid job description."

    title_lower = title.lower()
    if title_lower in GENERIC_NON_JOB_TITLES:
        return "Extracted page appears to be a login/auth page, not a job posting."

    description_lower = description.lower()
    combined_lower = " ".join([title, company, description]).lower()

    has_auth_wall_markers = _contains_any(combined_lower, AUTH_WALL_MARKERS)
    has_job_markers = _contains_any(description_lower, JOB_HINT_MARKERS)

    if has_auth_wall_markers and not has_job_markers:
        return "Extracted page appears blocked or login-gated, not a real job description."

    return None
