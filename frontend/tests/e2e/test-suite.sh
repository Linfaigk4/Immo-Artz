#!/bin/bash

API_URL="https://immo-backend-api.onrender.com/api/v1"
FRONTEND_URL="https://immo-frontend-web.onrender.com"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           🧪 IMMO-ARTZ FUNCTIONAL TEST SUITE 🧪              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0

test_count=0

# ==================== TEST 1: API HEALTH ====================
test_count=$((test_count + 1))
echo "📋 TEST $test_count: API Health Check"
echo "─────────────────────────────────────────────────────────────────"
response=$(curl -s "$API_URL/health")
echo "Response: $response"
if echo "$response" | grep -q '"status":"ok"'; then
  echo -e "${GREEN}✅ PASSED${NC}"
  passed=$((passed + 1))
else
  echo -e "${RED}❌ FAILED${NC}"
  failed=$((failed + 1))
fi
echo ""

# ==================== TEST 2: REGISTER VISITOR ====================
test_count=$((test_count + 1))
email="visitor.$(date +%s)@immo.cm"
phone="+237699$(printf "%06d" $((RANDOM * 32768 / 32768)))"
echo "📋 TEST $test_count: Register Visitor User"
echo "─────────────────────────────────────────────────────────────────"
echo "Email: $email"
response=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Visitor",
    "last_name": "Test",
    "email": "'$email'",
    "password": "TestPass123!",
    "password_confirmation": "TestPass123!",
    "phone": "'$phone'",
    "role": "visitor"
  }')
echo "Response: $response"
visitor_token=$(echo "$response" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$visitor_token" ]; then
  echo -e "${GREEN}✅ PASSED${NC} - Token: ${visitor_token:0:40}..."
  passed=$((passed + 1))
else
  echo -e "${RED}❌ FAILED${NC}"
  failed=$((failed + 1))
fi
echo ""

# ==================== TEST 3: LOGIN ====================
test_count=$((test_count + 1))
echo "📋 TEST $test_count: Login User"
echo "─────────────────────────────────────────────────────────────────"
response=$(curl -s -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$email'",
    "password": "TestPass123!"
  }')
echo "Response: $response"
login_token=$(echo "$response" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$login_token" ]; then
  echo -e "${GREEN}✅ PASSED${NC} - Token: ${login_token:0:40}..."
  passed=$((passed + 1))
else
  echo -e "${RED}❌ FAILED${NC}"
  failed=$((failed + 1))
fi
echo ""

# ==================== TEST 4: GET PROFILE ====================
test_count=$((test_count + 1))
echo "📋 TEST $test_count: Get User Profile"
echo "─────────────────────────────────────────────────────────────────"
response=$(curl -s -H "Authorization: Bearer $visitor_token" "$API_URL/me")
echo "Response: $response"
if echo "$response" | grep -q "$email"; then
  echo -e "${GREEN}✅ PASSED${NC}"
  passed=$((passed + 1))
else
  echo -e "${RED}❌ FAILED${NC}"
  failed=$((failed + 1))
fi
echo ""

# ==================== TEST 5: LOGOUT ====================
test_count=$((test_count + 1))
echo "📋 TEST $test_count: Logout"
echo "─────────────────────────────────────────────────────────────────"
response=$(curl -s -X POST -H "Authorization: Bearer $visitor_token" "$API_URL/logout")
echo "Response: $response"
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ PASSED${NC}"
  passed=$((passed + 1))
else
  echo -e "${RED}❌ FAILED${NC}"
  failed=$((failed + 1))
fi
echo ""

# ==================== TEST 6: REGISTER AGENT ====================
test_count=$((test_count + 1))
agent_email="agent.$(date +%s)@immo.cm"
agent_phone="+237699$(printf "%06d" $((RANDOM * 32768 / 32768)))"
echo "📋 TEST $test_count: Register Agent"
echo "─────────────────────────────────────────────────────────────────"
echo "Email: $agent_email"
response=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Agent",
    "last_name": "Immobilier",
    "email": "'$agent_email'",
    "password": "AgentPass123!",
    "password_confirmation": "AgentPass123!",
    "phone": "'$agent_phone'",
    "role": "agent",
    "agency_name": "Immo Test Agency",
    "license_number": "LIC-2026-001"
  }')
echo "Response: $response"
if echo "$response" | grep -q '"role":"agent"'; then
  echo -e "${GREEN}✅ PASSED${NC}"
  passed=$((passed + 1))
else
  echo -e "${RED}❌ FAILED${NC}"
  failed=$((failed + 1))
fi
echo ""

# ==================== TEST 7: GET FAVORITES ====================
test_count=$((test_count + 1))
echo "📋 TEST $test_count: Get Favorites List"
echo "─────────────────────────────────────────────────────────────────"
response=$(curl -s -H "Authorization: Bearer $login_token" "$API_URL/favorites")
echo "Response: $response"
if echo "$response" | grep -q '"favorites"'; then
  echo -e "${GREEN}✅ PASSED${NC}"
  passed=$((passed + 1))
else
  echo -e "${RED}❌ FAILED${NC}"
  failed=$((failed + 1))
fi
echo ""

# ==================== TEST 8: ADD FAVORITE ====================
test_count=$((test_count + 1))
echo "📋 TEST $test_count: Add Favorite (with property_id in body)"
echo "─────────────────────────────────────────────────────────────────"
response=$(curl -s -X POST \
  -H "Authorization: Bearer $login_token" \
  -H "Content-Type: application/json" \
  "$API_URL/favorites" \
  -d '{"property_id": 1}')
echo "Response: $response"
if echo "$response" | grep -q '"success"'; then
  echo -e "${GREEN}✅ PASSED${NC}"
  passed=$((passed + 1))
else
  echo -e "${RED}❌ FAILED${NC}"
  failed=$((failed + 1))
fi
echo ""

# ==================== TEST 9: POST CONTACT REQUEST ====================
test_count=$((test_count + 1))
echo "📋 TEST $test_count: Create Contact Request"
echo "─────────────────────────────────────────────────────────────────"
response=$(curl -s -X POST \
  -H "Authorization: Bearer $login_token" \
  -H "Content-Type: application/json" \
  "$API_URL/contact-requests" \
  -d '{"property_id": 1, "message": "Je suis très intéressé"}')
echo "Response: $response"
if echo "$response" | grep -q -E '"success"|"message"'; then
  echo -e "${GREEN}✅ PASSED${NC}"
  passed=$((passed + 1))
else
  echo -e "${RED}❌ FAILED${NC}"
  failed=$((failed + 1))
fi
echo ""

# ==================== TEST 10: POST RATING ====================
test_count=$((test_count + 1))
echo "📋 TEST $test_count: Submit Rating (Anonymous)"
echo "─────────────────────────────────────────────────────────────────"
response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  "$API_URL/ratings" \
  -d '{
    "agent_id": 1,
    "score": 5,
    "rater_name": "Client Satisfait",
    "rater_email": "client@test.cm",
    "comment": "Excellent service!"
  }')
echo "Response: $response"
if echo "$response" | grep -q -E '"success"|"message"'; then
  echo -e "${GREEN}✅ PASSED${NC}"
  passed=$((passed + 1))
else
  echo -e "${RED}❌ FAILED${NC}"
  failed=$((failed + 1))
fi
echo ""

# ==================== TEST 11: GET PROPERTIES ====================
test_count=$((test_count + 1))
echo "📋 TEST $test_count: Get Properties List"
echo "─────────────────────────────────────────────────────────────────"
response=$(curl -s "$API_URL/properties")
echo "Response: $response"
if echo "$response" | grep -q '"properties"'; then
  echo -e "${GREEN}✅ PASSED${NC}"
  passed=$((passed + 1))
else
  echo -e "${RED}❌ FAILED${NC}"
  failed=$((failed + 1))
fi
echo ""

# ==================== TEST 12: FRONTEND ACCESSIBILITY ====================
test_count=$((test_count + 1))
echo "📋 TEST $test_count: Frontend Accessibility"
echo "─────────────────────────────────────────────────────────────────"
response=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL/")
http_code=$(echo "$response" | tail -n1)
echo "HTTP Code: $http_code"
if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ PASSED${NC}"
  passed=$((passed + 1))
else
  echo -e "${RED}❌ FAILED${NC}"
  failed=$((failed + 1))
fi
echo ""

# ==================== FINAL SUMMARY ====================
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        📊 TEST SUMMARY                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "Total Tests: $test_count"
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
  exit 1
fi
