import requests
from typing import Dict, Any, Optional
from apps.core.utils.circuit_breaker import get_breaker

DEFAULT_TIMEOUT = 5

class HttpClient:
    def __init__(self, name: str = "http", timeout: int = DEFAULT_TIMEOUT):
        self.timeout = timeout
        self.breaker = get_breaker(name, failure_threshold=5, recovery_timeout=30, rolling_window=60)
        self.session = requests.Session()

    def get(self, url: str, *, headers: Optional[Dict[str, str]] = None, params: Optional[Dict[str, Any]] = None, timeout: Optional[int] = None):
        t = timeout or self.timeout
        return self.breaker.call(self.session.get, url, headers=headers, params=params, timeout=t)

    def post(self, url: str, *, headers: Optional[Dict[str, str]] = None, json: Optional[Dict[str, Any]] = None, timeout: Optional[int] = None):
        t = timeout or self.timeout
        return self.breaker.call(self.session.post, url, headers=headers, json=json, timeout=t)

http_client = HttpClient()
