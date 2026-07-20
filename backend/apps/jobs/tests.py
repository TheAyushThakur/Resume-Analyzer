from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import JobApplication

User = get_user_model()


class JobApplicationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="jane",
            email="jane@example.com",
            password="JanePass123!",
        )
        self.other = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="OtherPass123!",
        )

    def test_create_manual_job_success(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "company_name": "Acme",
            "job_title": "Backend Engineer",
            "job_description": "Build APIs with Django and PostgreSQL.",
        }

        response = self.client.post("/api/jobs/create/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = JobApplication.objects.get(id=response.data["id"])
        self.assertEqual(created.user_id, self.user.id)

    def test_create_requires_url_or_full_manual_data(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/jobs/create/",
            {"company_name": "Acme"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_is_user_scoped(self):
        JobApplication.objects.create(
            user=self.user,
            company_name="Mine",
            job_title="Role A",
            job_description="Description A",
            extraction_status="success",
        )
        JobApplication.objects.create(
            user=self.other,
            company_name="Other",
            job_title="Role B",
            job_description="Description B",
            extraction_status="success",
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/jobs/list/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["company_name"], "Mine")

    def test_delete_is_user_scoped(self):
        job = JobApplication.objects.create(
            user=self.user,
            company_name="Mine",
            job_title="Role A",
            job_description="Description A",
            extraction_status="success",
        )
        JobApplication.objects.create(
            user=self.other,
            company_name="Other",
            job_title="Role B",
            job_description="Description B",
            extraction_status="success",
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f"/api/jobs/{job.id}/delete/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(JobApplication.objects.filter(id=job.id).exists())
