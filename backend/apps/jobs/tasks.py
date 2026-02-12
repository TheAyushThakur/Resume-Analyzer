from celery import shared_task
from apps.jobs.models import JobApplication
from apps.jobs.services.job_extractor import (
    extract_job_description,
    JobExtractionError,
)


@shared_task
def extract_job_description_task(job_id):
    try:
        job = JobApplication.objects.get(id=job_id)

        text = extract_job_description(job.job_url)

        job.job_description = text
        job.description_source = "extracted"
        job.extraction_status = "success"
        job.save(update_fields=[
            "job_description",
            "description_source",
            "extraction_status"
        ])

    except JobExtractionError:
        job.extraction_status = "failed"
        job.save(update_fields=["extraction_status"])

    except JobApplication.DoesNotExist:
        pass
