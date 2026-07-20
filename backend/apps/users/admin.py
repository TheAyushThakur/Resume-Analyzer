from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("id", "username", "email", "is_active", "is_staff")
    list_filter = ("is_active", "is_staff", "is_superuser")
    search_fields = ("username", "email", "full_name")
    fieldsets = UserAdmin.fieldsets + (("Profile", {"fields": ("full_name", "onboarding_completed")}),)
