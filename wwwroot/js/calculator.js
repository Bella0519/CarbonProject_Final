// 🌿 CustosCarbon - 混合最終版（Flask 資料源 + MySQL 儲存 + 模糊搜尋）
// ✅ 功能：
// 1) 先取 Flask API -> 失敗再取 /data/moenv_factors_full.json
// 2) 模糊搜尋 (多關鍵字、底線/空白去除、別名強化)
// 3) 一鍵加入/手動新增 都會寫入 ASP.NET 後端 /api/Carbon/SaveRecord (MySQL)
// 4) 圖表 / PDF / 建議清單等原功能完整保留

let emissionFactors = {};
let records = [];
let chart = null;

// === 初始化 ===
async function initCalculator() {
  console.log("🌿 CustosCarbon Calculator Loaded");
  await loadEmissionData();

  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => showSuggestions(e.target.value));
  }
}

// === 來源：Flask API 優先，其次本機 JSON ===
async function loadEmissionData() {
  const FLASK_URL = "http://127.0.0.1:5001/api/factors";   // 先嘗試
  const LOCAL_URL  = "/data/moenv_factors_full.json";      // 失敗再用

  // 嘗試 Flask
  try {
    console.log("🌍 嘗試從 Flask API 載入資料...");
    const r = await fetch(FLASK_URL, { cache: "no-store" });
    if (!r.ok) throw new Error(`Flask API ${r.status}`);
    const data = await r.json();
    emissionFactors = normalizeIncomingData(data);
    console.log(`✅ Flask API 成功，共 ${Object.keys(emissionFactors).length} 筆`);
    return;
  } catch (e) {
    console.warn("⚠️ Flask API 失敗，改用本機 JSON。", e);
  }

  // 嘗試本機 JSON
  try {
    const r = await fetch(LOCAL_URL, { cache: "no-store" });
    if (!r.ok) throw new Error(`LOCAL ${r.status}`);
    const data = await r.json();
    emissionFactors = normalizeIncomingData(data);
    console.log(`📁 本機 JSON 成功，共 ${Object.keys(emissionFactors).length} 筆`);
  } catch (e) {
    console.error("❌ 無法載入任何排放係數來源，請檢查 Flask 或本機檔案路徑。", e);
    emissionFactors = {};
  }
}

// === 將傳入資料（陣列或物件）標準化為 { [name]: {unit, factor} } ===
function normalizeIncomingData(raw) {
  // 若已是目標格式（物件，value 內有 unit/factor）
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const keys = Object.keys(raw);
    if (keys.length && raw[keys[0]] && typeof raw[keys[0]] === "object" && "factor" in raw[keys[0]]) {
      return raw;
    }
  }
  // 若是陣列，嘗試從常見欄位轉成 {name, unit, factor}
  if (Array.isArray(raw)) {
    const map = {};
    raw.forEach((item) => {
      const name   = item.Name || item.name || item["項目名稱"];
      const unit   = item.Unit || item.unit || item["單位"] || "未知";
      const factor = parseFloat(item.CO2e || item.factor || item["排放係數"] || 0);
      if (name && !(name in map)) map[name] = { unit, factor };
    });
    return map;
  }
  return {};
}

// === 智慧搜尋提示（多關鍵字 + 底線/空白正規化） ===
function showSuggestions(keyword) {
  const box = document.getElementById("suggestions");
  if (!box) return;

  if (!keyword.trim()) {
    box.style.display = "none";
    return;
  }

  const normalize = (s) => s.toLowerCase().replace(/[＿_\s]/g, "");
  const tokens = keyword.trim().toLowerCase().replace(/[＿_]/g, " ").split(/\s+/);

  const list = Object.keys(emissionFactors)
    .filter((name) => {
      const n = normalize(name);
      return tokens.every((t) => n.includes(t));
    })
    .slice(0, 12);

  if (!list.length) {
    box.style.display = "none";
    return;
  }

  box.innerHTML = list
    .map((k) => {
      const { unit, factor } = emissionFactors[k];
      return `<div class="suggestion-item" onclick="selectSuggestion('${k}')">${k}（${factor} kgCO₂e／${unit}）</div>`;
    })
    .join("");
  box.style.display = "block";
}

// === 選擇提示項目 ===
function selectSuggestion(name) {
  const usageInput = document.getElementById("usage");
  document.getElementById("search").value = name;
  document.getElementById("suggestions").style.display = "none";

  const item = emissionFactors[name];
  if (item) {
    usageInput.placeholder = `輸入使用量（單位：${item.unit}）`;
    document.getElementById("unitHint").textContent = `單位：${item.unit}`;
  } else {
    usageInput.placeholder = "輸入使用量";
    document.getElementById("unitHint").textContent = "";
  }
}

// === 一鍵加入（依需求：交通不包含「展會交通」「運輸服務」） ===
function quickAdd(category) {
  const catMap = {
    transport: ["汽車", "機車", "公車", "捷運"],
    food: ["牛肉", "雞肉", "豬肉", "蔬菜"],
    energy: ["電力", "天然氣", "柴油", "煤炭"],
    green: ["步行", "腳踏車"],
  };

  const items = catMap[category] || [];
  items.forEach((kw) => {
    const data = findMatchingFactor(kw); // 用強化版模糊匹配找最佳項目
    if (data) {
      const rec = { name: data.name, usage: "", unit: data.unit, factor: data.factor, emission: "" };
      records.push(rec);
      saveToDB(rec); // ✅ 寫入 DB
    }
  });

  renderTable();
}

// === 強化匹配邏輯（別名 + 單位篩選 + 模糊包含） ===
function findMatchingFactor(keyword) {
  const aliasMap = {
    "汽車": ["汽車", "小客車", "自用小客車"],
    "機車": ["機車", "摩托車"],
    "公車": ["公車", "巴士", "公共運輸"],
    "捷運": ["捷運", "地鐵"],
    "牛肉": ["牛肉", "牛排", "牛肉(進口)", "牛肉製品"],
    "豬肉": ["豬肉", "豬肉(進口)", "豬肉製品"],
    "雞肉": ["雞肉", "雞胸肉", "家禽肉", "雞肉製品"],
    "蔬菜": ["蔬菜", "青菜", "葉菜", "植物性食物"],
  };
  const aliases = aliasMap[keyword] || [keyword];

  // 先做名稱包含的模糊比對
  let matches = Object.entries(emissionFactors).filter(([name]) =>
    aliases.some((a) => name.includes(a))
  );

  // 交通：偏好「公里 / 人公里」
  if (["汽車", "機車", "公車", "捷運"].includes(keyword)) {
    matches = matches.filter(([_, v]) => (v.unit || "").includes("公里"));
  }

  // 飲食：偏好「公斤 / 公克」
  if (["牛肉", "豬肉", "雞肉", "蔬菜"].includes(keyword)) {
    matches = matches.filter(([_, v]) => {
      const u = v.unit || "";
      return u.includes("公斤") || u.includes("公克");
    });
  }

  // 取第一筆最接近的
  if (matches.length) {
    const [name, v] = matches[0];
    return { name, unit: v.unit, factor: v.factor };
  }

  // 兜底：名稱中直接含 keyword
  const backup = Object.entries(emissionFactors).find(([name]) => name.includes(keyword));
  if (backup) {
    const [name, v] = backup;
    return { name, unit: v.unit, factor: v.factor };
  }

  console.warn(`⚠️ 未找到符合的項目：${keyword}`);
  return null;
}

// === 使用者輸入使用量時即時計算 ===
function updateUsage(index, value) {
  const usage = parseFloat(value);
  if (isNaN(usage) || usage < 0) {
    records[index].emission = "";
  } else {
    const factor = parseFloat(records[index].factor) || 0;
    records[index].emission = (usage * factor).toFixed(2);
    records[index].usage = usage;
  }
  renderTable(false);
  updateChart();
}

// === 手動新增 ===
function addRecord() {
  const name = document.getElementById("search").value.trim();
  const usageVal = document.getElementById("usage").value;
  const usage = parseFloat(usageVal);

  if (!name || isNaN(usage) || usage <= 0) {
    alert("請輸入有效的項目名稱與使用量！");
    return;
  }

  const src = emissionFactors[name] || {};
  const unit = src.unit || document.getElementById("unitHint")?.textContent.replace("單位：", "") || "";
  const factor = src.factor || 0;
  const emission = (usage * factor).toFixed(2);

  const rec = { name, usage, unit, factor, emission };
  records.push(rec);
  renderTable();
  updateChart();
  saveToDB(rec); // ✅ 寫入 DB

  // 清空輸入
  document.getElementById("search").value = "";
  document.getElementById("usage").value = "";
  document.getElementById("usage").placeholder = "輸入使用量";
  document.getElementById("unitHint").textContent = "";
}

// === 寫入資料庫（ASP.NET 控制器） ===
async function saveToDB(record) {
  try {
    const res = await fetch("/api/Carbon/SaveRecord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const js = await res.json();
    console.log(js.message || "✅ 已寫入資料庫");
  } catch (err) {
    console.warn("⚠️ 寫入資料庫失敗（可能後端未啟動），本次僅更新前端。", err);
  }
}

// === 移除單筆（目前只移前端，不動 DB） ===
function removeRecord(index) {
  records.splice(index, 1);
  renderTable(false);
  updateChart();
}

// === 渲染表格 ===
function renderTable(showAlert = true) {
  const tbody = document.querySelector("#recordTable tbody");
  tbody.innerHTML = records
    .map(
      (r, i) => `
      <tr>
        <td>${r.name}</td>
        <td>
          <input type="number" class="usage-input" value="${r.usage}" min="0"
                 oninput="updateUsage(${i}, this.value)"
                 placeholder="${r.unit ? '單位：' + r.unit : '輸入使用量'}" />
        </td>
        <td>${r.factor}</td>
        <td>${r.emission}</td>
        <td><button class="btn-outline" onclick="removeRecord(${i})">刪除</button></td>
      </tr>`
    )
    .join("");

  const total = records.reduce((sum, r) => sum + (parseFloat(r.emission) || 0), 0);
  document.getElementById("totalEmission").textContent = total.toFixed(2);

  if (showAlert && records.length) {
    console.log(`✅ 已更新 ${records.length} 筆紀錄`);
  }
}

// === PDF 匯出 ===
function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text("CustosCarbon 碳足跡紀錄", 14, 15);

  const tableData = records.map((r) => [r.name, `${r.usage} ${r.unit || ""}`, r.factor, r.emission]);
  doc.autoTable({
    head: [["項目名稱", "使用量", "排放係數", "總排放量"]],
    body: tableData,
    startY: 25,
  });

  const total = records.reduce((sum, r) => sum + (parseFloat(r.emission) || 0), 0);
  doc.text(`🌍 總碳排量：${total.toFixed(2)} kgCO₂e`, 14, doc.lastAutoTable.finalY + 10);

  doc.save("CustosCarbon_碳足跡紀錄.pdf");
}

// === 圖表 ===
function updateChart() {
  const ctx = document.getElementById("emissionChart");
  if (!ctx) return;

  const labels = records.map((r) => r.name);
  const data = records.map((r) => parseFloat(r.emission) || 0);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          "#ffadc6", "#ffc2d1", "#ffe5ec", "#ff8fab", "#ffb3c6",
          "#fad2e1", "#fbb1bd", "#ffcad4", "#ffe4e1", "#f9bec7"
        ],
        borderWidth: 1,
        hoverOffset: 8
      }]
    },
    options: { plugins: { legend: { position: "right" } } }
  });
}
