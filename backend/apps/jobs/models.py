from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


class JobApplication(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='job_applications'
    )

    company_name = models.CharField(max_length=255)
    job_title = models.CharField(max_length=255)
    job_url = models.URLField()

    job_description = models.TextField(blank=True, default="")

    description_source = models.CharField(max_length=20,
                    choices=[
                        ("manual", "Manual"),
                        ("extracted", "Extracted")
                    ], 
                         default="manual"
    )   

    extraction_status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("success", "Success"),
            ("failed", "Failed"),
        ],
        default="pending"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company_name} - {self.job_title}"
