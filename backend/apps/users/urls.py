from django.urls import path

from .views import MeUpdateView, MeView, SignupView

urlpatterns = [
    path("signup/", SignupView.as_view(), name="auth-signup"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("me/update/", MeUpdateView.as_view(), name="auth-me-update"),
]
