#!/usr/bin/env bash
#
# Compute the SPKI-SHA256 pin for a hostname's TLS certificate chain.
#
# Output is the base64-encoded SHA-256 of the leaf certificate's
# SubjectPublicKeyInfo — the value to paste into:
#   • android/app/src/main/res/xml/network_security_config.xml
#   • ios/App/App/Info.plist (NSPinnedDomains > NSPinnedCAIdentities)
#
# Usage:
#   ./scripts/security/compute-spki-pin.sh slirphzzwcogdbkeicff.supabase.co
#   ./scripts/security/compute-spki-pin.sh api.stripe.com
#
# To get the *backup* pin (next cert in the chain), pass --depth=1:
#   ./scripts/security/compute-spki-pin.sh api.stripe.com --depth=1
#
# Requires: openssl

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <hostname> [--depth=N]" >&2
  exit 1
fi

host="$1"
depth=0
shift || true
for arg in "$@"; do
  case "$arg" in
    --depth=*) depth="${arg#--depth=}" ;;
  esac
done

# Pull the cert at the requested chain depth and hash its SPKI.
echo "Pinning chain depth $depth for $host"
echo | openssl s_client -servername "$host" -connect "$host:443" -showcerts 2>/dev/null \
  | awk -v d="$depth" '/-----BEGIN CERTIFICATE-----/{c++} c==d+1{print}' \
  | openssl x509 -pubkey -noout 2>/dev/null \
  | openssl pkey -pubin -outform der 2>/dev/null \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64

echo
echo "Paste this value as one entry in your pin-set / NSPinnedCAIdentities."
