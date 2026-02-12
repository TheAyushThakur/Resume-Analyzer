import os
import json
import logging
from groq import Groq

logger = logging.getLogger(__name__)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
BREAKDOWN_KEYS = (
    "skills_match",
    "project_impact",
    "tools_frameworks",
    "role_fit",
)


def _safe_load_json_from_text(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # attempt to extract the first JSON object in the text as a fallback
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end+1])
            except Exception:
                pass
        raise


def _normalize_score(value, minimum=0, maximum=100):
    try:
        score = int(float(value))
    except Exception:
        score = minimum
    return max(minimum, min(maximum, score))


def _normalize_breakdown(value) -> dict:
    normalized = {key: 0 for key in BREAKDOWN_KEYS}
    if not isinstance(value, dict):
        return normalized

    for key in BREAKDOWN_KEYS:
        normalized[key] = _normalize_score(value.get(key, 0), minimum=0, maximum=25)
    return normalized


def _ensure_list_of_strings(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    if isinstance(value, str):
        text = value.strip()
        return [text] if text else []
    return [str(value)]


def analyze_resume(
    resume_text: str,
    job_description: str,
    candidate_level: str = "experienced",
    target_stack=None,
    job_title: str = "",
) -> dict:
    tech_stack = _ensure_list_of_strings(target_stack)
    stack_text = ", ".join(tech_stack) if tech_stack else "Not provided"

    system_msg = (
        "You are a strict ATS and technical recruiter evaluator for software jobs.\n"
        "You evaluate candidates for tech roles only and return VALID JSON ONLY."
    )

    user_msg = (
        "Return JSON in this exact format:\n"
        "{\n"
        "  \"ats_score\": number between 0 and 100,\n"
        "  \"score_breakdown\": {\n"
        "    \"skills_match\": integer from 0 to 25,\n"
        "    \"project_impact\": integer from 0 to 25,\n"
        "    \"tools_frameworks\": integer from 0 to 25,\n"
        "    \"role_fit\": integer from 0 to 25\n"
        "  },\n"
        "  \"missing_keywords\": [string],\n"
        "  \"strengths\": [string],\n"
        "  \"suggestions\": [string]\n"
        "}\n"
        "Rules:\n"
        "- Treat this as a technology role evaluation.\n"
        "- For fresher candidates, value projects, internships, fundamentals, and learning velocity.\n"
        "- For experienced candidates, value production impact, ownership, scale, and architecture depth.\n"
        "- Keep suggestions specific and actionable for resume improvement.\n\n"
        f"CANDIDATE_LEVEL: {candidate_level}\n"
        f"TARGET_STACK: {stack_text}\n"
        f"JOB_TITLE: {job_title or 'Not provided'}\n\n"
        "RESUME:\n" + (resume_text or "") + "\n\n"
        "JOB DESCRIPTION:\n" + (job_description or "")
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.25,
    )

    content = response.choices[0].message.content.strip()
    logger.debug("Groq raw response: %s", content)

    try:
        data = _safe_load_json_from_text(content)
    except json.JSONDecodeError:
        logger.error("Invalid JSON returned by Groq: %s", content)
        raise ValueError(f"Invalid JSON returned by Groq:\n{content}")

    breakdown = _normalize_breakdown(data.get("score_breakdown"))
    breakdown_total = sum(breakdown.values())

    if breakdown_total > 0:
        ats = breakdown_total
    else:
        ats = _normalize_score(data.get("ats_score", 0), minimum=0, maximum=100)

    return {
        "ats_score": ats,
        "score_breakdown": breakdown,
        "missing_keywords": _ensure_list_of_strings(data.get("missing_keywords")),
        "strengths": _ensure_list_of_strings(data.get("strengths")),
        "suggestions": _ensure_list_of_strings(data.get("suggestions")),
    }
