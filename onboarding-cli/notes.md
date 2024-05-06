sudo lsof -Fn / | grep "log$" | awk '/^n/ {print substr($0, 2)}' | uniq

