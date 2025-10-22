import json
from datetime import timezone

from apps.news.models import ArticlePage


def main():
    qs = (
        ArticlePage.objects.live()
        .filter(categories__isnull=True)
        .order_by("-first_published_at")
        .values("title", "first_published_at")[:5]
    )
    out = []
    for x in qs:
        dt = x.get("first_published_at")
        ts = int(dt.replace(tzinfo=timezone.utc).timestamp()) if dt else None
        out.append({"title": x.get("title", ""), "ts": ts})
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()


