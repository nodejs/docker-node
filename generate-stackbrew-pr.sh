#!/usr/bin/env bash

set -e
. functions.sh

COMMIT_RANGE="${1}"
COMMIT_ID="$(git show -s --format="%H" "${COMMIT_RANGE}" | head -n 1)"

if [ -n "$TRAVIS" ]; then
  COMMIT_MESSAGE="${TRAVIS_COMMIT_MESSAGE}"
  BRANCH_NAME="travis-${TRAVIS_BUILD_ID}"
  GITHUB_USERNAME="${AUTOPR_GITHUB_USERNAME:-nodejs-github-bot}"
else
  COMMIT_MESSAGE="$(git show -s --format=%B "${COMMIT_ID}")"
  BRANCH_NAME="autopr-$(date +%s)"
  if [[ "$(git remote get-url origin)" =~ github.com/([^/]*)/docker-node.git ]]; then
    GITHUB_USERNAME="${BASH_REMATCH[1]}"
  fi
fi

if [[ "${COMMIT_MESSAGE}" =~ Merge\ pull\ request\ \#([0-9]*) ]]; then

  # This is a merge from a pull request
  PR_NUMBER="${BASH_REMATCH[1]}"
  COMMIT_MESSAGE="$(printf "%s" "${COMMIT_MESSAGE}" | tail -n 1)"
fi

IMAGES_FILE="library/node"
REPO_NAME="official-images"
ORIGIN_SLUG="${GITHUB_USERNAME}/${REPO_NAME}"
UPSTREAM_SLUG="${AUTOPR_UPSTREAM:-docker-library}/${REPO_NAME}"
DOCKER_SLUG="${TRAVIS_REPO_SLUG:-nodejs/docker-node}"
gitpath="../${REPO_NAME}"

function auth_header() {
  echo "Authorization: token ${GITHUB_API_TOKEN}"
}

function permission_check() {
  if [ -z "${GITHUB_API_TOKEN}" ]; then
    fatal "Environment variable \$GITHUB_API_TOKEN is missing or empty"
  fi

  auth="$(curl -H "$(auth_header)" \
    -s \
    "https://api.github.com")"

  if [ "$(echo "${auth}" | jq -r .message)" = "Bad credentials" ]; then
    fatal "Authentication Failed! Invalid \$GITHUB_API_TOKEN"
  fi

  auth="$(curl -H "$(auth_header)" \
    -s \
    "https://api.github.com/repos/${ORIGIN_SLUG}/collaborators/${GITHUB_USERNAME}/permission")"
  if [ "$(echo "${auth}" | jq -r .message)" != "null" ]; then
    fatal "\$GITHUB_API_TOKEN can't push to https://github.com/${ORIGIN_SLUG}.git"
  fi
}

function setup_git_author() {
  # Set Git User Info
  GIT_AUTHOR_NAME="Node.js GitHub Bot"
  GIT_AUTHOR_EMAIL="github-bot@iojs.org"
  GIT_COMMITTER_NAME="Node.js GitHub Bot"
  GIT_COMMITTER_EMAIL="github-bot@iojs.org"

  export GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL
}

function message() {
  echo "Node: ${COMMIT_MESSAGE}"
}

function pr_payload() {
  local escaped_message
  local body
  local maintainers

  escaped_message="$(echo "${COMMIT_MESSAGE}" | sed -E -e "s/\"/\\\\\"/g")"

  if [ -n "${PR_NUMBER}" ]; then
    body="Pull Request: ${DOCKER_SLUG}#${PR_NUMBER}"
  else
    body="Commit: https://github.com/${DOCKER_SLUG}/compare/${COMMIT_RANGE}"
  fi

  for maintainer in $(xargs < ACTIVE_MAINTAINERS); do
    maintainers="$maintainers @$maintainer"
  done

  printf "{
    \"title\": \"Node: %s\",
    \"body\" : \"%s.<br />cc %s\",
    \"head\" : \"%s\",
    \"base\": \"master\"
  }" "${escaped_message}" "${body}" "${maintainers}" "${GITHUB_USERNAME}:${BRANCH_NAME}"
}

function comment_payload() {
  local pr_url
  pr_url="${1}"
  echo "{
    \"body\": \"Created PR to the ${REPO_NAME} repo (${pr_url}). See https://github.com/docker-library/faq#an-images-source-changed-in-git-now-what if you are wondering when it will be available on the Docker Hub.\"
  }"
}

if images_updated "${COMMIT_RANGE}"; then

  permission_check

  # Set Git User Info
  [ -z "$GIT_AUTHOR_NAME" ] && setup_git_author

  info "Cloning..."
  git clone --depth 50 "https://github.com/${UPSTREAM_SLUG}.git" ${gitpath} 2> /dev/null

  stackbrew="$(./generate-stackbrew-library.sh)"

  cd ${gitpath}

  echo "${stackbrew}" > "${IMAGES_FILE}"
  git checkout -b "${BRANCH_NAME}"
  git add "${IMAGES_FILE}"
  git commit -m "$(message)"

  info "Pushing..."
  git fetch --unshallow "https://github.com/${ORIGIN_SLUG}.git"
  git push "https://${GITHUB_API_TOKEN}:x-oauth-basic@github.com/${ORIGIN_SLUG}.git" -f "${BRANCH_NAME}" || fatal "Error pushing the updated stackbrew"

  cd - && rm -rf ${gitpath}

  info "Creating Pull request"
  pr_response_payload="$(curl -H "$(auth_header)" \
    -s \
    -X POST \
    -d "$(pr_payload)" \
    "https://api.github.com/repos/${UPSTREAM_SLUG}/pulls")"

  url="$(echo "${pr_response_payload}" | jq -r .html_url)"
  if [ "${url}" != "null" ]; then
    info "Pull request created at ${url}"

    if [ -n "${PR_NUMBER}" ]; then
      comment_endpoint="https://api.github.com/repos/${DOCKER_SLUG}/issues/${PR_NUMBER}/comments"
    else
      comment_endpoint="https://api.github.com/repos/${DOCKER_SLUG}/commits/${COMMIT_ID}/comments"
    fi

    info "Creating Commit Comment"
    commit_response_payload="$(curl -H "$(auth_header)" \
      -s \
      -X POST \
      -d "$(comment_payload "${url}")" \
      "${comment_endpoint}")"

    if [ "$(echo "${commit_response_payload}" | jq -r .message)" != "null" ]; then
      fatal "Error linking the pull request (${error_message})"
    else
      comment_url="$(echo "${commit_response_payload}" | jq -r .html_url)"
      info "Created comment at ${comment_url}"
    fi
  else
    error_message=$(echo "${pr_response_payload}" | jq -r .message)
    fatal "Error creating pull request (${error_message})"
  fi
else
  info "No change!"
fi
