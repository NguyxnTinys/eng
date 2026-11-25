#!/bin/bash
# Khởi động web server tại thư mục Gramma
# Chạy: bash serve.sh

cd "$(dirname "$0")"

PORT=8080

# Thử python3 trước
if command -v python3 &>/dev/null; then
  echo "🌐 Mở trình duyệt: http://localhost:$PORT"
  echo "⌨️  Nhấn Ctrl+C để dừng server."
  open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null &
  python3 -m http.server $PORT
elif command -v python &>/dev/null; then
  echo "🌐 Mở trình duyệt: http://localhost:$PORT"
  open "http://localhost:$PORT" 2>/dev/null &
  python -m SimpleHTTPServer $PORT
else
  echo "❌ Không tìm thấy Python. Hãy cài Python hoặc dùng VS Code Live Server."
fi

