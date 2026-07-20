from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.jobs.models import JobApplication
from .models import Resume

User = get_user_model()


class ResumeApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="resumeuser",
            email="resume@example.com",
            password="ResumePass123!",
        )
        self.other = User.objects.create_user(
            username="resumeother",
            email="resumeother@example.com",
            password="ResumePass456!",
        )
        self.user_job = JobApplication.objects.create(
            user=self.user,
            company_name="Acme",
            job_title="Engineer",
            job_description="A complete description",
            extraction_status="success",
        )

    def test_upload_resume_success(self):
        self.client.force_authenticate(user=self.user)
        file_obj = SimpleUploadedFile(
            "resume.pdf",
            b"%PDF-1.4 test content",
            content_type="application/pdf",
        )

        response = self.client.post(
            "/api/resumes/upload/",
            {"file": file_obj, "job_application": self.user_job.id},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Resume.objects.count(), 1)

    def test_resume_list_is_user_scoped(self):
        Resume.objects.create(
            user=self.user,
            job_application=self.user_job,
            file=SimpleUploadedFile("a.pdf", b"%PDF-1.4 a", content_type="application/pdf"),
        )
        other_job = JobApplication.objects.create(
            user=self.other,
            company_name="Other",
            job_title="Other Role",
            job_description="Other description",
            extraction_status="success",
        )
        Resume.objects.create(
            user=self.other,
            job_application=other_job,
            file=SimpleUploadedFile("b.pdf", b"%PDF-1.4 b", content_type="application/pdf"),
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/resumes/list/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_delete_is_user_scoped(self):
        resume = Resume.objects.create(
            user=self.user,
            job_application=self.user_job,
            file=SimpleUploadedFile("a.pdf", b"%PDF-1.4 a", content_type="application/pdf"),
        )
        other_job = JobApplication.objects.create(
            user=self.other,
            company_name="Other",
            job_title="Other Role",
            job_description="Other description",
            extraction_status="success",
        )
        Resume.objects.create(
            user=self.other,
            job_application=other_job,
            file=SimpleUploadedFile("b.pdf", b"%PDF-1.4 b", content_type="application/pdf"),
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f"/api/resumes/{resume.id}/delete/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Resume.objects.filter(id=resume.id).exists())
