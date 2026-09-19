#!/usr/bin/env bash

set -euo pipefail

api_url="${API_URL:-http://localhost:3000}"
suffix="$(date +%s)"

curl --fail --silent --show-error "${api_url}/health" >/dev/null

assessment="$(curl --fail --silent --show-error \
  --request POST "${api_url}/assessments" \
  --header 'content-type: application/json' \
  --data "{\"slug\":\"execution-validation-${suffix}\",\"name\":\"Execution validation assessment\",\"description\":\"Assessment used to validate the first execution flow.\",\"durationMinutes\":30,\"status\":\"PUBLISHED\"}")"

assessment_id="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).id)' "$assessment")"

attempt="$(curl --fail --silent --show-error \
  --request POST "${api_url}/assessments/${assessment_id}/attempts")"

attempt_id="$(node -e '
  const attempt = JSON.parse(process.argv[1]);
  if (attempt.status !== "ACTIVE" || !attempt.expiresAt || !attempt.serverTime) process.exit(1);
  process.stdout.write(attempt.id);
' "$attempt")"

question="$(curl --fail --silent --show-error \
  --request POST "${api_url}/assessments/${assessment_id}/questions" \
  --header 'content-type: application/json' \
  --data '{"slug":"sum-two-numbers","title":"Suma de dos números","description":"Lee dos enteros separados por espacios e imprime su suma.","position":1,"score":100,"allowedLanguages":["PYTHON"],"testCases":[{"position":1,"input":"2 3\n","expectedOutput":"5\n","isHidden":false},{"position":2,"input":"-4 10\n","expectedOutput":"6\n","isHidden":true}]}')"

question_id="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).id)' "$question")"

submission="$(curl --fail --silent --show-error \
  --request POST "${api_url}/submissions" \
  --header 'content-type: application/json' \
  --data "{\"assessmentAttemptId\":\"${attempt_id}\",\"questionId\":\"${question_id}\",\"language\":\"PYTHON\",\"sourceCode\":\"import sys\\nprint(sum(map(int, sys.stdin.read().split())))\\n\"}")"

submission_id="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).id)' "$submission")"

result="$(curl --fail --silent --show-error \
  --request POST "${api_url}/submissions/${submission_id}/execute")"

node -e '
  const result = JSON.parse(process.argv[1]);
  const valid = result.totalTests === 2
    && result.passedTests === 2
    && result.failedTests === 0
    && result.score === 100
    && result.testResults?.length === 2
    && result.testResults.every((test) => test.id && test.status === "ACCEPTED" && test.passed)
    && result.testResults[0].stdout === "5\n"
    && result.testResults[1].stdout === null
    && result.testResults[1].stderr === null;
  if (!valid) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
' "$result"

repeat_execution_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --request POST "${api_url}/submissions/${submission_id}/execute")"

if [[ "$repeat_execution_status" != "409" ]]; then
  printf 'Expected 409 when re-executing an evaluated submission, received %s\n' "$repeat_execution_status" >&2
  exit 1
fi

persisted_result="$(curl --fail --silent --show-error \
  "${api_url}/submissions/${submission_id}/results")"

node -e '
  const result = JSON.parse(process.argv[1]);
  const valid = result.submissionId
    && result.score === 100
    && result.totalTests === 2
    && result.passedTests === 2
    && result.failedTests === 0
    && result.questionsCorrect === 1
    && result.questionsIncorrect === 0
    && result.testResults?.length === 2
    && result.testResults.every((test) => test.status === "ACCEPTED" && test.passed)
    && result.testResults[0].isHidden === false
    && result.testResults[1].isHidden === true
    && result.testResults[1].stdout === null;
  if (!valid) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
' "$persisted_result"

wrong_submission="$(curl --fail --silent --show-error \
  --request POST "${api_url}/submissions" \
  --header 'content-type: application/json' \
  --data "{\"assessmentAttemptId\":\"${attempt_id}\",\"questionId\":\"${question_id}\",\"language\":\"PYTHON\",\"sourceCode\":\"print(0)\\n\"}")"

wrong_submission_id="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).id)' "$wrong_submission")"

wrong_result="$(curl --fail --silent --show-error \
  --request POST "${api_url}/submissions/${wrong_submission_id}/execute")"

node -e '
  const result = JSON.parse(process.argv[1]);
  const valid = result.totalTests === 2
    && result.passedTests === 0
    && result.failedTests === 2
    && result.score === 0
    && result.testResults?.length === 2
    && result.testResults.every((test) => test.id && test.status === "WRONG_ANSWER" && !test.passed);
  if (!valid) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
' "$wrong_result"

persisted_wrong_result="$(curl --fail --silent --show-error \
  "${api_url}/submissions/${wrong_submission_id}/results")"

node -e '
  const result = JSON.parse(process.argv[1]);
  const valid = result.score === 0
    && result.totalTests === 2
    && result.passedTests === 0
    && result.failedTests === 2
    && result.questionsCorrect === 0
    && result.questionsIncorrect === 1
    && result.testResults?.length === 2
    && result.testResults.every((test) => test.status === "WRONG_ANSWER" && !test.passed);
  if (!valid) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
' "$persisted_wrong_result"

assessment_result="$(curl --fail --silent --show-error \
  "${api_url}/assessments/${assessment_id}/attempts/${attempt_id}/results")"

node -e '
  const result = JSON.parse(process.argv[1]);
  const valid = result.status === "COMPLETED"
    && result.score === 0
    && result.totalQuestions === 1
    && result.completedQuestions === 1
    && result.questionsCorrect === 0
    && result.questionsIncorrect === 1
    && result.questionsPending === 0
    && result.questions?.[0]?.submissionId === process.argv[2]
    && result.questions?.[0]?.state === "INCORRECT";
  if (!valid) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
' "$assessment_result" "$wrong_submission_id"

docker compose exec -T postgres psql -U assessment_user -d technical_assessment \
  -c "UPDATE \"AssessmentAttempt\" SET \"expiresAt\" = NOW() - INTERVAL '1 second' WHERE id = '${attempt_id}';" \
  >/dev/null

expired_attempt="$(curl --fail --silent --show-error \
  "${api_url}/assessments/${assessment_id}/attempts/${attempt_id}")"

expired_execution_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --request POST "${api_url}/submissions/${wrong_submission_id}/execute")"

node -e '
  const attempt = JSON.parse(process.argv[1]);
  if (attempt.status !== "EXPIRED" || process.argv[2] !== "409") {
    console.error(JSON.stringify({ attempt, executionStatus: process.argv[2] }, null, 2));
    process.exit(1);
  }
' "$expired_attempt" "$expired_execution_status"

printf 'Timed execution flow passed. Accepted: %s | Wrong answer: %s | Assessment aggregate persisted | Expired attempt rejected.\n' \
  "$submission_id" "$wrong_submission_id"
