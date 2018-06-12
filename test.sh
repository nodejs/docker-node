#!/usr/bin/env bash
. functions.sh

images_updated "947280600648b70e067d35415d6812fd03127def" "35f1c9e977d23bd306212c73612f7bf55bc6d615" && echo "test"
images_updated "947280600648b70e067d35415d6812fd03127def..35f1c9e977d23bd306212c73612f7bf55bc6d615" && echo "test"
images_updated "947280600648b70e067d35415d6812fd03127def" && echo "test"
images_updated || echo "test"
images_updated "e5cebee5dbf9...4000fe6354dd" || echo "test"
