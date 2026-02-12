from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Resume
from .utils.pdf_parser import extract_text_from_pdf


@receiver(pre_save, sender=Resume)
def capture_old_file(sender, instance, **kwargs):
    # store previous file name on the instance so post_save can detect changes
    if instance.pk:
        try:
            old = Resume.objects.get(pk=instance.pk)
            instance._old_file = old.file.name if old.file else None
        except Resume.DoesNotExist:
            instance._old_file = None
    else:
        instance._old_file = None


@receiver(post_save, sender=Resume)
def parse_resume(sender, instance, created, **kwargs):
    # Determine whether we should (re)parse the resume:
    # - newly created
    # - file changed
    # - parsed_text is empty (user cleared it)
    should_parse = False

    if instance.file:
        old_file = getattr(instance, '_old_file', None)
        if created:
            should_parse = True
        elif old_file != instance.file.name:
            should_parse = True
        elif not instance.parsed_text:
            should_parse = True

    if should_parse:
        try:
            text = extract_text_from_pdf(instance.file.path)
            instance.parsed_text = text
            instance.save(update_fields=["parsed_text"])
        except Exception:
            pass
