from django.db import models
from apps.jobs.models import JobApplication


class AIAnalysis(models.Model):
    CANDIDATE_LEVEL_FRESHER = "fresher"
    CANDIDATE_LEVEL_EXPERIENCED = "experienced"
    CANDIDATE_LEVEL_CHOICES = [
        (CANDIDATE_LEVEL_FRESHER, "Fresher"),
        (CANDIDATE_LEVEL_EXPERIENCED, "Experienced"),
    ]

    job_application = models.OneToOneField(
        JobApplication,
        on_delete=models.CASCADE,
        related_name='ai_analysis'
    )
    resume = models.ForeignKey(
        "resumes.Resume",
        on_delete=models.SET_NULL,
        related_name='ai_analyses',
        null=True,
        blank=True
    )
    candidate_level = models.CharField(
        max_length=20,
        choices=CANDIDATE_LEVEL_CHOICES,
        default=CANDIDATE_LEVEL_EXPERIENCED,
    )
    target_stack = models.JSONField(default=list, blank=True)

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
    ats_score = models.IntegerField(default=0)
    missing_keywords = models.JSONField(default=list, blank=True)
    strengths = models.JSONField(default=list, blank=True)
    suggestions = models.JSONField(default=list, blank=True)
    score_breakdown = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AI Analysis for {self.job_application}"
