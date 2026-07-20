import os
import json
import logging

try:
    from groq import Groq
except ModuleNotFoundError:
    Groq = None

logger = logging.getLogger(__name__)
client = Groq(api_key=os.getenv("GROQ_API_KEY")) if Groq else None
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

    if client is None:
        raise RuntimeError("Groq client is not installed in this environment.")

    system_msg = (
        "You are a senior technical recruiter and ATS system with 10+ years of experience "
        "screening software engineering candidates at top tech companies.\n\n"
        "Your evaluation must be EVIDENCE-BASED, not impression-based. You are known for being "
        "hard to impress: most resumes score in the 40-65 range. Scores above 80 are reserved "
        "for resumes with clear, specific, quantified evidence of skill and impact. A resume "
        "that merely lists buzzwords without proof of application should score LOW on the "
        "relevant sub-category, even if the buzzwords match the job description.\n\n"
        "STRICT RULES:\n"
        "1. Do not invent, infer, or assume any skill, project, employer, metric, or experience "
        "that is not explicitly stated in the resume text. If something is implied but not "
        "stated, do not credit it.\n"
        "2. Vague claims ('worked on backend systems', 'improved performance') without specifics "
        "(what system, what change, what number) must be scored as weak evidence, not strong.\n"
        "3. A keyword appearing in a skills list is weaker evidence than the same keyword "
        "appearing in a project/experience description with concrete usage.\n"
        "4. If the resume text is short, generic, or has little to evaluate, LOWER the score "
        "and say so explicitly — do not pad the score to seem helpful.\n"
        "5. Do not be swayed by formatting, length, or confident language. Only substance counts.\n"
        "6. Every score you assign must be traceable to specific text in the resume. You will be "
        "asked to justify each sub-score with evidence.\n"
        "7. Two resumes with similar actual substance should receive similar scores, regardless "
        "of phrasing style. Do not reward marketing language.\n\n"
        "Return VALID JSON ONLY. No markdown, no commentary outside the JSON."
    )

    user_msg = (
        "Evaluate this candidate against the job description using the rubric below. "
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
        "}\n\n"
        "SCORING RUBRIC (apply per sub-category, 0-25 each):\n"
        "- 0-6: Little to no relevant evidence found in resume.\n"
        "- 7-13: Keyword-level match only; no demonstrated depth or application.\n"
        "- 14-19: Clear application shown (a project, task, or role), but lacks specifics, scale, or outcome.\n"
        "- 20-25: Specific, verifiable application with concrete detail (what was built/done, "
        "with scope, scale, or measurable outcome where applicable).\n\n"
        "LEVEL-SPECIFIC WEIGHTING:\n"
        "- If CANDIDATE_LEVEL indicates fresher/entry-level: weight project depth, fundamentals, "
        "and evidence of independent learning over 'years of experience'. Do not penalize for "
        "lack of professional employment history — penalize for lack of substantive projects.\n"
        "- If CANDIDATE_LEVEL indicates experienced: weight production ownership, scale, "
        "architecture decisions, and measurable impact (metrics, user counts, latency, cost, "
        "team size) heavily. Generic task descriptions should score low even with years of tenure.\n\n"
        "OTHER RULES:\n"
        "- Only list missing_keywords that are clearly supported by the job description.\n"
        "- Only list strengths that are directly and specifically supported by resume text.\n"
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
        temperature=0.2,
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