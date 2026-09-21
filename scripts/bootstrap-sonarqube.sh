#!/bin/sh
set -eu

if [ -s /run/sonar/token ]; then
  exit 0
fi

curl --fail --silent --show-error -u admin:admin -X POST "$SONAR_HOST_URL/api/users/change_password" \
  --data-urlencode 'login=admin' \
  --data-urlencode 'previousPassword=admin' \
  --data-urlencode "password=$SONARQUBE_ADMIN_PASSWORD" >/dev/null || true

curl --fail --silent --show-error -u "admin:$SONARQUBE_ADMIN_PASSWORD" -X POST "$SONAR_HOST_URL/api/user_tokens/revoke" \
  --data-urlencode 'name=technical-assessment-scanner' >/dev/null || true

token="$(curl --fail --silent --show-error -u "admin:$SONARQUBE_ADMIN_PASSWORD" -X POST "$SONAR_HOST_URL/api/user_tokens/generate" \
  --data-urlencode 'name=technical-assessment-scanner' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

test -n "$token"
umask 077
printf '%s' "$token" > /run/sonar/token
chown 10001:10001 /run/sonar/token
