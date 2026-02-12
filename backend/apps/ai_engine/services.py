import logging

from .models import AIAnalysis
from .client import analyze_resume

logger = logging.getLogger(__name__)


def run_ai_analysis(job_application, resume, candidate_level="experienced", target_stack=None):
    if not job_application:
        raise ValueError("JobApplication does not exist")

    if not resume:
        raise ValueError("No resume selected for this analysis")

    if not resume.parsed_text:
        raise ValueError("Resume text not parsed")

    if resume.user_id != job_application.user_id:
        raise ValueError("Resume does not belong to the same user as the job application")

    if not (job_application.job_description or "").strip():
        raise ValueError("Job description is missing")

    allowed_levels = {AIAnalysis.CANDIDATE_LEVEL_FRESHER, AIAnalysis.CANDIDATE_LEVEL_EXPERIENCED}
    if candidate_level not in allowed_levels:
        candidate_level = AIAnalysis.CANDIDATE_LEVEL_EXPERIENCED

    logger.info(
        "Running AI analysis for JobApplication id=%s resume_id=%s level=%s parsed_text_len=%s",
        job_application.id,
        getattr(resume, 'id', None),
        candidate_level,
        len(resume.parsed_text) if resume.parsed_text is not None else 0,
    )

    try:
        result = analyze_resume(
            resume_text=resume.parsed_text,
            job_description=job_application.job_description,
            candidate_level=candidate_level,
            target_stack=target_stack,
            job_title=job_application.job_title,
        )
    except Exception as exc:
        logger.exception("AI client failed for job_id=%s: %s", job_application.id, exc)
        raise

    logger.debug("AI result for job_id=%s: %s", job_application.id, result)

    return {
        "ats_score": result.get("ats_score", 0),
        "score_breakdown": result.get("score_breakdown", {}),
        "missing_keywords": result.get("missing_keywords", []),
        "strengths": result.get("strengths", []),
        "suggestions": result.get("suggestions", []),
    }

