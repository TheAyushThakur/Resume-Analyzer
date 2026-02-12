from rest_framework import serializers
from .models import AIAnalysis

class AIAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIAnalysis
        fields = '__all__'
    