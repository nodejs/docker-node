#!/bin/bash
set -e

GITHUB_USERNAME="nodejs-docker-bot"
IMAGES_FILE="library/node"

TRIGGER_COMMIT="$(git log -1 --pretty=%B)"
ISSUE_REFS=$(echo "$TRIGGER_COMMIT" | grep -o "[#][0-9]*" | sed "s/^/nodejs\/docker-node/")
GITHUB_USER_INFO="$(curl -H "Authorization: token $GITHUB_API_TOKEN" https://api.github.com/user)"
GIT_NAME=$(echo "$GITHUB_USER_INFO" | jq -r '.name')
GIT_EMAIL=$(echo "$GITHUB_USER_INFO" | jq -r '.email')

# Clone this bot's fork of the `official-images` repo.
git clone \
    "https://$GITHUB_API_TOKEN:x-oauth-basic@github.com/$GITHUB_USERNAME/official-images.git" \
    docker-images

# Reset this fork's `master` branch to `master` of fork origin.
cd docker-images
git config user.name "$GIT_NAME"
git config user.email "$GIT_EMAIL"
git remote add upstream "https://github.com/docker-library/official-images.git"
git fetch upstream
git reset --hard upstream/master

../generate-stackbrew-library.sh > "$IMAGES_FILE"

SHOULD_CREATE_PR=false

if ! git diff --quiet HEAD "$IMAGES_FILE"; then
    SHOULD_CREATE_PR=true
    git add "$IMAGES_FILE"

    # TODO: Determine what's new when drafting a commit message
    git commit -m "Node updates from $ISSUE_REFS"
fi

# Push changes to the fork.
git push origin master --force

cd ..
rm -rf docker-images

if [ $SHOULD_CREATE_PR != false ]; then
    PR_BODY=$(cat <<EOF
Related:
$ISSUE_REFS

This PR is automatically generated on changes to the Node.js Docker repository.
EOF)

    PR_DATA=$(cat <<EOF
{
    "title": "[Bot]: Update Node.js Images"
    "head": "$GITHUB_USERNAME:master"
    "base": "master"
    "body": "$(echo "$PR_BODY" | awk '{printf "%s\\n", $0}')"
}
EOF)

    curl -H "Authorization: token $GITHUB_API_TOKEN" \
        -X POST \
        -d "$PR_DATA" \
        "https://api.github.com/repos/docker-library/official-images/pulls"
else
    echo "Docker Library is already up-to-date."
fi
