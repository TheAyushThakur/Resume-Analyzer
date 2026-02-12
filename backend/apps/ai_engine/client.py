import os
import json
import logging
from groq import Groq

logger = logging.getLogger(__name__)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


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


def analyze_resume(resume_text: str, job_description: str) -> dict:
    system_msg = (
        "You are an ATS (Applicant Tracking System) analyzer.\n"
        "Compare the RESUME with the JOB DESCRIPTION and return VALID JSON ONLY."
    )

    user_msg = (
        "Return JSON in this exact format:\n"
        "{\n"
        "  \"ats_score\": number between 0 and 100,\n"
        "  \"missing_keywords\": [string],\n"
        "  \"strengths\": [string],\n"
        "  \"suggestions\": [string]\n"
        "}\n\n"
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

    # Normalize and validate fields
    ats = data.get("ats_score")
    try:
        ats = int(float(ats)) if ats is not None else None
    except Exception:
        ats = None

    if ats is None:
        logger.warning("ats_score missing or invalid, defaulting to 0. Raw: %s", data)
        ats = 0
    ats = max(0, min(100, ats))

    def ensure_list(v):
        if v is None:
            return []
        if isinstance(v, list):
            return [str(x) for x in v]
        return [str(v)]

    return {
        "ats_score": ats,
        "missing_keywords": ensure_list(data.get("missing_keywords")),
        "strengths": ensure_list(data.get("strengths")),
        "suggestions": ensure_list(data.get("suggestions")),
    }
