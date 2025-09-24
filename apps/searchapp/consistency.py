from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

from django.conf import settings
from wagtail.models import Site
from apps.news.models import ArticlePage

from .client import get_client
from .simple_index import get_index_name  # 🎯 使用简化索引


logger = logging.getLogger(__name__)


@dataclass
class ConsistencyResult:
    site: str
    db_count: int
    os_count: int
    diff: int
    diff_ratio: float
    missing_in_os: List[int]
    orphan_in_os: List[int]
    severity: str  # ok | warning | critical
    details: Dict[str, Any]


def _get_db_count(site_hostname: str) -> int:
    site = Site.objects.get(hostname=site_hostname)
    return ArticlePage.objects.live().descendant_of(site.root_page).count()


def _get_os_count(site_hostname: str) -> int:
    client = get_client()
    alias = get_index_name(site_hostname)  # 🎯 使用简化索引
    q = {"query": {"term": {"site": site_hostname}}}
    try:
        resp = client.count(index=alias, body=q)
        return int(resp.get("count", 0))
    except Exception as e:
        logger.warning("OpenSearch count failed for %s: %s", site_hostname, e)
        return -1


def _sample_missing_in_os(site_hostname: str, sample_size: int = 50) -> List[int]:
    site = Site.objects.get(hostname=site_hostname)
    sample_qs = (
        ArticlePage.objects.live()
        .descendant_of(site.root_page)
        .order_by("-first_published_at")
        .values_list("id", flat=True)[:sample_size]
    )
    ids = list(sample_qs)
    if not ids:
        return []
    client = get_client()
    alias = get_index_name(site_hostname)  # 🎯 使用简化索引
    try:
        resp = client.mget(index=alias, body={"ids": [str(i) for i in ids]})
        missing = [ids[i] for i, d in enumerate(resp.get("docs", [])) if not d.get("found")]
        return missing
    except Exception as e:
        logger.warning("OpenSearch mget failed for %s: %s", site_hostname, e)
        return []


def _sample_orphan_in_os(site_hostname: str, sample_size: int = 50) -> List[int]:
    client = get_client()
    alias = get_index_name(site_hostname)  # 🎯 使用简化索引
    try:
        resp = client.search(
            index=alias,
            body={
                "query": {"term": {"site": site_hostname}},
                "sort": [{"publish_time": {"order": "desc"}}],
            },
            size=sample_size,
            _source=False,
        )
        os_ids = [int(hit.get("_id")) for hit in resp.get("hits", {}).get("hits", []) if hit.get("_id")]
        if not os_ids:
            return []
        db_ids = set(ArticlePage.objects.filter(id__in=os_ids).values_list("id", flat=True))
        return [i for i in os_ids if i not in db_ids]
    except Exception as e:
        logger.warning("OpenSearch search failed for %s: %s", site_hostname, e)
        return []


def run_consistency_check(site_hostname: str, *, warn_ratio: float = 0.02, crit_ratio: float = 0.05, warn_missing: int = 5, crit_missing: int = 15) -> ConsistencyResult:
    db_count = _get_db_count(site_hostname)
    os_count = _get_os_count(site_hostname)

    diff = -1
    diff_ratio = 0.0
    if db_count >= 0 and os_count >= 0:
        diff = abs(db_count - os_count)
        diff_ratio = (diff / db_count) if db_count > 0 else (0.0 if os_count == 0 else 1.0)

    missing_in_os = _sample_missing_in_os(site_hostname)
    orphan_in_os = _sample_orphan_in_os(site_hostname)

    # Determine severity
    severity = "ok"
    if diff_ratio >= crit_ratio or len(missing_in_os) >= crit_missing:
        severity = "critical"
    elif diff_ratio >= warn_ratio or len(missing_in_os) >= warn_missing:
        severity = "warning"

    details = {
        "thresholds": {
            "warn_ratio": warn_ratio,
            "crit_ratio": crit_ratio,
            "warn_missing": warn_missing,
            "crit_missing": crit_missing,
        }
    }

    return ConsistencyResult(
        site=site_hostname,
        db_count=db_count,
        os_count=os_count,
        diff=diff,
        diff_ratio=round(diff_ratio, 4),
        missing_in_os=missing_in_os,
        orphan_in_os=orphan_in_os,
        severity=severity,
        details=details,
    )


def send_alert(result: ConsistencyResult) -> bool:
    if result.severity == "ok":
        return True
    try:
        subject = f"[一致性告警][{result.severity.upper()}] Site={result.site} DB={result.db_count} OS={result.os_count} Diff={result.diff} ({result.diff_ratio*100:.2f}%)"
        lines = [
            subject,
            f"missing_in_os (sample {len(result.missing_in_os)}): {result.missing_in_os[:20]}",
            f"orphan_in_os (sample {len(result.orphan_in_os)}): {result.orphan_in_os[:20]}",
        ]
        logger.warning("\n".join(lines))

        recipients = getattr(settings, "STORAGE_ALERT_EMAILS", [])
        if recipients:
            from django.core.mail import send_mail
            send_mail(
                subject=subject,
                message="\n".join(lines),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@aivoya.com'),
                recipient_list=recipients,
                fail_silently=True,
            )
        return True
    except Exception as e:
        logger.error("发送一致性告警失败: %s", e)
        return False


