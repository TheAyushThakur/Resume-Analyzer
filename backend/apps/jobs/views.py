from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from .models import JobApplication
from .serializers import JobApplicationSerializer
from .services.extraction_quality import get_extraction_rejection_reason
from .services.job_extractor import JobExtractionError, extract_job_posting


class JobApplicationCreateView(generics.CreateAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        validated = serializer.validated_data
        job_url = (validated.get("job_url") or "").strip()
        manual_company = (validated.get("company_name") or "").strip()
        manual_title = (validated.get("job_title") or "").strip()
        manual_description = (validated.get("job_description") or "").strip()
        manual_complete = bool(manual_company and manual_title and manual_description)

        if not job_url:
            serializer.save(
                user=self.request.user,
                description_source="manual",
                extraction_status="success",
                extraction_error="",
            )
            return

        try:
            extracted = extract_job_posting(job_url)
        except JobExtractionError as exc:
            if manual_complete:
                serializer.save(
                    user=self.request.user,
                    description_source="manual",
                    extraction_status="success",
                    extraction_error="",
                )
                return
            raise ValidationError(
                {
                    "detail": (
                        f"Extraction failed: {exc}. "
                        "Provide manual company_name, job_title, and job_description."
                    )
                }
            )

        extracted_description = (extracted.get("job_description") or "").strip()
        extracted_company = (extracted.get("company_name") or "").strip()
        extracted_title = (extracted.get("job_title") or "").strip()
        extraction_issue = get_extraction_rejection_reason(
            job_description=extracted_description,
            job_title=extracted_title,
            company_name=extracted_company,
        )

        if extraction_issue:
            if manual_complete:
                serializer.save(
                    user=self.request.user,
                    description_source="manual",
                    extraction_status="success",
                    extraction_error="",
                )
                return

            raise ValidationError(
                {
                    "detail": (
                        f"Extraction failed: {extraction_issue}. "
                        "Provide manual company_name, job_title, and job_description."
                    )
                }
            )

        if extracted_description and extracted_company:
            serializer.save(
                user=self.request.user,
                company_name=extracted_company,
                job_title=extracted_title or manual_title,
                job_description=extracted_description,
                description_source="extracted",
                extraction_status="success",
                extraction_error="",
            )
            return

        if manual_complete:
            serializer.save(
                user=self.request.user,
                description_source="manual",
                extraction_status="success",
                extraction_error="",
            )
            return

        raise ValidationError(
            {
                "detail": (
                    "Extraction returned incomplete data. "
                    "Provide manual company_name, job_title, and job_description."
                )
            }
        )


class JobApplicationListView(generics.ListAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JobApplication.objects.filter(user=self.request.user).order_by("-updated_at", "-id")


class JobApplicationDetailView(generics.RetrieveAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JobApplication.objects.filter(user=self.request.user)


class JobApplicationDeleteView(generics.DestroyAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JobApplication.objects.filter(user=self.request.user)
