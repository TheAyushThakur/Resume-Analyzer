from rest_framework import generics, permissions
from .models import JobApplication
from rest_framework.response import Response
from .serializers import JobApplicationSerializer
from .services.job_extractor import extract_job_description, JobExtractionError

class JobApplicationCreateView(generics.CreateAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]


    def perform_create(self, serializer):
        job = serializer.save(user=self.request.user)

        if job.job_url:
            try:
                text = extract_job_description(job.job_url)

                job.job_description = text
                job.description_source = "extracted"
                job.extraction_status = "success"

            except JobExtractionError:
                job.extraction_status = "failed"

            job.save()

class JobApplicationListView(generics.ListAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JobApplication.objects.filter(user=self.request.user)
    
class JobApplicationDetailView(generics.RetrieveAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JobApplication.objects.filter(user=self.request.user)