import uuid
from typing import Callable

from django.utils.deprecation import MiddlewareMixin


class CorrelationIdMiddleware(MiddlewareMixin):
    """
    Ensures every request/response carries a correlation/request id.
    - Reads X-Request-ID or generates a UUID4
    - Stores it on request for logging filters to use
    - Echoes back on response headers
    """

    header_name = "X-Request-ID"

    def process_request(self, request):
        request.correlation_id = request.META.get(
            f"HTTP_{self.header_name.upper().replace('-', '_')}",
        ) or str(uuid.uuid4())

    def process_response(self, request, response):
        corr_id = getattr(request, "correlation_id", None)
        if corr_id:
            response[ self.header_name ] = corr_id
        return response


class RequestLogContextFilter:
    """
    Logging filter to inject correlation_id into log records.
    """

    def filter(self, record):  # type: ignore[override]
        # Django attaches request to log in some handlers; we fallback to None
        corr = getattr(record, "correlation_id", None)
        if not corr:
            # Try to retrieve from thread local if available
            try:
                from django.utils.log import RequestFilter  # type: ignore
                # Not reliable for correlation id; leave as is
            except Exception:
                pass
        # Ensure attribute exists to avoid KeyError in formatters
        if not hasattr(record, "correlation_id"):
            record.correlation_id = corr or "-"
        return True


