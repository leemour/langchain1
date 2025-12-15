#!/bin/bash
# Test terminal debugging setup

echo "🧪 Testing Terminal Debug Setup"
echo "================================"
echo ""

echo "Test 1: Check if tsx is available"
if [ -f "node_modules/.bin/tsx" ]; then
    echo "✅ tsx found at node_modules/.bin/tsx"
else
    echo "❌ tsx not found - run: pnpm install"
    exit 1
fi

echo ""
echo "Test 2: Check if debug script exists"
if grep -q "test:graph:debug" package.json; then
    echo "✅ test:graph:debug script found"
else
    echo "❌ test:graph:debug script not found in package.json"
    exit 1
fi

echo ""
echo "Test 3: Start debug server (will timeout after 3 seconds)"
timeout 3 pnpm test:graph:debug 2>&1 | head -5 &
PID=$!
sleep 1

if ps -p $PID > /dev/null 2>&1; then
    echo "✅ Debug server started successfully"
    kill $PID 2>/dev/null
else
    echo "❌ Debug server failed to start"
    exit 1
fi

echo ""
echo "Test 4: Check if port 9229 is available"
if lsof -i :9229 > /dev/null 2>&1; then
    echo "⚠️  Port 9229 is in use (might be from previous test)"
    echo "   Kill with: lsof -ti:9229 | xargs kill -9"
else
    echo "✅ Port 9229 is available"
fi

echo ""
echo "================================"
echo "✅ All tests passed!"
echo ""
echo "📚 Quick Start:"
echo "   Terminal: pnpm test:graph:debug"
echo "   VSCode:   Ctrl+Shift+P → Debug: Attach to Node Process"
echo "   Chrome:   Open chrome://inspect"
echo ""
echo "📖 Full guide: docs/terminal-debugging-guide.md"
