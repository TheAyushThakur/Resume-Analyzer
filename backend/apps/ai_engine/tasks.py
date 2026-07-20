try:
    from celery import shared_task
except ModuleNotFoundError:
    def shared_task(func=None, *decorator_args, **decorator_kwargs):
        def decorator(task_func):
            task_func.delay = lambda *args, **kwargs: task_func(*args, **kwargs)
            return task_func

        if func is not None and callable(func):
            return decorator(func)
        return decorator

from apps.jobs.models import JobApplication
from apps.resumes.models import Resume
from apps.ai_engine.models import AIAnalysis
from .services import run_ai_analysis


@shared_task
def run_ai_analysis_task(job_id, resume_id, candidate_level, target_stack=None):
    analysis = None

    try:
        job = JobApplication.objects.get(id=job_id)
        resume = Resume.objects.get(id=resume_id, user=job.user)
        target_stack = target_stack or []

        analysis, _ = AIAnalysis.objects.update_or_create(
            job_application=job,
            defaults={
                "resume": resume,
                "candidate_level": candidate_level,
                "target_stack": target_stack,
                "status": "processing",
                "error_message": "",
            },
        )

        result = run_ai_analysis(
            job,
            resume,
            candidate_level=candidate_level,
            target_stack=target_stack,
        )

        analysis.status = "completed"
        analysis.resume = resume
        analysis.candidate_level = candidate_level
        analysis.target_stack = target_stack
        analysis.error_message = ""
        analysis.ats_score = result.get("ats_score", 0)
        analysis.score_breakdown = result.get("score_breakdown", {})
        analysis.missing_keywords = result.get("missing_keywords", [])
        analysis.strengths = result.get("strengths", [])
        analysis.suggestions = result.get("suggestions", [])
        analysis.save(update_fields=[
            "status",
            "resume",
            "candidate_level",
            "target_stack",
            "error_message",
            "ats_score",
            "score_breakdown",
            "missing_keywords",
            "strengths",
            "suggestions",
        ])

    except (JobApplication.DoesNotExist, Resume.DoesNotExist):
        return
    except Exception as exc:
        if analysis:
            analysis.status = "failed"
            analysis.error_message = str(exc)
            analysis.save(update_fields=["status", "error_message"])
        raise
