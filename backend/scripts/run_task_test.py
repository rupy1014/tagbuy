#!/usr/bin/env python3
"""
Celery 태스크 실제 실행 테스트
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.tasks.post_scanner import scan_active_campaigns

print("[*] Sending scan_active_campaigns task to Celery...")
result = scan_active_campaigns.delay()
print(f"[+] Task ID: {result.id}")
print(f"[*] Waiting for result (timeout 10s)...")

try:
    output = result.get(timeout=10)
    print(f"[+] Task completed!")
    print(f"    Result: {output}")
except Exception as e:
    print(f"[!] Task error or timeout: {e}")
    print(f"    State: {result.state}")
