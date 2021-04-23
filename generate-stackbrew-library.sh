#!/usr/bin/env bash
set -Eeuo pipefail

declare -A aliases=(
  [10]='10 dubnium'
  [12]='12 erbium'
  [14]='14 fermium lts'
  [15]='15'
  [16]='16 latest current'
)

defaultDebianSuite='buster'
declare -A debianSuite=(
  #[1.13-rc]='buster'
)
defaultAlpineVersion='3.11'
declare -A alpineVersion=(
  [16]='3.13'
)

self="$(basename "$BASH_SOURCE")"
cd "$(dirname "$(readlink -f "$BASH_SOURCE")")"

if [ "$#" -eq 0 ]; then
  versions="$(jq -r 'keys | map(@sh) | join(" ")' versions.json)"
  eval "set -- $versions"
fi

# sort version numbers with highest first
IFS=$'\n'
set -- $(sort -rV <<<"$*")
unset IFS

# get the most recent commit which modified any of "$@"
fileCommit() {
  git log -1 --format='format:%H' HEAD -- "$@"
}

# get the most recent commit which modified "$1/Dockerfile" or any file COPY'd from "$1/Dockerfile"
dirCommit() {
  local dir="$1"
  shift
  (
    cd "$dir"
    files="$(
      git show HEAD:./Dockerfile | awk '
        toupper($1) == "COPY" {
          for (i = 2; i < NF; i++) {
            if ($i ~ /^--from=/) {
              next
            }
            print $i
          }
        }
        '
    )"
    fileCommit Dockerfile $files
  )
}

getArches() {
  local repo="$1"
  shift
  local officialImagesUrl='https://github.com/docker-library/official-images/raw/master/library/'

  eval "declare -g -A parentRepoToArches=( $(
    find -name 'Dockerfile' -exec awk '
        toupper($1) == "FROM" && $2 !~ /^('"$repo"'|scratch|.*\/.*)(:|$)/ {
          print "'"$officialImagesUrl"'" $2
        }
      ' '{}' + |
      sort -u |
      xargs bashbrew cat --format '[{{ .RepoName }}:{{ .TagName }}]="{{ join " " .TagEntry.Architectures }}"'
  ) )"
}
getArches 'node'

cat <<-EOH
# this file is generated via https://github.com/nodejs/docker-node/blob/$(fileCommit "$self")/$self

Maintainers: The Node.js Docker Team <https://github.com/nodejs/docker-node> (@nodejs)
GitRepo: https://github.com/nodejs/docker-node.git
GitFetch: refs/heads/main
EOH

# prints "$2$1$3$1...$N"
join() {
  local sep="$1"
  shift
  local out
  printf -v out "${sep//%/%%}%s" "$@"
  echo "${out#$sep}"
}

for version; do
  export version
  variants="$(jq -r '.[env.version].variants | map(@sh) | join(" ")' versions.json)"
  eval "variants=( $variants )"

  fullVersion="$(jq -r '.[env.version].version' versions.json)"
  [[ "$fullVersion" == *.*[^0-9]* ]] || fullVersion+='.0'

  versionAliases=(
    $version
    $(echo "${fullVersion}" | cut -d'.' -f1).$(echo "${fullVersion}" | cut -d'.' -f2)
    ${aliases[$version]:-}
  )

  for v in "${variants[@]}"; do
    dir="$version/$v"
    [ -f "$dir/Dockerfile" ] || continue

    variant="$(basename "$v")"
    versionSuite="${debianSuite[$version]:-$defaultDebianSuite}"

    if [ "$version" = "$fullVersion" ]; then
      baseAliases=("${versionAliases[@]}")
    else
      baseAliases=($fullVersion "${versionAliases[@]}")
    fi
    variantAliases=("${baseAliases[@]/%/-$variant}")
    variantAliases=("${variantAliases[@]//latest-/}")

    if [ "${variant#alpine}" = "${alpineVersion[$version]:-$defaultAlpineVersion}" ]; then
      variantAliases+=("${baseAliases[@]/%/-alpine}")
      variantAliases=("${variantAliases[@]//latest-/}")
    fi

    case "$v" in
    windows/*)
      variantArches='windows-amd64'
      ;;

    *)
      variantParent="$(awk 'toupper($1) == "FROM" { print $2 }' "$dir/Dockerfile")"
      variantArches="${parentRepoToArches[$variantParent]}"

      if [ "$variant" = 'stretch' ]; then
        # stretch's "golang-go" package fails to build (TODO try backports?)
        variantArches="$(sed <<<" $variantArches " -e 's/ arm32v5 / /g')"
        # "gccgo" in stretch can't build mips64le
        variantArches="$(sed <<<" $variantArches " -e 's/ mips64le / /g')"
      fi
      ;;
    esac

    # cross-reference with supported architectures
    for arch in $variantArches; do
      if ! jq -e --arg arch "$arch" '.[env.version].arches[$arch].supported' versions.json &>/dev/null; then
        variantArches="$(sed <<<" $variantArches " -e "s/ $arch / /g")"
      fi
    done
    # TODO rewrite this whole loop into a single jq expression :)
    variantArches="${variantArches% }"
    variantArches="${variantArches# }"
    if [ -z "$variantArches" ]; then
      echo >&2 "error: '$dir' has no supported architectures!"
      exit 1
    fi

    sharedTags=()
    for windowsShared in windowsservercore nanoserver; do
      if [[ "$variant" == "$windowsShared"* ]]; then
        sharedTags=("${baseAliases[@]/%/-$windowsShared}")
        sharedTags=("${sharedTags[@]//latest-/}")
        break
      fi
    done
    if [ "$variant" = "$versionSuite" ] || [[ "$variant" == 'windowsservercore'* ]]; then
      sharedTags+=("${baseAliases[@]}")
    fi

    constraints=
    if [ "$variant" != "$v" ]; then
      constraints="$variant"
      if [[ "$variant" == nanoserver-* ]]; then
        # nanoserver variants "COPY --from=...:...-windowsservercore-... ..."
        constraints+=", windowsservercore-${variant#nanoserver-}"
      fi
    fi

    commit="$(dirCommit "$dir")"

    echo
    echo "Tags: $(join ', ' "${variantAliases[@]}")"
    if [ "${#sharedTags[@]}" -gt 0 ]; then
      echo "SharedTags: $(join ', ' "${sharedTags[@]}")"
    fi
    cat <<-EOE
Architectures: $(join ', ' $variantArches)
GitCommit: $commit
Directory: $dir
EOE
    [ -z "$constraints" ] || echo "Constraints: $constraints"
  done
done
