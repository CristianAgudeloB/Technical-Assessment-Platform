#!/usr/bin/env bash

set -euo pipefail

api_url="${API_URL:-http://localhost:3000}"

curl --fail --silent --show-error "${api_url}/health" >/dev/null

assessment="$(curl --fail --silent --show-error \
  --request POST "${api_url}/assessments" \
  --header 'content-type: application/json' \
  --data "{\"name\":\"API validation assessment\",\"description\":\"Assessment created by the repeatable API validation script.\",\"durationMinutes\":30}")"

assessment_id="$(node -e '
  const assessment = JSON.parse(process.argv[1]);
  if (assessment.status !== "DRAFT") process.exit(1);
  process.stdout.write(assessment.id);
' "$assessment")"
draft_attempt_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --request POST "${api_url}/assessments/${assessment_id}/attempts")"

if [[ "$draft_attempt_status" != "422" ]]; then
  printf 'Expected 422 when starting a draft assessment, received %s\n' "$draft_attempt_status" >&2
  exit 1
fi

publish_without_questions_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --request POST "${api_url}/assessments/${assessment_id}/publish")"

if [[ "$publish_without_questions_status" != "422" ]]; then
  printf 'Expected 422 when publishing an assessment without exercises, received %s\n' "$publish_without_questions_status" >&2
  exit 1
fi

question="$(curl --fail --silent --show-error \
  --request POST "${api_url}/assessments/${assessment_id}/questions" \
  --header 'content-type: application/json' \
  --data '{"title":"Suma de dos números","description":"Lee dos enteros separados por espacios e imprime su suma.","position":1,"score":100,"allowedLanguages":["JAVA","JAVASCRIPT","PYTHON"],"testCases":[{"position":1,"input":"2 3\n","expectedOutput":"5\n","isHidden":false},{"position":2,"input":"-4 10\n","expectedOutput":"6\n","isHidden":true}]}')"

question_id="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).id)' "$question")"

published_assessment="$(curl --fail --silent --show-error \
  --request POST "${api_url}/assessments/${assessment_id}/publish")"

node -e '
  if (JSON.parse(process.argv[1]).status !== "PUBLISHED") process.exit(1);
' "$published_assessment"

attempt="$(curl --fail --silent --show-error \
  --request POST "${api_url}/assessments/${assessment_id}/attempts")"

attempt_id="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).id)' "$attempt")"

published_question_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --request POST "${api_url}/assessments/${assessment_id}/questions" \
  --header 'content-type: application/json' \
  --data '{"title":"Otro ejercicio","description":"Este ejercicio no debe crearse en un reto publicado.","position":2,"score":100,"allowedLanguages":["PYTHON"],"testCases":[{"position":1,"input":"1\n","expectedOutput":"1\n","isHidden":false}]}')"

if [[ "$published_question_status" != "422" ]]; then
  printf 'Expected 422 when adding an exercise to a published assessment, received %s\n' "$published_question_status" >&2
  exit 1
fi

curl --fail --silent --show-error "${api_url}/assessments" >/dev/null
curl --fail --silent --show-error "${api_url}/assessments/${assessment_id}" >/dev/null
public_question="$(curl --fail --silent --show-error "${api_url}/questions/${question_id}")"

node -e '
  const question = JSON.parse(process.argv[1]);
  const valid = question.testCases?.length === 2
    && question.testCases.every((test) => !Object.hasOwn(test, "input") && !Object.hasOwn(test, "expectedOutput"));
  if (!valid) process.exit(1);
' "$public_question"

submission="$(curl --fail --silent --show-error \
  --request POST "${api_url}/submissions" \
  --header 'content-type: application/json' \
  --data "{\"assessmentAttemptId\":\"${attempt_id}\",\"questionId\":\"${question_id}\",\"language\":\"PYTHON\",\"sourceCode\":\"print(sum(map(int, input().split())) )\\n\"}")"

submission_id="$(node -e 'const response = JSON.parse(process.argv[1]); if (!response.id) process.exit(1); process.stdout.write(response.id)' "$submission")"

unsupported_language_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --request POST "${api_url}/submissions" \
  --header 'content-type: application/json' \
  --data "{\"assessmentAttemptId\":\"${attempt_id}\",\"questionId\":\"${question_id}\",\"language\":\"COBOL\",\"sourceCode\":\"DISPLAY 'hello'.\"}")"

if [[ "$unsupported_language_status" != "422" ]]; then
  printf 'Expected 422 for an unsupported language, received %s\n' "$unsupported_language_status" >&2
  exit 1
fi

missing_question_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --request POST "${api_url}/submissions" \
  --header 'content-type: application/json' \
  --data "{\"assessmentAttemptId\":\"${attempt_id}\",\"questionId\":\"missing-question\",\"language\":\"PYTHON\",\"sourceCode\":\"print(1)\"}")"

if [[ "$missing_question_status" != "404" ]]; then
  printf 'Expected 404 for a missing question, received %s\n' "$missing_question_status" >&2
  exit 1
fi

printf 'API validation passed. Assessment: %s | Question: %s | Submission: %s\n' \
  "$assessment_id" "$question_id" "$submission_id"
