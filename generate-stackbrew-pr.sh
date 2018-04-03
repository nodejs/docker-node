#!/bin/bash
set -e
. functions.sh

GITHUB_USERNAME="nodejs-github-bot"
gitpath="../docker-images"
IMAGES_FILE="library/node"
REPO_NAME="official-images"
BRANCH_NAME="travis-$TRAVIS_BUILD_ID"
ORIGIN_SLUG="$GITHUB_USERNAME/$REPO_NAME"
#UPSTREAM_SLUG="docker-library/$REPO_NAME"

function updated() {
	local versions
	local images_changed

	IFS=' ' read -ra versions <<< "$(IFS=','; get_versions)"
	images_changed=$(git show --name-only "$TRAVIS_COMMIT" "${versions[@]}")

	if [ -z "$images_changed" ]; then
		return 1
	else
		return 0
	fi
}

function permission_check() {
	auth="$(curl -H "Authorization: token $GITHUB_API_TOKEN" \
		-s \
		"https://api.github.com")"
	if [ "$(echo "$auth" | jq .message)" = "\"Bad credentials\"" ]; then
		fatal "Authentication Failed! Invalid \$GITHUB_API_TOKEN"
	fi

	auth="$(curl -H "Authorization: token $GITHUB_API_TOKEN" \
		-s \
		"https://api.github.com/repos/$ORIGIN_SLUG/collaborators/$GITHUB_USERNAME/permission")"
	if [ "$(echo "$auth" | jq .message)" != "null" ]; then
		fatal "\$GITHUB_API_TOKEN can't push to https://github.com/$ORIGIN_SLUG.git"
	fi
}

function setup_git_author() {
	GIT_AUTHOR_NAME="$(git show -s --format="%aN" "$TRAVIS_COMMIT")"
	GIT_AUTHOR_EMAIL="$(git show -s --format="%aE" "$TRAVIS_COMMIT")"
	GIT_COMMITTER_NAME="$(git show -s --format="%cN" "$TRAVIS_COMMIT")"
	GIT_COMMITTER_EMAIL="$(git show -s --format="%cN" "$TRAVIS_COMMIT")"

	export GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL
}

function message() {
	echo "Node: $TRAVIS_COMMIT_MESSAGE"
}

function pr_payload() {
	local escaped_message
	IFS=' ' read -ra escaped_message <<< "$TRAVIS_COMMIT_MESSAGE"
	escaped_message="$(printf '%q ' "${escaped_message[@]}")"
	echo '{
		"title": "Node: '"$escaped_message"'",
		"body": "Commit: nodejs/docker-node@'"$TRAVIS_COMMIT"'",
		"head": "'"$GITHUB_USERNAME"':'"$BRANCH_NAME"'",
		"base": "master"
	}'
}

if updated; then

	permission_check

	# Set Git User Info
	setup_git_author

	info "Cloning..."
	git clone --depth 50  https://github.com/docker-library/official-images.git $gitpath 2> /dev/null

	./generate-stackbrew-library.sh > "$gitpath/$IMAGES_FILE"

	cd $gitpath

	git checkout -b "$BRANCH_NAME"
	git add "$IMAGES_FILE"
	git commit -m "$(message)"

	info "Pushing..."
	git push "https://$GITHUB_API_TOKEN:x-oauth-basic@github.com/$ORIGIN_SLUG.git" -f "$BRANCH_NAME" 2> /dev/null || fatal "Error pushing the updated stackbrew"

	#info "Creating Pull request"
	#response_payload="$(curl -H "Authorization: token $GITHUB_API_TOKEN" \
	#	-s \
	#	-X POST \
	#	-d "$(pr_payload)" \
	#	"https://api.github.com/repos/$UPSTREAM_SLUG/pulls")"

	#url="$(echo "$response_payload" | jq .html_url)"
	#if [ "$url" != "null" ]; then
	#	info "Pull request created at $url"
	#else
	#	error_message=$(echo "$response_payload" | jq .message)
	#	fatal "Error creating pull request ($error_message)"
	#fi
else
	info "No change!"
fi
