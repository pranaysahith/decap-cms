#!/bin/bash
# Publish only packages that haven't been published yet
# Usage: ./scripts/publish-remaining.sh YOUR_OTP

OTP=$1
if [ -z "$OTP" ]; then
  echo "Usage: $0 <OTP>"
  exit 1
fi

cd /Users/pbejgum/repos/decap-cms

for pkg in packages/*/; do
  name=$(node -p "require('./${pkg}package.json').name")
  version=$(node -p "require('./${pkg}package.json').version")

  # Check if already published
  if npm view "$name@$version" version 2>/dev/null | grep -q "$version"; then
    echo "SKIP: $name@$version already published"
  else
    echo "PUBLISHING: $name@$version..."
    npm publish "$pkg" --access public --otp="$OTP"
    if [ $? -eq 0 ]; then
      echo "SUCCESS: $name@$version"
    else
      echo "FAILED: $name@$version"
    fi
  fi
done

echo ""
echo "Done! Check npm for your packages: https://www.npmjs.com/~pranaysahith"
