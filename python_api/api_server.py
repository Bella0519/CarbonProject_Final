# ==========================================
# 🌿 CustosCarbon Flask API 後端（含 SQLite）
# 功能：
# 1️⃣ 提供碳排放係數 API /api/factors
# 2️⃣ 接收計算請求 /api/calculate
# 3️⃣ 自動記錄到 SQLite 資料庫
# 4️⃣ 提供歷史紀錄查詢 /api/records
# ==========================================

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import sqlite3
import os

app = Flask(__name__)
CORS(app)  # ✅ 允許跨域連線

DB_PATH = "carbon_data.db"
FACTORS_PATH = "moenv_factors_full.json"

# === 初始化資料庫 ===
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        usage REAL,
        factor REAL,
        emission REAL,
        unit TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()
    print("✅ SQLite 資料庫已啟動")

# === 載入排放係數 ===
def load_factors():
    try:
        with open(FACTORS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        formatted = {}
        for item in data:
            name = item.get("name") or item.get("項目名稱")
            unit = item.get("unit") or item.get("單位") or "未知"
            factor = item.get("factor") or item.get("排放係數")
            if name and factor:
                formatted[name] = {"unit": unit, "factor": float(factor)}
        print(f"✅ 已載入 {len(formatted)} 筆排放係數")
        return formatted
    except Exception as e:
        print("❌ 無法載入排放係數:", e)
        return {}

emission_factors = load_factors()
init_db()

# === 1️⃣ 取得所有排放係數 ===
@app.route("/api/factors", methods=["GET"])
def get_factors():
    return jsonify(emission_factors)

# === 2️⃣ 計算並寫入資料庫 ===
@app.route("/api/calculate", methods=["POST"])
def calculate_emission():
    try:
        data = request.get_json()
        name = data.get("name", "")
        usage = float(data.get("usage", 0))
        factor = float(data.get("factor", 0))
        unit = emission_factors.get(name, {}).get("unit", "")
        emission = round(usage * factor, 2)

        # 🗂 寫入 SQLite 資料庫
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO records (name, usage, factor, emission, unit)
            VALUES (?, ?, ?, ?, ?)
        """, (name, usage, factor, emission, unit))
        conn.commit()
        conn.close()

        return jsonify({
            "name": name,
            "usage": usage,
            "factor": factor,
            "emission": emission,
            "unit": unit,
            "status": "saved"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400

# === 3️⃣ 查詢所有紀錄 ===
@app.route("/api/records", methods=["GET"])
def get_records():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM records ORDER BY created_at DESC LIMIT 50")
    rows = cur.fetchall()
    conn.close()

    records = [dict(row) for row in rows]
    return jsonify(records)

# === 4️⃣ 健康檢查 ===
@app.route("/")
def home():
    return jsonify({
        "status": "ok",
        "message": "CustosCarbon Flask API 運作中 🌿",
        "routes": ["/api/factors", "/api/calculate", "/api/records"]
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"🚀 Flask API 啟動中：http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
