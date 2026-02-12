from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .models import AIAnalysis
from apps.jobs.models import JobApplication
from .serializers import AIAnalysisSerializer
from .tasks import run_ai_analysis_task
class RunAIAnalysisView(APIView):
    
    def post(self, request, job_id):
        job = JobApplication.objects.get(id=job_id, user=request.user)
        run_ai_analysis_task.delay(job_id)
        return Response({
            "status": "processing",
            "message": "AI analysis has been started. Results will be available shortly."
        })
    
class AIAnalysisResultView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, job_id):
        analysis = AIAnalysis.objects.filter(
            job_application__id=job_id,
            job_application__user=request.user
        ).last()

        if not analysis:
            return Response({"status": "pending"})

        serializer = AIAnalysisSerializer(analysis)
        return Response(serializer.data)
        