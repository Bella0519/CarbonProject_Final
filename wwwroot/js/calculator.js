// 🌿 CustosCarbon - 改良版
// ✅ 新增功能：
// 1️⃣ 顯示單位提示（搜尋、選項選擇、一鍵加入）
// 2️⃣ 使用量輸入框 placeholder 會顯示單位
// 3️⃣ 表格每筆可直接輸入數值 → 自動更新總排放量
// 4️⃣ 其他原功能（PDF / 圖表 / 一鍵加入）完全保留

let emissionFactors = {};
let records = [];
let chart;

// === 初始化 ===
function initCalculator() {
    console.log("🌿 CustosCarbon Calculator Loaded");
    loadFactors();

    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', e => showSuggestions(e.target.value));
    }
}

// === 載入排放係數 ===
function loadFactors() {
    emissionFactors = {
        "電力": { unit: "kWh", factor: 0.509 },
        "天然氣": { unit: "m³", factor: 2.05 },
        "液化石油氣": { unit: "kg", factor: 3.0 },
        "汽車": { unit: "km", factor: 2.34 },
        "機車": { unit: "km", factor: 0.074 },
        "柴油": { unit: "L", factor: 2.68 },
        "煤炭": { unit: "kg", factor: 2.42 },
        "燃油": { unit: "L", factor: 3.1 },
        "蒸汽": { unit: "kg", factor: 0.18 },
        "公車": { unit: "km", factor: 0.089 },
        "捷運": { unit: "km", factor: 0.05 },
        "牛肉": { unit: "kg", factor: 27.0 },
        "雞肉": { unit: "kg", factor: 6.9 },
        "豬肉": { unit: "kg", factor: 12.1 },
        "蔬菜": { unit: "kg", factor: 2.0 },
        "步行": { unit: "km", factor: 0.0 },
        "腳踏車": { unit: "km", factor: 0.0 }
    };
}

// === 搜尋提示 ===
function showSuggestions(keyword) {
    const box = document.getElementById('suggestions');
    if (!box) return;

    if (!keyword.trim()) {
        box.style.display = 'none';
        return;
    }

    const suggestions = Object.keys(emissionFactors)
        .filter(k => k.includes(keyword))
        .slice(0, 6);

    if (suggestions.length === 0) {
        box.style.display = 'none';
        return;
    }

    box.innerHTML = suggestions
        .map(k => {
            const { unit, factor } = emissionFactors[k];
            return `<div class="suggestion-item" onclick="selectSuggestion('${k}')">${k}（${factor} kgCO₂e／${unit}）</div>`;
        })
        .join('');
    box.style.display = 'block';
}

// === 選擇提示項目 ===
function selectSuggestion(name) {
    const input = document.getElementById('search');
    const usageInput = document.getElementById('usage');
    const factor = emissionFactors[name];

    input.value = name;
    document.getElementById('suggestions').style.display = 'none';

    if (factor) {
        usageInput.placeholder = `輸入使用量（單位：${factor.unit}）`;
        document.getElementById('unitHint').textContent = `單位：${factor.unit}`;

    } else {
        usageInput.placeholder = '輸入使用量';
        document.getElementById('unitHint').textContent = '';
    }
}

// === 一鍵加入類別推薦項目（顯示單位） ===
function quickAdd(category) {
    let examples = [];

    switch (category) {
        case 'transport':
            examples = ['汽車', '機車', '公車', '捷運'];
            break;
        case 'food':
            examples = ['牛肉', '雞肉', '豬肉', '蔬菜'];
            break;
        case 'energy':
            examples = ['電力', '天然氣', '柴油', '煤炭'];
            break;
        case 'green':
            examples = ['步行', '腳踏車'];
            break;
    }

    examples.forEach(name => {
        const factorData = emissionFactors[name];
        if (factorData) {
            records.push({
                name: name,
                usage: "",
                factor: factorData.factor,
                unit: factorData.unit, // ✅ 顯示單位
                emission: ""
            });
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
        records[index].usage = usage; // ✅ 同步更新使用量
    }
    renderTable(false);
    updateChart();
}

// === 加入單筆紀錄（手動） ===
function addRecord() {
    const name = document.getElementById('search').value.trim();
    const usage = parseFloat(document.getElementById('usage').value);
    const unit = document.getElementById('usage').dataset.unit || '';

    if (!name || isNaN(usage) || usage <= 0) {
        alert("請輸入有效的項目名稱與使用量！");
        return;
    }

    const factor = emissionFactors[name]?.factor || 0;
    const emission = (usage * factor).toFixed(2);

    records.push({ name, usage, unit, factor, emission });
    renderTable();
    updateChart();

    // ✅ 清空輸入框
    document.getElementById('search').value = '';
    document.getElementById('usage').value = '';
    document.getElementById('usage').placeholder = '輸入使用量';
}

// === 渲染紀錄表 ===
function renderTable(showAlert = true) {
    const tbody = document.querySelector("#recordTable tbody");
    tbody.innerHTML = records.map((r, i) => `
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
        </tr>
    `).join('');

    const total = records.reduce((sum, r) => sum + (parseFloat(r.emission) || 0), 0);
    document.getElementById('totalEmission').textContent = total.toFixed(2);

    if (showAlert && records.length) {
        console.log(`✅ 已更新 ${records.length} 筆紀錄`);
    }
}

// === 移除單筆紀錄 ===
function removeRecord(index) {
    records.splice(index, 1);
    renderTable(false);
    updateChart();
}

// === 清空所有 ===
function clearAll() {
    if (confirm("確定要清空所有紀錄嗎？")) {
        records = [];
        renderTable(false);
        updateChart();
    }
}

// === PDF 匯出 ===
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("CustosCarbon 碳足跡紀錄", 14, 15);

    const tableData = records.map(r => [r.name, `${r.usage} ${r.unit || ''}`, r.factor, r.emission]);
    doc.autoTable({
        head: [["項目名稱", "使用量", "排放係數", "總排放量"]],
        body: tableData,
        startY: 25
    });

    const total = records.reduce((sum, r) => sum + (parseFloat(r.emission) || 0), 0);
    doc.text(`🌍 總碳排量：${total.toFixed(2)} kgCO₂e`, 14, doc.lastAutoTable.finalY + 10);

    doc.save("CustosCarbon_碳足跡紀錄.pdf");
}

// === 圖表 ===
function updateChart() {
    const ctx = document.getElementById('emissionChart');
    if (!ctx) return;

    const labels = records.map(r => r.name);
    const data = records.map(r => parseFloat(r.emission) || 0);

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
        options: {
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}
