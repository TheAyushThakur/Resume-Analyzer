from celery import shared_task
from apps.jobs.models import JobApplication
from apps.ai_engine.models import AIAnalysis
from .services import run_ai_analysis


@shared_task
def run_ai_analysis_task(job_id):
    try:
        job = JobApplication.objects.get(id=job_id)

        # get latest analysis record
        analysis = AIAnalysis.objects.filter(
            job_application=job
        ).last()

        if analysis:
            analysis.status = "processing"
            analysis.save(update_fields=["status"])

        # run AI logic
        analysis = run_ai_analysis(job)

        # mark completed
        analysis.status = "completed"
        analysis.save(update_fields=["status"])

    except Exception as e:
        # optional but recommended
        if analysis:
            analysis.status = "failed"
            analysis.save(update_fields=["status"])
        raise e
