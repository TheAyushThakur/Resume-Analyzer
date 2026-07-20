from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.jobs.models import JobApplication
from apps.resumes.models import Resume
from .models import AIAnalysis
from .serializers import AIAnalysisSerializer
from .services import run_ai_analysis


class RunAIAnalysisView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @staticmethod
    def _normalize_target_stack(value):
        if value is None:
            return []
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        return [str(value).strip()]

    def post(self, request, job_id):
        job = get_object_or_404(JobApplication, id=job_id, user=request.user)
        resume_id = request.data.get("resume_id")
        candidate_level = str(
            request.data.get("candidate_level", AIAnalysis.CANDIDATE_LEVEL_EXPERIENCED)
        ).strip().lower()
        target_stack = self._normalize_target_stack(request.data.get("target_stack"))

        if not resume_id:
            return Response(
                {"detail": "resume_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_levels = {
            AIAnalysis.CANDIDATE_LEVEL_FRESHER,
            AIAnalysis.CANDIDATE_LEVEL_EXPERIENCED,
        }
        if candidate_level not in allowed_levels:
            return Response(
                {"detail": "candidate_level must be either 'fresher' or 'experienced'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume = get_object_or_404(Resume, id=resume_id, user=request.user)
        if not (resume.parsed_text or "").strip():
            return Response(
                {"detail": "Selected resume is not parsed yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (job.job_description or "").strip():
            return Response(
                {"detail": "Job description is missing. Add it manually or complete extraction first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        analysis, _ = AIAnalysis.objects.update_or_create(
            job_application=job,
            defaults={
                "resume": resume,
                "candidate_level": candidate_level,
                "target_stack": target_stack,
                "status": "processing",
                "error_message": "",
            },
        )

        try:
            result = run_ai_analysis(
                job,
                resume,
                candidate_level=candidate_level,
                target_stack=target_stack,
            )
        except Exception as exc:
            analysis.status = "failed"
            analysis.error_message = str(exc)
            analysis.save(update_fields=["status", "error_message"])
            return Response(
                {
                    "status": "failed",
                    "detail": str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        analysis.status = "completed"
        analysis.resume = resume
        analysis.candidate_level = candidate_level
        analysis.target_stack = target_stack
        analysis.error_message = ""
        analysis.ats_score = result.get("ats_score", 0)
        analysis.score_breakdown = result.get("score_breakdown", {})
        analysis.missing_keywords = result.get("missing_keywords", [])
        analysis.strengths = result.get("strengths", [])
        analysis.suggestions = result.get("suggestions", [])
        analysis.save(update_fields=[
            "status",
            "resume",
            "candidate_level",
            "target_stack",
            "error_message",
            "ats_score",
            "score_breakdown",
            "missing_keywords",
            "strengths",
            "suggestions",
        ])

        serializer = AIAnalysisSerializer(analysis)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AIAnalysisResultView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, job_id):
        get_object_or_404(JobApplication, id=job_id, user=request.user)

        analysis = AIAnalysis.objects.filter(
            job_application__id=job_id,
            job_application__user=request.user
        ).first()

        if not analysis:
            return Response({"status": "pending"})

        serializer = AIAnalysisSerializer(analysis)
        return Response(serializer.data)
