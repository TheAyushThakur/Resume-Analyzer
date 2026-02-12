from rest_framework import serializers
from .models import JobApplication

class JobApplicationSerializer(serializers.ModelSerializer):
    job_description = serializers.CharField(required=False, allow_blank=True)
    class Meta:
        model = JobApplication
        fields = '__all__'
        read_only_fields = ('user',)
        extra_kwargs = {
            "job_url": {"required": True}
        }
        