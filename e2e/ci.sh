#!/bin/bash
# CI driver: every phase logs to e2e-out/, and results are always published.
mkdir -p e2e-out
status=ok
step() { local name=$1; shift; echo "== $name" >> e2e-out/steps.txt; if ! "$@" > "e2e-out/$name.txt" 2>&1; then echo "FAILED $name" >> e2e-out/steps.txt; return 1; fi; }
step npm-install npm install --no-audit --no-fund || status=npm
if [ $status = ok ]; then
  step tsc npx tsc --noEmit -p . || true
  step unit node --test e2e/unit/ || true
  step build npm run build || status=build
fi
if [ $status = ok ]; then
  step pw-install npx -y playwright@1.47.2 install --with-deps chromium || status=pw
  npm i --no-save --no-audit --no-fund playwright@1.47.2 > e2e-out/pw-npm.txt 2>&1
  (npx next start -p 3000 > e2e-out/server.txt 2>&1 &)
  for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:3000 && break; sleep 1; done
  step scenarios node e2e/run.mjs || true
fi
echo "{\"sha\":\"$GITHUB_SHA\",\"ref\":\"$GITHUB_REF_NAME\",\"status\":\"$status\"}" > e2e-out/meta.json
