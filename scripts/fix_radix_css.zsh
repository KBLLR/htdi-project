# scripts/fix_radix_css.zsh
#!/usr/bin/env zsh
set -eu
set -o pipefail

# --- paths ------------------------------------------------------------
SCRIPT_DIR="$(cd -- "$(dirname -- "${0}")" && pwd -P)"
ROOT="${SCRIPT_DIR}/.."
CSS_DIR="${ROOT}/src/css"
RADIX_DIR="${ROOT}/node_modules/@radix-ui/colors"
RADIX_FILE="${CSS_DIR}/_radix.css"
INDEX_FILE="${CSS_DIR}/index.css"

mkdir -p "${CSS_DIR}"

# --- ensure package ---------------------------------------------------
if [[ ! -d "${RADIX_DIR}" ]]; then
  pnpm add @radix-ui/colors@latest
fi

# --- central import file ----------------------------------------------
cat > "${RADIX_FILE}" <<'CSS'
@import "@radix-ui/colors/gray.css";
@import "@radix-ui/colors/gray-dark.css";
/* optional:
@import "@radix-ui/colors/gray-alpha.css";
@import "@radix-ui/colors/gray-dark-alpha.css";
@import "@radix-ui/colors/blue.css";
@import "@radix-ui/colors/blue-dark.css";
*/
CSS

# --- sed detection (BSD vs GNU) --------------------------------------
SED="sed"
INPLACE=(-i '')
if command -v gsed >/dev/null 2>&1; then
  SED="gsed"
  INPLACE=(-i)
fi

# --- rewrite legacy import names across css/scss ----------------------
if [[ -d "${CSS_DIR}" ]]; then
  # normalize CRLF just in case
  find "${CSS_DIR}" -type f \( -name '*.css' -o -name '*.scss' \) -print0 \
    | xargs -0 perl -0777 -pe 's/\r\n/\n/g' -i

  find "${CSS_DIR}" -type f \( -name '*.css' -o -name '*.scss' \) -print0 \
    | xargs -0 ${SED} -E "${INPLACE[@]}" \
      -e 's#@radix-ui/colors/([a-z]+)DarkA\.css#@radix-ui/colors/\1-dark-alpha.css#g' \
      -e 's#@radix-ui/colors/([a-z]+)Dark\.css#@radix-ui/colors/\1-dark.css#g' \
      -e 's#@radix-ui/colors/([a-z]+)A\.css#@radix-ui/colors/\1-alpha.css#g' \
      -e 's#@radix-ui/colors/grayDark\.css#@radix-ui/colors/gray-dark.css#g'
fi

# --- prepend central import into index.css ----------------------------
touch "${INDEX_FILE}"
if ! grep -q '^@import "./_radix.css";' "${INDEX_FILE}"; then
  TMP="${INDEX_FILE}.tmp.$$"
  {
    printf '%s\n' '@import "./_radix.css";'
    cat "${INDEX_FILE}"
  } > "${TMP}"
  mv "${TMP}" "${INDEX_FILE}"
fi

exit 0
