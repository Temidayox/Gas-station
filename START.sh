#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'
BOLD='\033[1m'

echo ""
echo "  ================================================"
echo "   GAS STATION NIGERIA — Local Setup"
echo "  ================================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}  [ERROR] Node.js is not installed.${RESET}"
    echo ""
    echo "  Please install it from: https://nodejs.org  (LTS version)"
    echo ""
    exit 1
fi

NODE_VER=$(node -v)
echo -e "  ${GREEN}✓${RESET} Node.js $NODE_VER found"
echo ""

echo -e "  ${BOLD}[1/4]${RESET} Installing dependencies..."
npm install --silent
echo -e "  ${GREEN}✓${RESET} Dependencies installed"

echo -e "  ${BOLD}[2/4]${RESET} Setting up database..."
npx prisma generate --silent 2>/dev/null || true
npx prisma db push --skip-generate --accept-data-loss 2>/dev/null
echo -e "  ${GREEN}✓${RESET} Database ready"

echo -e "  ${BOLD}[3/4]${RESET} Loading demo data..."
node prisma/seed.js 2>/dev/null || echo -e "  ${YELLOW}⚠${RESET}  Seed skipped (data may already exist)"
echo -e "  ${GREEN}✓${RESET} Demo data loaded"

echo -e "  ${BOLD}[4/4]${RESET} Starting server..."
echo ""
echo "  ================================================"
echo -e "   App running at: ${GREEN}${BOLD}http://localhost:3000${RESET}"
echo ""
echo "   Demo logins:"
echo "   Admin:    admin@gasstation.ng   /  Admin@2026"
echo "   Outlet 1: outlet1@gasstation.ng /  Outlet1@26"
echo "   Customer: demo.a@gasstation.ng  /  Demo@001"
echo "  ================================================"
echo ""

# Open browser (Mac or Linux)
sleep 2
if command -v open &> /dev/null; then
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
fi

npm run dev
