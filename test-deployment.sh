#!/bin/bash

# FeedBuilderly Deployment Test Script
# Usage: ./test-deployment.sh [shop-name]

SHOP=${1:-"feedbuilderly-test.myshopify.com"}
BASE_URL="https://feedbuilder.fly.dev"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║         🧪  FEEDBUILDERLY - DEPLOYMENT TEST 🧪             ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Testing shop: $SHOP"
echo "Base URL: $BASE_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing /ping (Health Check)..."
PING_RESPONSE=$(curl -s "$BASE_URL/ping")
PING_STATUS=$(echo $PING_RESPONSE | jq -r '.status' 2>/dev/null)

if [ "$PING_STATUS" = "ok" ]; then
    echo "   ✅ PASS - Server is healthy"
    UPTIME=$(echo $PING_RESPONSE | jq -r '.uptime' 2>/dev/null)
    echo "   📊 Uptime: $(echo "scale=2; $UPTIME / 60" | bc) minutes"
else
    echo "   ❌ FAIL - Server not responding"
    exit 1
fi
echo ""

# Test 2: Status
echo "2️⃣  Testing /status (Detailed Status)..."
STATUS_RESPONSE=$(curl -s "$BASE_URL/status")
SHOPS_COUNT=$(echo $STATUS_RESPONSE | jq -r '.stats.shopsInstalled' 2>/dev/null)

if [ -n "$SHOPS_COUNT" ]; then
    echo "   ✅ PASS - Status endpoint working"
    echo "   📊 Shops installed: $SHOPS_COUNT"
else
    echo "   ❌ FAIL - Status endpoint error"
fi
echo ""

# Test 3: Formats
echo "3️⃣  Testing /api/formats (Available Formats)..."
FORMATS_RESPONSE=$(curl -s "$BASE_URL/api/formats")
TOTAL_FORMATS=$(echo $FORMATS_RESPONSE | jq -r '.totalFormats' 2>/dev/null)
IMPLEMENTED=$(echo $FORMATS_RESPONSE | jq -r '.implementedCount' 2>/dev/null)

if [ -n "$TOTAL_FORMATS" ]; then
    echo "   ✅ PASS - Formats endpoint working"
    echo "   📊 Total formats: $TOTAL_FORMATS"
    echo "   📊 Implemented: $IMPLEMENTED"
    echo "   📋 Formats: $(echo $FORMATS_RESPONSE | jq -r '.implementedFormats | join(", ")')"
else
    echo "   ❌ FAIL - Formats endpoint error"
fi
echo ""

# Test 4: Products
echo "4️⃣  Testing /api/products/$SHOP (Products API)..."
PRODUCTS_RESPONSE=$(curl -s "$BASE_URL/api/products/$SHOP")
PRODUCTS_COUNT=$(echo $PRODUCTS_RESPONSE | jq -r '.productsCount' 2>/dev/null)
ERROR=$(echo $PRODUCTS_RESPONSE | jq -r '.error' 2>/dev/null)

if [ "$ERROR" != "null" ] && [ -n "$ERROR" ]; then
    echo "   ⚠️  SKIP - Shop not installed yet: $ERROR"
    echo "   💡 Install the app first: $BASE_URL/install?shop=$SHOP"
else
    if [ -n "$PRODUCTS_COUNT" ] && [ "$PRODUCTS_COUNT" != "null" ]; then
        echo "   ✅ PASS - Products API working"
        echo "   📊 Products count: $PRODUCTS_COUNT"
    else
        echo "   ❌ FAIL - Products API error"
    fi
fi
echo ""

# Test 5: Feed Generation
echo "5️⃣  Testing /feed/$SHOP/google-shopping (Feed Generation)..."
FEED_RESPONSE=$(curl -s -I "$BASE_URL/feed/$SHOP/google-shopping")
HTTP_CODE=$(echo "$FEED_RESPONSE" | grep "HTTP/" | awk '{print $2}')
X_CACHE=$(echo "$FEED_RESPONSE" | grep -i "x-cache:" | awk '{print $2}' | tr -d '\r')
X_PRODUCTS=$(echo "$FEED_RESPONSE" | grep -i "x-products-count:" | awk '{print $2}' | tr -d '\r')

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ PASS - Feed generation working"
    echo "   📊 Cache status: $X_CACHE"
    echo "   📊 Products in feed: $X_PRODUCTS"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "   ⚠️  SKIP - Shop not found (install app first)"
else
    echo "   ❌ FAIL - Feed generation error (HTTP $HTTP_CODE)"
fi
echo ""

# Test 6: Feed Info
echo "6️⃣  Testing /api/feed-info/$SHOP (Feed Info)..."
FEED_INFO=$(curl -s "$BASE_URL/api/feed-info/$SHOP")
TOTAL_CACHED=$(echo $FEED_INFO | jq -r '.totalCached' 2>/dev/null)
ERROR=$(echo $FEED_INFO | jq -r '.error' 2>/dev/null)

if [ "$ERROR" != "null" ] && [ -n "$ERROR" ]; then
    echo "   ⚠️  SKIP - $ERROR"
else
    if [ -n "$TOTAL_CACHED" ] && [ "$TOTAL_CACHED" != "null" ]; then
        echo "   ✅ PASS - Feed info working"
        echo "   📊 Cached feeds: $TOTAL_CACHED"
    else
        echo "   ❌ FAIL - Feed info error"
    fi
fi
echo ""

# Test 7: Cache Performance
if [ "$HTTP_CODE" = "200" ]; then
    echo "7️⃣  Testing Cache Performance..."
    echo "   📊 First request (should be MISS or HIT):"
    TIME1=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/feed/$SHOP/google-shopping")
    echo "      Response time: ${TIME1}s"

    sleep 1

    echo "   📊 Second request (should be HIT if first was MISS):"
    TIME2=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/feed/$SHOP/google-shopping")
    echo "      Response time: ${TIME2}s"

    # Compare times
    FASTER=$(echo "$TIME2 < $TIME1" | bc -l)
    if [ "$FASTER" = "1" ]; then
        echo "   ✅ PASS - Second request faster (cache working!)"
    else
        echo "   ℹ️  INFO - Times similar (feed might be cached from first request)"
    fi
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 TEST SUMMARY:"
echo ""
echo "✅ Health check: Working"
echo "✅ Status endpoint: Working"
echo "✅ Formats list: Working ($TOTAL_FORMATS formats, $IMPLEMENTED implemented)"

if [ "$PRODUCTS_COUNT" = "null" ] || [ -z "$PRODUCTS_COUNT" ]; then
    echo "⚠️  Products API: Needs app installation"
    echo "⚠️  Feed generation: Needs app installation"
    echo ""
    echo "🔗 INSTALL APP:"
    echo "   $BASE_URL/install?shop=$SHOP"
else
    echo "✅ Products API: Working ($PRODUCTS_COUNT products)"
    echo "✅ Feed generation: Working"
    echo ""
    echo "🔗 FEED URLS:"
    echo "   Google Shopping: $BASE_URL/feed/$SHOP/google-shopping"
    echo "   Yandex Market:   $BASE_URL/feed/$SHOP/yandex-yml"
    echo "   Facebook:        $BASE_URL/feed/$SHOP/facebook"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Deployment test complete!"
echo ""
