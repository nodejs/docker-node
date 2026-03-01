# Repository Guidelines

## Dos and Don'ts

- Do run Node.js version updates through `./update.sh` so Dockerfiles, musl checksums, and Yarn pins stay synchronized with the templates in `Dockerfile-*.template` and helpers in `functions.sh`.
- Do refresh signing keys with `./update-keys.sh` whenever upstream release keys change; the script keeps `keys/node.keys` aligned with <https://github.com/nodejs/node#release-keys>.
- Do consult `versions.json`, `architectures`, and `config` before adding or removing variants so metadata consumed by `stackbrew.js` and CI stays coherent.
- Don't modify any per-variant `docker-entrypoint.sh`; keep each copy identical to the root entrypoint—automation expects identical logic across `*/docker-entrypoint.sh`.
- Don't merge Alpine Dockerfiles with placeholder `CHECKSUM=""`; populate the musl checksum so `.github/workflows/missing-checksum.yml` passes.
- Don't skip formatting and static analysis for shell changes; see Coding Style for the exact tooling and CI coverage.

## Project Structure and Module Organization

- The root folders named for each supported Node.js major release (for example `20/` or `22/`) group Docker image definitions by major Node.js release; each variant directory (for example `22/bookworm` or `24/alpine3.22`) contains a `Dockerfile` and a scoped copy of `docker-entrypoint.sh`.
- Shared templates (`Dockerfile-alpine.template`, `Dockerfile-debian.template`, `Dockerfile-slim.template`) feed `update.sh` when generating or refreshing Dockerfiles.
- Global metadata lives in `config`, `architectures`, and `versions.json`; helper logic in `functions.sh` reads these files to resolve defaults, supported variants, and tagging.
- Release automation and maintenance tooling reside at the repository root: `update.sh`, `update-keys.sh`, `stackbrew.js`, `build-automation.mjs`, `genMatrix.js`, and `docker-entrypoint.sh`.
- Continuous integration workflows are in `.github/workflows/`, notably `build-test.yml`, `automatic-updates.yml`, `official-pr.yml`, `shfmt.yml`, `doctoc.yml`, and `markdown-link-check.yml`.
- Project-wide documentation and policies live in `README.md`, `docs/BestPractices.md`, `CONTRIBUTING.md`, `GOVERNANCE.md`, and `SECURITY.md`.

## Build, Test, and Development Commands

- Targeted image builds use the Docker CLI; for example `docker build -t node-local -f 22/bookworm/Dockerfile .` exercises the `22/bookworm` variant without touching other directories.
- After building, validate the entrypoint and runtime with `docker run --rm node-local node --print "process.versions.node"` and compare the output to the `ENV NODE_VERSION` in the edited `Dockerfile`.
- Use `./update.sh -h` to review options, then run commands such as `./update.sh 22` or `./update.sh 22 alpine3.22` to regenerate Dockerfiles and checksums; see `update.sh` for full behavior.
- Regenerate the official manifest with `node stackbrew.js > ../official-images/library/node` before proposing downstream updates.
- Direct the output to a sibling clone of `docker-library/official-images` (for example, `git clone https://github.com/docker-library/official-images ../official-images`).
- The script consumes `versions.json` and the tracked Dockerfiles.
- Documentation checks mirror CI; review `.github/workflows/` for the latest coverage. Common commands:

  ```sh
  doctoc --title='## Table of Contents' --github README.md
  doctoc --title='## Table of Contents' --github docs/BestPractices.md
  find . -name "*.md" | xargs -n 1 markdown-link-check -c markdown_link_check_config.json -q
  ```

## Coding Style and Naming Conventions

- Follow `.editorconfig`: UTF-8 files, LF endings, 2-space indentation, trimmed trailing whitespace, and final newlines.
- Shell scripts must format with `shfmt -sr -i 2 -ci` and stay `shellcheck` clean, matching `.github/workflows/shfmt.yml`; prefer POSIX `sh`-compatible syntax unless a script explicitly requires Bash.
- Dockerfiles should inherit structure from the templates, keeping instruction order (user creation, `ENV` blocks, checksum verification, smoke tests) consistent across variants.
- Markdown documents rely on Doctoc headers and the shared link-check configuration; keep generated TOCs aligned with `.github/workflows/doctoc.yml`.

## Testing Guidelines

- Lean on focused Docker builds for regression checks: rebuild only the touched `*/Dockerfile` directories and run the smoke commands from `.github/workflows/build-test.yml` (`node --version`, `npm --version`, `yarn --version`) inside the resulting image.
- When modifying Alpine variants, verify the musl tarball checksum resolves to the populated `CHECKSUM` value before pushing changes.
- Re-run documentation tooling as described above so local output matches CI expectations.
- Update signing keys or automation scripts only after validating dependent commands (`./update.sh`, `./stackbrew.js`) complete without errors in your environment.

## Commit and Pull Request Guidelines

- Follow `CONTRIBUTING.md`: create dedicated branches, run `./update.sh` for version bumps, and include only the generated artifacts you intend to land.
- Keep commit subjects short, capitalized, and imperative, mirroring recent history (`Add Node.js v25.0.0`, `chore(deps): bump actions/setup-node from 5.0.0 to 6.0.0`).
- Use the prompts in `.github/PULL_REQUEST_TEMPLATE.md` to document motivation, testing, and change type; check the appropriate boxes when evidence exists.
- Reference related issues or downstream PRs when updating `stackbrew.js` or `versions.json`, and attach CI logs or command output that demonstrate the relevant builds/tests succeeded.

## Safety and Permissions

- **Allowed without approval**: read or diff files, edit only the variants you are touching, run targeted Docker builds/tests that do not alter shared configuration, and execute the formatters/tests defined in `.github/workflows/`.
- **Ask before proceeding**: adding packages to base images, modifying `config`, `versions.json`, `architectures`, introducing new variants or templates, or changing automation scripts such as `update.sh` and `stackbrew.js`.
- **Never do**: delete supported version directories, force-push to protected branches, publish to Docker Hub manually, or ship unsigned changes to signing key lists.

## Security Notes

- Follow `SECURITY.md`: report Node.js runtime issues through <https://nodejs.org/en/security/>, and route CVEs in base images to the corresponding upstream (Alpine or Debian) before attempting fixes here.
