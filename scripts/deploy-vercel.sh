#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOKEN_FILE="$ROOT_DIR/.env.vercel.local"

if [[ -f "$TOKEN_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$TOKEN_FILE"
  set +a
fi

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  cat <<'MESSAGE'
VERCEL_TOKEN nao encontrado.

Crie o arquivo .env.vercel.local na raiz do projeto com:

VERCEL_TOKEN=cole_o_token_da_vercel_aqui

Esse arquivo fica fora do Git pelo padrao .env.*.local.
MESSAGE
  exit 1
fi

VERCEL_PROJECT="${VERCEL_PROJECT:-oracle}"
VERCEL_TEAM="${VERCEL_TEAM:-profranceservicessara-dels-projects}"
SCOPE_ARGS=()

if [[ -n "$VERCEL_TEAM" ]]; then
  SCOPE_ARGS=(--scope "$VERCEL_TEAM")
fi

cd "$ROOT_DIR"

case "${1:-preview}" in
  link)
    vercel link --yes --project "$VERCEL_PROJECT" "${SCOPE_ARGS[@]}" --token "$VERCEL_TOKEN"
    ;;
  pull)
    vercel pull --yes --project "$VERCEL_PROJECT" "${SCOPE_ARGS[@]}" --token "$VERCEL_TOKEN"
    ;;
  preview)
    vercel deploy --yes --project "$VERCEL_PROJECT" "${SCOPE_ARGS[@]}" --token "$VERCEL_TOKEN"
    ;;
  production|prod)
    vercel deploy --yes --prod --project "$VERCEL_PROJECT" "${SCOPE_ARGS[@]}" --token "$VERCEL_TOKEN"
    ;;
  *)
    echo "Uso: $0 [link|pull|preview|production]" >&2
    exit 2
    ;;
esac
