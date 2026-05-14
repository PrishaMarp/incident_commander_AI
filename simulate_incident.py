"""
Simulated incident feed: fake DB failure log lines, printed one at a time.
Run: python simulate_incident.py
"""

import time
from datetime import datetime, timezone

# Log line templates (same style as the incident-commander proposal)
DB_FAILURE_LOGS = [
    "[{ts}] ERROR  database     Connection pool exhausted (max=20, active=20, waiting=47)",
    "[{ts}] ERROR  api-gateway  upstream connect error or disconnect/reset before headers",
    "[{ts}] WARN   auth-service Retrying DB connection (attempt 3/5) host=postgres-primary",
    "[{ts}] ERROR  order-svc    pq: sorry, too many clients already",
    "[{ts}] ERROR  api-gateway  503 Service Unavailable /api/v2/orders (latency=8241ms)",
    "[{ts}] FATAL  postgres     max_connections=100 reached, refusing new connections",
    "[{ts}] ERROR  order-svc    transaction rollback: connection reset by peer",
    "[{ts}] WARN   monitoring   alert firing: db_connection_errors > 50 in last 60s",
    "[{ts}] ERROR  api-gateway  5xx error rate: 67% (threshold: 5%)",
    "[{ts}] INFO   k8s          Pod order-svc-7d9f8b restart #3 (OOMKilled: false)",
    "[{ts}] ERROR  user-svc     Unable to acquire connection within timeout of 5000ms",
    "[{ts}] WARN   pgbouncer    server connection timeout (pool_mode=transaction)",
    "[{ts}] ERROR  api-gateway  Circuit breaker OPEN for service: order-svc",
]


def main() -> None:
    for template in DB_FAILURE_LOGS:
        ts = datetime.now(timezone.utc).isoformat()
        print(template.format(ts=ts))
        time.sleep(0.5)


if __name__ == "__main__":
    main()
