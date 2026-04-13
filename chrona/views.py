from datetime import date, timedelta

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model
from django.db.models import Avg, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import (
    AdaptedAction,
    DailySnapshot,
    InsightCard,
    InspirationPost,
    MicroIntervention,
    MicroInvitation,
    Moment,
    Place,
    Profile,
    Ritual,
    Tag,
    UserNote,
)
from .serializers import (
    AdaptedActionSerializer,
    DailySnapshotSerializer,
    DashboardSerializer,
    InsightCardSerializer,
    InspirationPostSerializer,
    MicroInterventionSerializer,
    MomentSerializer,
    PlaceSerializer,
    ProfileSerializer,
    RitualSerializer,
    TagSerializer,
    UserNoteSerializer,
)
from .services import (
    accent_saturation_from_index,
    daily_index_today,
    ensure_snapshots,
    hero_message_for_today,
    recompute_snapshot_for_day,
)

User = get_user_model()


def effective_avatar_url(profile: Profile, request) -> str:
    if profile.avatar_image:
        return request.build_absolute_uri(profile.avatar_image.url)
    return profile.avatar_url or ''


@ensure_csrf_cookie
def spa_index(request):
    from django.template.loader import render_to_string

    html = render_to_string('index.html', request=request)
    return HttpResponse(html)


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def auth_csrf(request):
    return Response({'detail': 'ok'})


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_register(request):
    username = (request.data.get('username') or '').strip()
    password = request.data.get('password') or ''
    email = (request.data.get('email') or '').strip()
    display_name = (request.data.get('display_name') or '').strip()
    if not username or len(username) < 2:
        return Response({'detail': 'Имя пользователя слишком короткое'}, status=400)
    if len(password) < 8:
        return Response({'detail': 'Пароль не короче 8 символов'}, status=400)
    if User.objects.filter(username__iexact=username).exists():
        return Response({'detail': 'Такое имя уже занято'}, status=400)
    user = User.objects.create_user(username=username, password=password, email=email)
    prof_kw: dict = {'display_name': display_name or username}
    try:
        raw_age = request.data.get('age')
        if raw_age is not None and str(raw_age).strip() != '':
            a = int(raw_age)
            if 0 < a < 130:
                prof_kw['age'] = a
    except (TypeError, ValueError):
        pass
    Profile.objects.create(user=user, **prof_kw)
    login(request, user)
    ensure_snapshots(user)
    return Response(
        {
            'id': user.id,
            'username': user.username,
            'display_name': display_name or username,
        }
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({'detail': 'Неверный логин или пароль'}, status=400)
    login(request, user)
    ensure_snapshots(user)
    profile, _ = Profile.objects.get_or_create(
        user=user,
        defaults={'display_name': user.first_name or user.username},
    )
    return Response(
        {
            'id': user.id,
            'username': user.username,
            'display_name': profile.display_name,
        }
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_logout_view(request):
    if request.user.is_authenticated:
        logout(request)
    return Response({'detail': 'ok'})


@api_view(['GET'])
@permission_classes([AllowAny])
def auth_me(request):
    if not request.user.is_authenticated:
        return Response({'authenticated': False})
    profile, _ = Profile.objects.get_or_create(
        user=request.user,
        defaults={'display_name': request.user.first_name or request.user.username},
    )
    return Response(
        {
            'authenticated': True,
            'id': request.user.id,
            'username': request.user.username,
            'display_name': profile.display_name,
            'avatar_url': effective_avatar_url(profile, request),
        }
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    user = request.user
    ensure_snapshots(user)
    idx = daily_index_today(user)
    invitations = MicroInvitation.objects.filter(is_active=True)[:5]
    data = {
        'daily_index': round(idx, 1),
        'hero_message': hero_message_for_today(user),
        'accent_saturation': accent_saturation_from_index(idx),
        'invitations': invitations,
    }
    ser = DashboardSerializer(data)
    return Response(ser.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_strip(request):
    user = request.user
    ensure_snapshots(user)
    end = date.today()
    start = end - timedelta(days=29)
    rows = {
        s.date: s
        for s in DailySnapshot.objects.filter(user=user, date__gte=start, date__lte=end)
    }
    out = []
    for i in range(30):
        d = start + timedelta(days=i)
        snap = rows.get(d)
        depth = float(snap.depth_index) if snap else 0.0
        out.append(
            {
                'date': d.isoformat(),
                'depth_index': depth,
                'summary_line': snap.summary_line if snap else '',
                'influences': snap.influences if snap else '',
            }
        )
    return Response(out)


@api_view(['GET'])
@permission_classes([AllowAny])
def experience_map(request):
    """90 days of depth for organic chart; для гостя — демо."""
    end = date.today()
    start = end - timedelta(days=89)
    if not request.user.is_authenticated:
        points = []
        for i in range(90):
            d = start + timedelta(days=i)
            depth = min(100.0, 40.0 + (i % 17) * 2.2 + (15.0 if i % 11 == 0 else 0))
            points.append(
                {'date': d.isoformat(), 'depth': round(depth, 1), 'emotion_tone': 0.5}
            )
        return Response({'points': points, 'is_demo': True})
    user = request.user
    ensure_snapshots(user, days=90)
    rows = list(
        DailySnapshot.objects.filter(user=user, date__gte=start, date__lte=end).order_by(
            'date'
        )
    )
    by_date = {r.date: r for r in rows}
    points = []
    for i in range(90):
        d = start + timedelta(days=i)
        s = by_date.get(d)
        points.append(
            {
                'date': d.isoformat(),
                'depth': float(s.depth_index) if s else 0.0,
                'emotion_tone': 0.5,
            }
        )
    return Response({'points': points})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def profile_avatar_upload(request):
    profile, _ = Profile.objects.get_or_create(
        user=request.user,
        defaults={'display_name': request.user.first_name or request.user.username},
    )
    f = request.FILES.get('image')
    if not f:
        return Response({'detail': 'Приложите файл в поле image'}, status=400)
    profile.avatar_image = f
    profile.save(update_fields=['avatar_image'])
    return Response(ProfileSerializer(profile, context={'request': request}).data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_detail(request):
    profile, _ = Profile.objects.get_or_create(
        user=request.user,
        defaults={'display_name': request.user.first_name or request.user.username},
    )
    if request.method == 'GET':
        return Response(ProfileSerializer(profile).data)
    ser = ProfileSerializer(profile, data=request.data, partial=True)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response(ser.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_stats(request):
    user = request.user
    ensure_snapshots(user, days=60)
    last_30 = DailySnapshot.objects.filter(
        user=user,
        date__gte=date.today() - timedelta(days=30),
    )
    prev_30 = DailySnapshot.objects.filter(
        user=user,
        date__gte=date.today() - timedelta(days=60),
        date__lt=date.today() - timedelta(days=30),
    )
    a1 = last_30.aggregate(a=Avg('depth_index'))['a'] or 0
    a2 = prev_30.aggregate(a=Avg('depth_index'))['a'] or 0
    delta_pct = 0.0
    if a2 > 0:
        delta_pct = round((a1 - a2) / a2 * 100, 0)
    line = (
        f'Ты прожил на {abs(int(delta_pct))}% больше, чем обычно'
        if delta_pct >= 0
        else f'Ритм чуть мягче прошлого месяца на {abs(int(delta_pct))}%'
    )
    return Response({'comparison_line': line, 'avg_depth_30d': round(float(a1), 1)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_life(request):
    """Minimal JSON export for “Экспорт жизни”."""
    user = request.user
    moments = Moment.objects.filter(user=user).values(
        'text',
        'emotion',
        'created_at',
        'image_url',
        'location',
        'integration_ref',
    )
    snaps = DailySnapshot.objects.filter(user=user).values(
        'date', 'depth_index', 'summary_line', 'influences'
    )
    return Response(
        {
            'user': user.username,
            'exported_at': timezone.now().isoformat(),
            'moments': list(moments),
            'daily_snapshots': list(snaps),
        }
    )


class TagViewSet(ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PlaceViewSet(ModelViewSet):
    serializer_class = PlaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Place.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MomentViewSet(ModelViewSet):
    serializer_class = MomentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return Moment.objects.filter(user=self.request.user).prefetch_related('tags', 'places')

    def perform_create(self, serializer):
        img = self.request.FILES.get('image')
        m = serializer.save(user=self.request.user)
        if img:
            m.image = img
            m.save(update_fields=['image'])
        recompute_snapshot_for_day(self.request.user, m.created_at.date())

    def perform_update(self, serializer):
        img = self.request.FILES.get('image')
        inst = serializer.save()
        if img:
            inst.image = img
            inst.save(update_fields=['image'])
        recompute_snapshot_for_day(self.request.user, inst.created_at.date())

    def perform_destroy(self, instance):
        day = instance.created_at.date()
        user = self.request.user
        super().perform_destroy(instance)
        recompute_snapshot_for_day(user, day)


class RitualViewSet(ModelViewSet):
    serializer_class = RitualSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Ritual.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ritual_complete(request, pk):
    ritual = Ritual.objects.filter(user=request.user, pk=pk).first()
    if not ritual:
        return Response(status=404)
    ritual.last_completed_at = timezone.now()
    ritual.save(update_fields=['last_completed_at'])
    return Response(RitualSerializer(ritual).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def interventions_list(request):
    qs = MicroIntervention.objects.all()
    return Response(MicroInterventionSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def insights_list(request):
    if request.user.is_authenticated:
        qs = InsightCard.objects.filter(Q(user=request.user) | Q(user__isnull=True)).order_by(
            'sort_order', 'id'
        )
    else:
        qs = InsightCard.objects.filter(user__isnull=True).order_by('sort_order', 'id')
    return Response(InsightCardSerializer(qs, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def inspiration_feed(request):
    if request.method == 'GET':
        qs = InspirationPost.objects.select_related('author', 'author__chrona_profile')[:120]
        ser = InspirationPostSerializer(qs, many=True, context={'request': request})
        return Response(ser.data)
    if not request.user.is_authenticated:
        return Response({'detail': 'Чтобы делиться постом, войдите в аккаунт'}, status=401)
    body = (request.data.get('body') or '').strip()
    if len(body) < 3:
        return Response({'detail': 'Добавьте хотя бы пару слов'}, status=400)
    post = InspirationPost(author=request.user, body=body[:2000])
    title = (request.data.get('title') or '').strip()[:200]
    if title:
        post.title = title
    if request.FILES.get('image'):
        post.image = request.FILES['image']
    else:
        ext = (request.data.get('external_image_url') or '').strip()[:500]
        if ext:
            post.external_image_url = ext
    post.save()
    return Response(
        InspirationPostSerializer(post, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def insights_series(request):
    end = date.today()
    start = end - timedelta(days=13)
    if not request.user.is_authenticated:
        values = []
        for i in range(14):
            d = start + timedelta(days=i)
            values.append({'date': d.isoformat(), 'value': 38.0 + (i % 5) * 6.0 + (i % 3) * 2.0})
        return Response(values)
    user = request.user
    ensure_snapshots(user, days=14)
    rows = list(
        DailySnapshot.objects.filter(user=user, date__gte=start, date__lte=end).order_by('date')
    )
    by_d = {r.date: float(r.depth_index) for r in rows}
    values = []
    for i in range(14):
        d = start + timedelta(days=i)
        values.append({'date': d.isoformat(), 'value': by_d.get(d, 0.0)})
    return Response(values)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def adapted_actions(request):
    if request.method == 'GET':
        qs = AdaptedAction.objects.filter(user=request.user).order_by('-created_at')[:80]
        return Response(AdaptedActionSerializer(qs, many=True).data)
    post_id = request.data.get('inspiration_post_id')
    mi_id = request.data.get('micro_intervention_id')
    if post_id is not None:
        ip = get_object_or_404(InspirationPost, pk=post_id)
        text = ((ip.title + ': ') if ip.title else '') + ip.body
        aa = AdaptedAction.objects.create(
            user=request.user,
            inspiration_post=ip,
            generated_action=text[:2000],
            status=AdaptedAction.STATUS_PENDING,
        )
    elif mi_id is not None:
        mi = get_object_or_404(MicroIntervention, pk=mi_id)
        aa = AdaptedAction.objects.create(
            user=request.user,
            micro_intervention=mi,
            generated_action=f'{mi.title}\n\n{mi.description}',
            status=AdaptedAction.STATUS_PENDING,
        )
    else:
        return Response(
            {'detail': 'Укажите inspiration_post_id или micro_intervention_id'},
            status=400,
        )
    return Response(AdaptedActionSerializer(aa).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def adapted_action_update(request, pk):
    aa = get_object_or_404(AdaptedAction, pk=pk, user=request.user)
    st = (request.data.get('status') or '').strip()
    valid = {c[0] for c in AdaptedAction.STATUS_CHOICES}
    if st not in valid:
        return Response({'detail': 'Некорректный status'}, status=400)
    aa.status = st
    aa.save(update_fields=['status'])
    return Response(AdaptedActionSerializer(aa).data)


class UserNoteViewSet(ModelViewSet):
    serializer_class = UserNoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserNote.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
