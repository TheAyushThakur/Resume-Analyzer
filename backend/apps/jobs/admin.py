from django.contrib import admin
from .models import JobApplication


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):

    # Columns shown in admin list page
    list_display = (
        "id",
        "company_name",
        "job_title",
        "user",
        "description_source",
        "extraction_status",
        "created_at",
    )

    # Filters 
    list_filter = (
        "description_source",
        "extraction_status",
        "created_at",
    )

    # Search bar
    search_fields = (
        "company_name",
        "job_title",
        "user__username",
    )

    # Default ordering
    ordering = ("-created_at",)

    # Read-only fields
    readonly_fields = (
        "created_at",
        "updated_at",
    )

    # Field layout inside edit page
    fieldsets = (
        ("Job Information", {
            "fields": (
                "user",
                "company_name",
                "job_title",
                "job_url",
            )
        }),

        ("Job Description", {
            "fields": (
                "job_description",
            )
        }),

        ("Extraction Info", {
            "fields": (
                "description_source",
                "extraction_status",
            )
        }),

        ("Timestamps", {
            "fields": (
                "created_at",
                "updated_at",
            )
        }),
    )
