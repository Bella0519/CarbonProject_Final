# ============================================
# 🌿 CustosCarbon | 環境部 CFP_P_02 自動更新模組
# 功能：
# 1️⃣ 從環境部 API 抓取 JSON
# 2️⃣ 備份舊檔案
# 3️⃣ 儲存最新版本至 wwwroot/data/
# 4️⃣ 紀錄更新時間與筆數
# ============================================

import requests
import json
import os
from datetime import datetime
from pathlib import Path
import shutil

# === 設定 ===
API_URL = "https://data.moenv.gov.tw/api/v1/datasets/CFP_P_02/json"
DATA_DIR = Path(__file__).resolve().parent.parent / "wwwroot" / "data"
DATA_FILE = DATA_DIR / "moenv_factors_full.json"
BACKUP_FILE = DATA_DIR / f"moenv_factors_backup_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
LOG_FILE = DATA_DIR / "update_log.txt"

# === 確保資料夾存在 ===
os.makedirs(DATA_DIR, exist_ok=True)

def fetch_data():
    print("🌏 嘗試從環境部 API 抓取資料中...")
    res = requests.get(API_URL, timeout=15)
    res.raise_for_status()
    return res.json()

def format_data(raw_data):
    formatted = []
    for item in raw_data:
        name = item.get("項目名稱") or item.get("Name")
        unit = item.get("單位") or item.get("Unit") or "未知"
        factor = item.get("排放係數") or item.get("CO2e") or 0
        try:
            factor = float(factor)
        except:
            factor = 0.0
        if name:
            formatted.append({
                "name": name.strip(),
                "unit": unit.strip(),
                "factor": factor
            })
    return formatted

def backup_old_data():
    if DATA_FILE.exists():
        shutil.copy2(DATA_FILE, BACKUP_FILE)
        print(f"📦 已備份舊檔：{BACKUP_FILE.name}")

def save_new_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已更新最新資料 → {DATA_FILE.name}")

def log_update(count):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 更新成功，共 {count} 筆資料\n")

def main():
    try:
        raw = fetch_data()
        formatted = format_data(raw)
        backup_old_data()
        save_new_data(formatted)
        log_update(len(formatted))
        print(f"🎉 成功完成更新，共 {len(formatted)} 筆。")
    except Exception as e:
        print("❌ 更新失敗：", e)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 更新失敗：{e}\n")

if __name__ == "__main__":
    main()
