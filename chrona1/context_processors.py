from django.conf import settings


def chrona_assets(request):
    return {'CHRONA_ASSET_V': getattr(settings, 'CHRONA_ASSET_VERSION', '1')}
