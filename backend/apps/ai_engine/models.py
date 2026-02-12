from django.db import models
from apps.jobs.models import JobApplication

class AIAnalysis(models.Model):
    job_application = models.OneToOneField(
        JobApplication,
        on_delete=models.CASCADE,
        related_name='ai_analysis'
    )

    status = models.CharField(
            max_length=20,
            choices=[
                ('pending', 'Pending'),
                ('processing', 'Processing'),
                ('completed', 'Completed'),
                ('failed', 'Failed'),
            ],                
            default='pending'
    )
    ats_score = models.IntegerField()
    missing_keywords = models.JSONField()
    strengths = models.JSONField()
    suggestions = models.JSONField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AI Analysis for {self.job_application}"