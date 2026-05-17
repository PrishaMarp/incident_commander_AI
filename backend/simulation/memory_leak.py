"""Simulated memory leak — heap growth, GC pressure, OOM from unclosed connection pool."""

import time
from collections.abc import Callable
from datetime import datetime, timezone

MEMORY_LEAK_LOGS = [
    "[{ts}] WARN   worker-batch JVM heap used: 1.2GiB / 2.0GiB (60%) job=sync-connections",
    "[{ts}] WARN   worker-batch GC pause 842ms (young) heap_after=1.28GiB",
    "[{ts}] WARN   monitoring   jvm_heap_usage > 75% service=worker-batch pod=worker-batch-9c4f2",
    "[{ts}] ERROR  worker-batch java.lang.OutOfMemoryError: Java heap space at com.acme.pool.ConnectionFactory.borrow",
    "[{ts}] WARN   worker-batch JVM heap used: 1.7GiB / 2.0GiB (85%) retained_objects=ConnectionPool$Lease",
    "[{ts}] ERROR  worker-batch Failed to allocate buffer size=65536 in background sync thread",
    "[{ts}] WARN   k8s          Pod worker-batch-9c4f2 memory 92% of limit (request=2Gi limit=2Gi)",
    "[{ts}] ERROR  worker-batch GC overhead limit exceeded; spent 98% of time in GC last 60s",
    "[{ts}] WARN   worker-batch Leak suspect: 18420 instances of java.sql.Connection held by pool sync job",
    "[{ts}] ERROR  api-gateway  502 Bad Gateway /api/v2/batch/status upstream=worker-batch (no healthy endpoints)",
    "[{ts}] FATAL  worker-batch Process terminated: OOMKilled (exit 137) container=worker-batch",
    "[{ts}] INFO   k8s          Pod worker-batch-9c4f2 restart #1 (reason=OOMKilled)",
    "[{ts}] WARN   monitoring   alert firing: container_oom_killed service=worker-batch",
    "[{ts}] ERROR  scheduler    Job sync-connections failed 14 consecutive runs after pod restart",
]


def render_log_lines() -> list[str]:
    ts = datetime.now(timezone.utc).isoformat()
    return [template.format(ts=ts) for template in MEMORY_LEAK_LOGS]


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
