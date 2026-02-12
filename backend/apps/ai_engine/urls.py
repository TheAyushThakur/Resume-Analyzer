from django.urls import path
from .views import RunAIAnalysisView, AIAnalysisResultView

urlpatterns = [
    path('analyze/<int:job_id>/', RunAIAnalysisView.as_view(), name='run-ai-analysis'),
    path('result/<int:job_id>/', AIAnalysisResultView.as_view(), name='ai-analysis-result'),
]