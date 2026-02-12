from django.conf import settings
from django.db import models
from apps.jobs.models import JobApplication

User = settings.AUTH_USER_MODEL


class Resume(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='resumes'
    )

    job_application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        related_name='resumes',
        null=True,
        blank=True
    )

    file = models.FileField(upload_to='resumes/')
    parsed_text = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Resume {self.id} - {self.user}"
