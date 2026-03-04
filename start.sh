#!/bin/bash

echo "=========================================="
echo "Nexus"
echo "Phase 1: 终端墙"
echo "=========================================="
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd client && npm install && cd ..
fi

echo ""
echo "🚀 启动服务..."
echo ""

# 启动后端
echo "启动后端服务器 (http://localhost:7878)..."
node server/index.js > /tmp/nexus-server.log 2>&1 &
SERVER_PID=$!

# 等待后端启动
sleep 2

# 启动前端
echo "启动前端应用 (http://localhost:5173)..."
cd client && npm run dev > /tmp/nexus-client.log 2>&1 &
CLIENT_PID=$!

cd ..

echo ""
echo "✅ 服务启动成功！"
echo ""
echo "📊 访问地址："
echo "   前端应用: http://localhost:5173"
echo "   后端 API: http://localhost:7878"
echo ""
echo "📝 日志文件："
echo "   后端: /tmp/nexus-server.log"
echo "   前端: /tmp/nexus-client.log"
echo ""
echo "🛑 停止服务："
echo "   kill $SERVER_PID $CLIENT_PID"
echo ""
echo "按 Ctrl+C 停止服务..."

# 等待用户中断
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; echo ''; echo '服务已停止'; exit" INT

wait
