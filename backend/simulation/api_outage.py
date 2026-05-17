"""Simulated API gateway outage — payments pool exhaustion cascading upstream."""

import time
from collections.abc import Callable
from datetime import datetime, timezone

API_OUTAGE_LOGS = [
    "[{ts}] WARN   api-gateway  latency p99=2840ms (baseline=120ms) route=/api/v2/checkout",
    "[{ts}] ERROR  api-gateway  upstream timeout host=payments-service:8080 duration=30001ms",
    "[{ts}] ERROR  payments-svc HikariPool - Connection pool exhausted (max=50, active=50, waiting=112)",
    "[{ts}] ERROR  api-gateway  503 Service Unavailable POST /api/v2/payments/charge (client_retry=0)",
    "[{ts}] ERROR  payments-svc Unable to acquire JDBC connection; pool saturated thread=http-nio-8080-exec-47",
    "[{ts}] WARN   api-gateway  circuit breaker payments-service: failure rate 62% (threshold 50%)",
    "[{ts}] ERROR  api-gateway  503 Service Unavailable GET /api/v2/orders (upstream=payments-service)",
    "[{ts}] ERROR  order-svc    downstream payments call failed: 503 upstream connect error",
    "[{ts}] ERROR  api-gateway  5xx rate spike: 41% last 60s (SLO breach checkout)",
    "[{ts}] WARN   payments-svc Thread starvation detected: 48 threads blocked on pool.acquire()",
    "[{ts}] ERROR  api-gateway  upstream connect error or disconnect/reset before headers (payments-service)",
    "[{ts}] FATAL  payments-svc Rejected execution: pool queue full (capacity=200)",
    "[{ts}] ERROR  api-gateway  Circuit breaker OPEN for service: payments-service",
    "[{ts}] WARN   monitoring   alert firing: api_gateway_5xx_rate > 25% zone=prod-us-east",
]


def render_log_lines() -> list[str]:
    ts = datetime.now(timezone.utc).isoformat()
    return [template.format(ts=ts) for template in API_OUTAGE_LOGS]


def stream_feed(
    delay_s: float = 0.5,
    on_line: Callable[[str], None] | None = None,
) -> list[str]:
    """Emit each log line (optional callback) and return all lines for triage."""
    lines = render_log_lines()
    for line in lines:
        if on_line:
            on_line(line)
        else:
            print(line)
        time.sleep(delay_s)
    return lines


def print_feed(delay_s: float = 0.5) -> list[str]:
    """Print each line to stdout; return the lines for triage."""
    return stream_feed(delay_s)


if __name__ == "__main__":
    print_feed()
