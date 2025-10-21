const customTransportFactors = [
  { name: "公車（大眾運輸）", unit: "km·人", factor: 0.04, source: "CarbonLuck, 交通部運輸研究所、市區公車平均值" },
  { name: "捷運／地鐵", unit: "km·人", factor: 0.04, source: "ZeroZero 永續博客, 台北捷運能源統計" },
  { name: "高鐵", unit: "km·人", factor: 0.032, source: "台灣高鐵公司碳排放報告" },
  { name: "自用小客車（汽油）", unit: "km", factor: 0.115, source: "CarbonLuck, 一般小客車燃油效率推算" },
  { name: "機車", unit: "km", factor: 0.0951, source: "CarbonLuck, 平均油耗資料推算" },
  { name: "自行車／步行", unit: "km", factor: 0.0, source: "calculator.tw 公共交通碳足跡計算器" },
  { name: "飛機（客運）", unit: "km·人", factor: 0.25, source: "CarbonLuck, 航空運輸平均值" },
  { name: "貨運重車", unit: "km", factor: 0.3, source: "Wikipedia - 交通運輸對環境影響文獻彙整" },
  { name: "汽油（燃料）", unit: "L", factor: 2.2631, source: "環境部二氧化碳排放指數（能源耗用量與 CO₂ 換算表）" },
  { name: "柴油（車用／運輸）", unit: "L", factor: 3.29, source: "環境部碳足跡排放係數開放資料 CFP_P_02" },
  { name: "公車（台南市研究）", unit: "km·人", factor: 0.0546, source: "研究報告: Life Cycle Assessment of Carbon Footprint in Public Transportation - Bus Route No.2, Tainan City, Taiwan" }
];
