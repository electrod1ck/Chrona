"""Публичные эндпоинты (без обязательного входа)."""

from datetime import date, timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import GuestBookEntry, MicroInvitation, MoodPulse
from .serializers import GuestBookEntrySerializer, MicroInvitationSerializer, MoodPulseSerializer


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def guest_book(request):
    if request.method == 'GET':
        qs = GuestBookEntry.objects.all()[:48]
        return Response(GuestBookEntrySerializer(qs, many=True).data)
    ser = GuestBookEntrySerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def mood_pulse_create(request):
    ser = MoodPulseSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def mood_pulse_stats(request):
    since = timezone.now() - timedelta(hours=72)
    rows = (
        MoodPulse.objects.filter(created_at__gte=since)
        .values('mood')
        .annotate(c=Count('id'))
    )
    data = {r['mood']: r['c'] for r in rows}
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_dashboard_preview(request):
    """Демо-данные для гостя: полоска + индекс + приглашения из БД."""
    end = date.today()
    start = end - timedelta(days=29)
    strip = []
    for i in range(30):
        d = start + timedelta(days=i)
        depth = min(100.0, 32.0 + (i % 11) * 4.5 + (12.0 if i % 6 == 0 else 0))
        strip.append(
            {
                'date': d.isoformat(),
                'depth_index': round(depth, 1),
                'summary_line': 'Демо: так может выглядеть ваш след после нескольких дней с Chrona.',
                'influences': '',
            }
        )
    invitations = MicroInvitation.objects.filter(is_active=True)[:5]
    return Response(
        {
            'daily_index': 54.0,
            'hero_message': 'Можно просто быть здесь — вход не обязателен.',
            'accent_saturation': 0.54,
            'invitations': MicroInvitationSerializer(invitations, many=True).data,
            'daily_strip': strip,
            'is_demo': True,
            'guest_book_count': GuestBookEntry.objects.count(),
        }
    )
