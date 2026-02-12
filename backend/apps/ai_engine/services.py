import logging

from .models import AIAnalysis
from .client import analyze_resume

logger = logging.getLogger(__name__)


def run_ai_analysis(job_application):
    if not job_application:
        raise ValueError("JobApplication does not exist")

    resume = job_application.resumes.last()

    if not resume:
        raise ValueError("No resume linked to this job application")

    if not resume.parsed_text:
        raise ValueError("Resume text not parsed")

    logger.info(
        "Running AI analysis for JobApplication id=%s resume_id=%s parsed_text_len=%s",
        job_application.id,
        getattr(resume, 'id', None),
        len(resume.parsed_text) if resume.parsed_text is not None else 0,
    )

    try:
        result = analyze_resume(
            resume_text=resume.parsed_text,
            job_description=job_application.job_description,
        )
    except Exception as exc:
        logger.exception("AI client failed for job_id=%s: %s", job_application.id, exc)
        raise

    logger.debug("AI result for job_id=%s: %s", job_application.id, result)

    analysis, _ = AIAnalysis.objects.update_or_create(
        job_application=job_application,
        defaults={
            
            "ats_score": result.get("ats_score", 0),
            "missing_keywords": result.get("missing_keywords", []),
            "strengths": result.get("strengths", []),
            "suggestions": result.get("suggestions", []),
        },
    )

    return analysis

