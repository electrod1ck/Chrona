from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from chrona.views import spa_index

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('chrona.urls')),
    path('', spa_index),
    re_path(r'^(?!api|admin|static|media).+', spa_index),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
