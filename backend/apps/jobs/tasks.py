from celery import shared_task
from apps.jobs.models import JobApplication
from apps.jobs.services.job_extractor import (
    extract_job_posting,
    JobExtractionError,
)


@shared_task
def extract_job_description_task(job_id):
    try:
        job = JobApplication.objects.get(id=job_id)
    except JobApplication.DoesNotExist:
        return

    if not job.job_url:
        job.extraction_status = "needs_manual"
        job.extraction_error = "No job URL provided."
        job.save(update_fields=["extraction_status", "extraction_error"])
        return

    try:
        extracted = extract_job_posting(job.job_url)
        text = extracted.get("job_description", "")
        title = extracted.get("job_title", "")
        company = extracted.get("company_name", "")

        job.job_description = text
        if title:
            job.job_title = title
        if company:
            job.company_name = company
        job.description_source = "extracted"
        missing_fields = []
        if not (job.job_description or "").strip():
            missing_fields.append("job_description")
        if not (job.job_title or "").strip():
            missing_fields.append("job_title")
        if not (job.company_name or "").strip():
            missing_fields.append("company_name")

        if missing_fields:
            job.extraction_status = "needs_manual"
            job.extraction_error = (
                "Automatic extraction completed with missing fields: "
                + ", ".join(missing_fields)
                + ". Please fill them manually."
            )
        else:
            job.extraction_status = "success"
            job.extraction_error = ""
        job.save(update_fields=[
            "job_description",
            "job_title",
            "company_name",
            "description_source",
            "extraction_status",
            "extraction_error",
        ])

    except JobExtractionError as exc:
        job.extraction_status = "needs_manual"
        job.extraction_error = str(exc)
        job.save(update_fields=["extraction_status", "extraction_error"])
    except Exception as exc:
        job.extraction_status = "failed"
        job.extraction_error = f"Unexpected extraction error: {exc}"
        job.save(update_fields=["extraction_status", "extraction_error"])
