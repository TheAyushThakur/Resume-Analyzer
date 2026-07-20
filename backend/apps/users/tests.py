from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class SignupFlowTests(APITestCase):
    def test_signup_creates_user(self):
        payload = {
            "username": "saasuser",
            "email": "saas@example.com",
            "full_name": "SaaS User",
            "password": "StrongPass123!",
        }
        response = self.client.post("/api/auth/signup/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="saasuser").exists())

    def test_me_requires_auth(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MeProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="OwnerPass123!",
            full_name="Owner Name",
        )

    def test_me_returns_authenticated_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "owner")

    def test_profile_update(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            "/api/auth/me/update/",
            {"full_name": "Updated Name", "onboarding_completed": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, "Updated Name")
        self.assertTrue(self.user.onboarding_completed)
