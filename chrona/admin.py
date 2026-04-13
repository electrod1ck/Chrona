from django.contrib import admin

from .models import (
    AdaptedAction,
    DailySnapshot,
    GuestBookEntry,
    InsightCard,
    InspirationPost,
    MicroIntervention,
    MicroInvitation,
    Moment,
    MoodPulse,
    Place,
    Profile,
    Ritual,
    Tag,
    UserNote,
)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'display_name']


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'user']


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ['name', 'user']


@admin.register(Moment)
class MomentAdmin(admin.ModelAdmin):
    list_display = ['user', 'emotion', 'created_at']
    list_filter = ['emotion']


@admin.register(DailySnapshot)
class DailySnapshotAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'depth_index']


@admin.register(Ritual)
class RitualAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'frequency_label', 'last_completed_at']


@admin.register(MicroIntervention)
class MicroInterventionAdmin(admin.ModelAdmin):
    list_display = ['title', 'effect_hint', 'sort_order']


@admin.register(InsightCard)
class InsightCardAdmin(admin.ModelAdmin):
    list_display = ['quote', 'user', 'sort_order']


@admin.register(MicroInvitation)
class MicroInvitationAdmin(admin.ModelAdmin):
    list_display = ['text', 'sort_order', 'is_active']


@admin.register(GuestBookEntry)
class GuestBookEntryAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'created_at']
    search_fields = ['message', 'display_name']


@admin.register(MoodPulse)
class MoodPulseAdmin(admin.ModelAdmin):
    list_display = ['mood', 'created_at']


@admin.register(UserNote)
class UserNoteAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'updated_at']


@admin.register(InspirationPost)
class InspirationPostAdmin(admin.ModelAdmin):
    list_display = ['author', 'title', 'body', 'created_at']
    search_fields = ['body', 'title', 'author_display_override']


@admin.register(AdaptedAction)
class AdaptedActionAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'created_at']
    list_filter = ['status']
