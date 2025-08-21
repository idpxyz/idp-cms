# Bootstrap scripts

These helpers wrap `manage.py bootstrap_sites` for three scenarios.

> Run from project root. Adjust `COMPOSE_FILES` if your compose file path differs.

## Portal only
```bash
PORTAL=portal.local:8000 \
ADMIN_EMAIL=admin@corp.local \
ADMIN_PASSWORD='StrongPass!' \
scripts/bootstrap/portal-only.sh
```

## Single site (Portal + one tenant)
```bash
PORTAL=portal.local:8000 \
SITE=news.local:8000 \
NAME="News" \
ADMIN_EMAIL=admin@corp.local \
ADMIN_PASSWORD='StrongPass!' \
scripts/bootstrap/single.sh
```

## Multi-site (Portal + A/B tenants)
```bash
PORTAL=portal.local:8000 \
A_DOMAIN=site-a.local:8000 \
B_DOMAIN=site-b.local:8000 \
NAME="News" \
ADMIN_EMAIL=admin@corp.local \
ADMIN_PASSWORD='StrongPass!' \
scripts/bootstrap/multi.sh
```
