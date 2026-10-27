#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="lbma-db-test-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
for attempt in {1..30}; do
  if docker logs "$container" 2>&1 | rg -q 'PostgreSQL init process complete' && docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < tests/database-bootstrap.sql
# Reapply the complete migration chain to exercise idempotence.
for pass in 1 2; do
  for migration in supabase/migrations/*.sql; do
    docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < "$migration"
  done
done
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < tests/database.test.sql
