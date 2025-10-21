// 🌿 CustosCarbon - 最終整合版
// ✅ 功能清單：
// 1️⃣ 外部 API（環境部 CFP_P_02）+ 本地 moenv_factors_full.json 備援
// 2️⃣ 模糊搜尋 + 單位提示 + 一鍵加入分類
// 3️⃣ 自動儲存紀錄至 MySQL（/api/Carbon/SaveRecord）
// 4️⃣ 一鍵清空 / 單筆刪除 同步資料庫
// 5️⃣ 開啟頁面自動載入資料庫舊資料
// 6️⃣ 完整 Chart.js 與 PDF 匯出功能
// 7️⃣ Console log 顯示 DB 同步狀態（✅🧹🗑❌）

let emissionFactors = {};
let records = [];
let chart;

// === 初始化 ===
async function initCalculator() {
  console.log("🌿 CustosCarbon Calculator Initialized");
  await loadEmissionData();
  await loadRecordsFromDB();

  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => showSuggestions(e.target.value));
  }
}

// === 載入排放係數（外部優先、本地備援） ===
async function loadEmissionData() {
  const API_URL = "https://data.moenv.gov.tw/api/v1/datasets/CFP_P_02/json";
  const LOCAL_URL = "/data/moenv_factors_full.json";
  let apiData = [];
  let localData = [];

  try {
    console.log("🌏 嘗試從外部 API 載入資料...");
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`API 錯誤: ${res.status}`);
    apiData = await res.json();
    console.log(`✅ 外部 API 載入成功，共 ${apiData.length} 筆`);
  } catch (err) {
    console.warn("⚠️ 外部 API 失敗，使用本地資料。", err);
    const resLocal = await fetch(LOCAL_URL);
    localData = await resLocal.json();
    console.log(`📁 已載入本地 moenv_factors_full.json，共 ${localData.length} 筆`);
  }

  emissionFactors = formatEmissionData([...apiData, ...localData]);
  console.log(`✨ 載入完成，共 ${Object.keys(emissionFactors).length} 筆 emission factors`);
}

// === 格式化資料 ===
function formatEmissionData(rawData) {
  const map = {};
  rawData.forEach((item) => {
    const name = item.Name || item.name || item["項目名稱"];
    const unit = item.Unit || item.unit || item["單位"] || "未知";
    const factor = parseFloat(item.CO2e || item.factor || item["排放係數"] || 0);
    if (name && !map[name]) map[name] = { unit, factor };
  });
  return map;
}

// === 搜尋提示 ===
function showSuggestions(keyword) {
  const box = document.getElementById("suggestions");
  if (!box) return;

  if (!keyword.trim()) {
    box.style.display = "none";
    return;
  }

  const suggestions = Object.keys(emissionFactors)
    .filter((k) => k.toLowerCase().includes(keyword.toLowerCase()))
    .slice(0, 6);

  if (suggestions.length === 0) {
    box.style.display = "none";
    return;
  }

  box.innerHTML = suggestions
    .map((k) => {
      const { unit, factor } = emissionFactors[k];
      return `<div class="suggestion-item" onclick="selectSuggestion('${k}')">${k}（${factor} kgCO₂e／${unit}）</div>`;
    })
    .join("");
  box.style.display = "block";
}

// === 選擇提示項目 ===
function selectSuggestion(name) {
  const input = document.getElementById("search");
  const usageInput = document.getElementById("usage");
  const factor = emissionFactors[name];

  input.value = name;
  document.getElementById("suggestions").style.display = "none";

  if (factor) {
    usageInput.placeholder = `輸入使用量（單位：${factor.unit}）`;
    document.getElementById("unitHint").textContent = `單位：${factor.unit}`;
  } else {
    usageInput.placeholder = "輸入使用量";
    document.getElementById("unitHint").textContent = "";
  }
}

// === 一鍵加入分類 ===
function quickAdd(category) {
  const mapping = {
    transport: [
  "自用小客車(汽油)",
  "機車",
  "公車(柴油)",
  "捷運",
  "展會交通",
  "運輸服務",
],

    food: ["食品_牛肉", "食品_雞肉", "食品_豬肉", "食品_蔬菜"],
    energy: ["電力", "天然氣", "柴油", "煤炭"],
    green: ["步行", "腳踏車"],
  };

const examples = mapping[category] || [];
examples.forEach((keyword) => {
  // ✅ 改進版模糊匹配：忽略底線、前綴、括號、大小寫
const normalize = (str) =>
  str
    .replace(/[_()（）\s]/g, "")   // 移除底線、括號、空白
    .replace(/食品|交通|運輸|服務/g, ""); // 移除常見前綴字

const matchedKeys = Object.keys(emissionFactors).filter((k) => {
  const nk = normalize(k);
  const kw = normalize(keyword);
  return nk.includes(kw);
});


  if (matchedKeys.length > 0) {
    matchedKeys.forEach((matchKey) => {
      const factorData = emissionFactors[matchKey];
      const record = {
        name: matchKey,
        usage: "",
        factor: factorData.factor,
        unit: factorData.unit,
        emission: "",
      };
      records.push(record);
      saveToDB(record);
    });
  } else {
    console.warn(`⚠️ 未找到關鍵字：「${keyword}」`);
  }
});
renderTable();
}


// === 使用者輸入使用量時自動更新 ===
function updateUsage(index, value) {
  const usage = parseFloat(value);
  if (isNaN(usage) || usage < 0) {
    records[index].emission = "";
  } else {
    const factor = parseFloat(records[index].factor);
    records[index].emission = (usage * factor).toFixed(2);
    records[index].usage = usage;
  }
  renderTable(false);
  updateChart();
}

// === 手動加入紀錄 ===
function addRecord() {
  const name = document.getElementById("search").value.trim();
  const usage = parseFloat(document.getElementById("usage").value);
  if (!name || isNaN(usage) || usage <= 0) {
    alert("請輸入有效的項目名稱與使用量！");
    return;
  }

  const factor = emissionFactors[name]?.factor || 0;
  const unit = emissionFactors[name]?.unit || "未知";
  const emission = (usage * factor).toFixed(2);

  const record = { name, usage, unit, factor, emission };
  records.push(record);
  saveToDB(record);
  renderTable();
  updateChart();

  document.getElementById("search").value = "";
  document.getElementById("usage").value = "";
  document.getElementById("usage").placeholder = "輸入使用量";
}

// === 渲染表格 ===
function renderTable(showAlert = true) {
  const tbody = document.querySelector("#recordTable tbody");
  tbody.innerHTML = records
    .map(
      (r, i) => `
      <tr>
        <td>${r.name}</td>
        <td><input type="number" value="${r.usage}" oninput="updateUsage(${i}, this.value)" placeholder="${r.unit}" /></td>
        <td>${r.factor}</td>
        <td>${r.emission}</td>
        <td><button class="btn-outline" onclick="removeRecord(${i})">刪除</button></td>
      </tr>`
    )
    .join("");

  const total = records.reduce((sum, r) => sum + (parseFloat(r.emission) || 0), 0);
  document.getElementById("totalEmission").textContent = total.toFixed(2);
  if (showAlert && records.length) console.log(`✅ 已更新 ${records.length} 筆紀錄`);
}

// === 儲存到資料庫 ===
async function saveToDB(record) {
  try {
    if (!record.usage || isNaN(record.usage)) record.usage = 0;
    if (!record.emission || isNaN(record.emission)) record.emission = 0;

    const res = await fetch("/api/Carbon/SaveRecord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const js = await res.json();
    console.log(`✅ [DB] 已寫入資料庫 → ${js.record?.id || "無ID"} | 項目：${record.name}`);
  } catch (err) {
    console.warn("❌ [DB] 無法寫入資料庫。", err);
  }
}

// === 從資料庫載入舊資料 ===
async function loadRecordsFromDB() {
  try {
    const res = await fetch("/api/Carbon/GetRecords");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.length > 0) {
      records = data.map((d) => ({
        name: d.name,
        usage: d.usage,
        unit: d.unit,
        factor: d.factor,
        emission: d.emission,
      }));
      console.log(`💾 [DB] 已載入 ${data.length} 筆舊資料`);
      renderTable();
      updateChart();
    }
  } catch (err) {
    console.warn("⚠️ [DB] 無法載入舊資料。", err);
  }
}

// === 移除單筆 ===
async function removeRecord(index) {
  const rec = records[index];
  records.splice(index, 1);
  renderTable(false);
  updateChart();

  try {
    const res = await fetch(`/api/Carbon/Delete/${rec.id || 0}`, { method: "DELETE" });
    if (res.ok) console.log(`🗑 [DB] 已刪除：${rec.name}`);
  } catch (err) {
    console.warn("⚠️ [DB] 刪除失敗。", err);
  }
}

// === 一鍵清空 ===
async function clearAll() {
  if (!confirm("確定要清空所有紀錄嗎？")) return;
  records = [];
  renderTable(false);
  updateChart();

  try {
    const res = await fetch("/api/Carbon/ClearAll", { method: "DELETE" });
    if (res.ok) console.log("🧹 [DB] 已清空 CarbonRecords");
    alert("✅ 已清空所有資料！");
  } catch (err) {
    console.warn("⚠️ [DB] 清空失敗。", err);
  }
}

// === PDF 匯出 ===
function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("CustosCarbon 碳足跡紀錄", 14, 15);

  const tableData = records.map((r) => [r.name, `${r.usage} ${r.unit}`, r.factor, r.emission]);
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
        backgroundColor: ["#ffadc6", "#ffc2d1", "#ffe5ec", "#ff8fab", "#ffb3c6",
                          "#fad2e1", "#fbb1bd", "#ffcad4", "#ffe4e1", "#f9bec7"],
        borderWidth: 1,
        hoverOffset: 8,
      }],
    },
    options: { plugins: { legend: { position: "right" } } },
  });
}
