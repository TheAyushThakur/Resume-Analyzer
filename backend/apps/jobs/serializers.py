from rest_framework import serializers
from .models import JobApplication


class JobApplicationSerializer(serializers.ModelSerializer):
    job_description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = JobApplication
        fields = '__all__'
        read_only_fields = ('user', 'description_source', 'extraction_status', 'extraction_error')
        extra_kwargs = {
            "job_url": {"required": False, "allow_null": True, "allow_blank": True}
        }

    def validate(self, attrs):
        instance = self.instance

        job_url = attrs.get("job_url", getattr(instance, "job_url", None))
        company_name = attrs.get("company_name", getattr(instance, "company_name", ""))
        job_title = attrs.get("job_title", getattr(instance, "job_title", ""))
        job_description = attrs.get("job_description", getattr(instance, "job_description", ""))

        has_url = bool((job_url or "").strip())
        has_company = bool((company_name or "").strip())
        has_title = bool((job_title or "").strip())
        has_description = bool((job_description or "").strip())

        if not has_url and not (has_company and has_title and has_description):
            raise serializers.ValidationError(
                "Provide a job URL or provide all manual fields: company_name, job_title, and job_description."
            )

        return attrs
