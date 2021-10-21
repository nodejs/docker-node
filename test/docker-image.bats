# Docs: https://bats-core.readthedocs.io/en/stable/writing-tests.html

setup() {
  tmp_file=$(mktemp)
  echo 'console.log("success")' > "${tmp_file}"
}

@test "Test for node version" {
  run -0 docker run --rm "${IMAGE_TAG}" node --print "process.versions.node"
  [ "$output" = "${NODE_VERSION}" ]
}

@test "Test for node version, without directly invoking node" {
  run -0 docker run --rm "${IMAGE_TAG}" --print "process.versions.node"
  [ "$output" = "${NODE_VERSION}" ]
}

@test "Test for npm" {
  run -0 docker run --rm "${IMAGE_TAG}" npm --version
  [ -n "$output" ]
}

@test "Test for yarn" {
  run -0 docker run --rm "${IMAGE_TAG}" yarn --version
  [ -n "$output" ]
}

@test "Verify entrypoint runs relative path pointing to regular, non-executable file with node" {
  run -0 docker run --rm -v "${tmp_file}:/index.js" "${IMAGE_TAG}" index.js
  [ "$output" = 'success' ]
}

@test "Verify entrypoint runs absolute path pointing to regular, non-executable file with node" {
  run -0 docker run --rm -v "${tmp_file}:/index.js" "${IMAGE_TAG}" /index.js
  [ "$output" = 'success' ]
}
