#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Instale a CLI: npm i -g vercel"
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "Faça login primeiro: vercel login"
  exit 1
fi

if [[ ! -d .vercel ]]; then
  echo "Vinculando ao projeto petcuida…"
  vercel link --yes --project petcuida
fi

echo "Build local…"
npm run build

echo "Deploy produção → https://petcuida.vercel.app"
vercel deploy --prod --yes

echo "Concluído."
