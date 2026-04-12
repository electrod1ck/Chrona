from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    DailySnapshot,
    GuestBookEntry,
    InsightCard,
    InspirationPost,
    MicroIntervention,
    MicroInvitation,
    Moment,
    MoodPulse,
    Profile,
    Ritual,
    Tag,
    UserNote,
)

User = get_user_model()


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


class MomentSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.none(),
        source='tags',
        write_only=True,
        required=False,
    )

    class Meta:
        model = Moment
        fields = [
            'id',
            'text',
            'emotion',
            'image_url',
            'tags',
            'tag_ids',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            self.fields['tag_ids'].child_relation.queryset = Tag.objects.filter(
                user=request.user
            )

    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        user = validated_data.pop('user', None) or self.context['request'].user
        moment = Moment.objects.create(user=user, **validated_data)
        if tags:
            moment.tags.set(tags)
        return moment

    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tags is not None:
            instance.tags.set(tags)
        return instance


class DailySnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailySnapshot
        fields = [
            'id',
            'date',
            'depth_index',
            'summary_line',
            'influences',
        ]


class RitualSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ritual
        fields = ['id', 'title', 'frequency_label', 'last_completed_at']


class MicroInterventionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MicroIntervention
        fields = ['id', 'title', 'description', 'effect_hint']


class InsightCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsightCard
        fields = ['id', 'quote']


class MicroInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MicroInvitation
        fields = ['id', 'text']


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Profile
        fields = ['display_name', 'avatar_url', 'username', 'email', 'bio']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if instance.avatar_image:
            url = instance.avatar_image.url
            ret['avatar_url'] = request.build_absolute_uri(url) if request else url
        return ret


class InspirationPostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = InspirationPost
        fields = ['id', 'body', 'image_url', 'author_name', 'created_at']

    def get_author_name(self, obj):
        if obj.author_display_override:
            return obj.author_display_override
        p = Profile.objects.filter(user_id=obj.author_id).first()
        if p and p.display_name:
            return p.display_name
        return obj.author.username

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            u = obj.image.url
            return request.build_absolute_uri(u) if request else u
        return obj.external_image_url or ''


class GuestBookEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestBookEntry
        fields = ['id', 'display_name', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']


class MoodPulseSerializer(serializers.ModelSerializer):
    class Meta:
        model = MoodPulse
        fields = ['id', 'mood', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNote
        fields = ['id', 'title', 'body', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DashboardSerializer(serializers.Serializer):
    daily_index = serializers.FloatField()
    hero_message = serializers.CharField()
    accent_saturation = serializers.FloatField()
    invitations = MicroInvitationSerializer(many=True)
