import time
from typing import Callable, Any, Dict

from django.core.cache import cache


class CircuitOpenError(Exception):
    pass


class CircuitBreaker:
    """
    Minimal cache-based circuit breaker.

    - failure_threshold: failures within rolling_window to trip the breaker
    - recovery_timeout: seconds to keep OPEN before HALF-OPEN trial
    - rolling_window: seconds window for counting failures (implemented via key TTL)
    """

    def __init__(self, name: str, failure_threshold: int = 5, recovery_timeout: int = 30, rolling_window: int = 60):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.rolling_window = rolling_window

    @property
    def _keys(self) -> Dict[str, str]:
        prefix = f"cb:{self.name}:"
        return {
            "fails": prefix + "fails",
            "open_until": prefix + "open_until",
        }

    def _now(self) -> float:
        return time.time()

    def _is_open(self) -> bool:
        open_until = cache.get(self._keys["open_until"]) or 0
        return self._now() < float(open_until)

    def _record_failure(self) -> int:
        key = self._keys["fails"]
        # use add to initialize with TTL; then increment
        added = cache.add(key, 0, timeout=self.rolling_window)
        try:
            # some cache backends may not support incr on non-int
            count = cache.incr(key)
        except Exception:
            current = cache.get(key) or 0
            current = int(current) + 1
            cache.set(key, current, timeout=self.rolling_window)
            count = current
        return int(count)

    def _reset_failures(self) -> None:
        cache.delete(self._keys["fails"])

    def _trip(self) -> None:
        cache.set(self._keys["open_until"], self._now() + self.recovery_timeout, timeout=self.recovery_timeout)

    def call(self, func: Callable[..., Any], *args, **kwargs) -> Any:
        if self._is_open():
            raise CircuitOpenError(f"Circuit '{self.name}' open")

        try:
            result = func(*args, **kwargs)
            # success: reset failure counter
            self._reset_failures()
            return result
        except Exception:
            count = self._record_failure()
            if count >= self.failure_threshold:
                self._trip()
            raise


_registry: Dict[str, CircuitBreaker] = {}


def get_breaker(name: str, *, failure_threshold: int = 5, recovery_timeout: int = 30, rolling_window: int = 60) -> CircuitBreaker:
    if name not in _registry:
        _registry[name] = CircuitBreaker(name, failure_threshold=failure_threshold, recovery_timeout=recovery_timeout, rolling_window=rolling_window)
    return _registry[name]


