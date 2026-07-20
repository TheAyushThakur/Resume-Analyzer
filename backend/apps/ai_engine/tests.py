from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.jobs.models import JobApplication
from apps.resumes.models import Resume
from .models import AIAnalysis

User = get_user_model()


class AIAnalysisApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="aiuser",
            email="ai@example.com",
            password="AiPass123!",
        )
        self.job = JobApplication.objects.create(
            user=self.user,
            company_name="Acme",
            job_title="AI Engineer",
            job_description="Strong Python, APIs, and ML systems experience.",
            extraction_status="success",
        )
        self.resume = Resume.objects.create(
            user=self.user,
            job_application=self.job,
            file=SimpleUploadedFile("resume.pdf", b"%PDF-1.4 mock", content_type="application/pdf"),
            parsed_text="Python Django FastAPI machine learning",
        )

    @patch("apps.ai_engine.views.run_ai_analysis")
    def test_start_analysis_returns_completed_result(self, mock_run_ai_analysis):
        mock_run_ai_analysis.return_value = {
            "ats_score": 88,
            "score_breakdown": {"skills": 30, "keywords": 28},
            "missing_keywords": ["docker"],
            "strengths": ["Python", "Django"],
            "suggestions": ["Add Docker experience"],
        }
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/ai/analyze/{self.job.id}/",
            {
                "resume_id": self.resume.id,
                "candidate_level": "experienced",
                "target_stack": ["python", "django"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "completed")
        self.assertEqual(response.data["ats_score"], 88)
        self.assertTrue(AIAnalysis.objects.filter(job_application=self.job).exists())
        mock_run_ai_analysis.assert_called_once()

    def test_start_analysis_requires_resume(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/ai/analyze/{self.job.id}/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_result_returns_pending_when_not_started(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f"/api/ai/result/{self.job.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "pending")
