from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import public_views, views

router = DefaultRouter()
router.register(r'tags', views.TagViewSet, basename='tag')
router.register(r'moments', views.MomentViewSet, basename='moment')
router.register(r'rituals', views.RitualViewSet, basename='ritual')
router.register(r'notes', views.UserNoteViewSet, basename='note')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/csrf/', views.auth_csrf),
    path('auth/register/', views.auth_register),
    path('auth/login/', views.auth_login),
    path('auth/logout/', views.auth_logout_view),
    path('auth/me/', views.auth_me),
    path('public/dashboard-preview/', public_views.public_dashboard_preview),
    path('public/guest-book/', public_views.guest_book),
    path('public/mood-pulse/', public_views.mood_pulse_create),
    path('public/mood-stats/', public_views.mood_pulse_stats),
    path('dashboard/', views.dashboard),
    path('daily-strip/', views.daily_strip),
    path('experience-map/', views.experience_map),
    path('profile/', views.profile_detail),
    path('profile/avatar/', views.profile_avatar_upload),
    path('profile/stats/', views.profile_stats),
    path('inspiration/', views.inspiration_feed),
    path('export/', views.export_life),
    path('interventions/', views.interventions_list),
    path('insights/', views.insights_list),
    path('insights/series/', views.insights_series),
    path('rituals/<int:pk>/complete/', views.ritual_complete),
]
