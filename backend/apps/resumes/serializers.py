from rest_framework import serializers
from .models import Resume


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = '__all__'
        read_only_fields = ('user', 'parsed_text')

    def validate_job_application(self, value):
        if value is None:
            return value

        request = self.context.get("request")
        if request and value.user_id != request.user.id:
            raise serializers.ValidationError("You can only attach resumes to your own job applications.")
        return value
