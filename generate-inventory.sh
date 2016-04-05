#!/usr/bin/env bash
INVENTORY="images:"

gen_entry () {
  INVENTORY=$INVENTORY"
  - name: \"node:$2\"
    path: \"$1\"
    test: [\"./tests/smoke-tests/\",\"./tests/versions\"]"
}

for version in $(find . -name '[0-9]*\.[0-9]*' -type d); do
  for dir in $(find "$version" -type d); do
    tag=$(echo "$dir" | sed 's/\.\///' | sed 's/\//-/')
    gen_entry "$dir" "$tag"
  done
done

echo -e "$INVENTORY" > inventory.yml
