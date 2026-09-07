"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";

interface ExtraItem {
  name: string;
  amount: number;
}

function isDeliveryChannelName(name: string): boolean {
  const n = name.trim();
  return (
    /^(?:line\s*man|lineman|ไลน์\s*แมน|grab|แกร็บ|robinhood|โรบินฮู้ด|shopee\s*food|shopeefood|ช้อปปี้ฟู้ด|foodpanda|ฟู้ดแพนด้า|delivery|เดลิเวอรี่|เดลิเวอรี)$/i.test(n) ||
    /^(?:ได้|รับ|รายรับ)?\s*(?:line\s*man|lineman|ไลน์\s*แมน|grab|แกร็บ|robinhood|โรบินฮู้ด|shopee\s*food|shopeefood|ช้อปปี้ฟู้ด|foodpanda|ฟู้ดแพนด้า|delivery|เดลิเวอรี่|เดลิเวอรี)$/i.test(n)
  );
}

const DELIVERY_PRESETS = ["LINE MAN", "คนละครึ่ง", "Robinhood", "Grab", "Delivery"];

export default function EntryPage() {
  const todayStr = new Date().toISOString().split("T")[0];

  // Form State
  const [shopId, setShopId] = useState<"shop1" | "shop2">("shop1");
  const [date, setDate] = useState<string>(todayStr);

  // Revenue
  const [transfer, setTransfer] = useState<string>("");
  const [cash, setCash] = useState<string>("");
  const [deliveryTitle, setDeliveryTitle] = useState<string>("LINE MAN");
  const [delivery, setDelivery] = useState<string>("");

  // Extra Income (e.g. additional channels)
  const [extraIncome, setExtraIncome] = useState<ExtraItem[]>([]);
  const [newIncomeName, setNewIncomeName] = useState("");
  const [newIncomeAmount, setNewIncomeAmount] = useState("");

  // Pork Breakdown & Price Lock State
  const [redQty, setRedQty] = useState<string>("");
  const [redPrice, setRedPrice] = useState<string>("130");

  const [mincedQty, setMincedQty] = useState<string>("");
  const [mincedPrice, setMincedPrice] = useState<string>("120");

  const [fatQty, setFatQty] = useState<string>("");
  const [fatPrice, setFatPrice] = useState<string>("80");

  const [isEditingPorkPrices, setIsEditingPorkPrices] = useState<boolean>(false);

  // Fixed/Common Expenses
  const [materials, setMaterials] = useState<string>("");
  const [labor, setLabor] = useState<string>("");
  const [gas, setGas] = useState<string>("");
  const [ice, setIce] = useState<string>("");

  // Extra Expenses
  const [extraExpenses, setExtraExpenses] = useState<ExtraItem[]>([]);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [hasCarriedNotice, setHasCarriedNotice] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch Latest Defaults whenever shopId or date changes
  const loadBranchDefaults = useCallback(async (selectedShop: string, selectedDate: string) => {
    setLoadingDefaults(true);
    try {
      const res = await fetch(`/api/entry?shopId=${selectedShop}&date=${selectedDate}`);
      const json = await res.json();
      if (json.success && json.data) {
        const { latestPorkPrices, latestExpenses, existing } = json.data;

        // 1. Pork Prices
        if (latestPorkPrices) {
          if (latestPorkPrices.redPrice) setRedPrice(String(latestPorkPrices.redPrice));
          if (latestPorkPrices.mincedPrice) setMincedPrice(String(latestPorkPrices.mincedPrice));
          if (latestPorkPrices.fatPrice) setFatPrice(String(latestPorkPrices.fatPrice));
        }

        // 2. Existing record on this date or prior expenses
        if (existing) {
          // If record already exists today, load today's saved numbers
          setTransfer(existing.transfer ? String(existing.transfer) : "");
          setCash(existing.cash ? String(existing.cash) : "");
          setDelivery(existing.delivery ? String(existing.delivery) : "");
          setMaterials(existing.materials ? String(existing.materials) : "");
          setLabor(existing.labor ? String(existing.labor) : "");
          setGas(existing.gas ? String(existing.gas) : "");
          setIce(existing.ice ? String(existing.ice) : "");
          if (existing.extraExpenses?.length) setExtraExpenses(existing.extraExpenses);
          if (existing.extraIncome?.length) {
            setExtraIncome(existing.extraIncome.filter((item: ExtraItem) => !isDeliveryChannelName(item.name)));
          }
          if (existing.porkBreakdown) {
            setRedQty(existing.porkBreakdown.redQty ? String(existing.porkBreakdown.redQty) : "");
            setMincedQty(existing.porkBreakdown.mincedQty ? String(existing.porkBreakdown.mincedQty) : "");
            setFatQty(existing.porkBreakdown.fatQty ? String(existing.porkBreakdown.fatQty) : "");
          }
          setHasCarriedNotice(false);
        } else if (latestExpenses) {
          // Carry-forward prior expenses
          if (latestExpenses.labor) setLabor(String(latestExpenses.labor));
          if (latestExpenses.gas) setGas(String(latestExpenses.gas));
          if (latestExpenses.ice) setIce(String(latestExpenses.ice));
          if (latestExpenses.materials) setMaterials(String(latestExpenses.materials));
          if (latestExpenses.extraExpenses?.length) {
            setExtraExpenses(latestExpenses.extraExpenses);
          }
          setHasCarriedNotice(true);
        }
      }
    } catch (e) {
      console.warn("Failed to load defaults", e);
    } finally {
      setLoadingDefaults(false);
    }
  }, []);

  useEffect(() => {
    loadBranchDefaults(shopId, date);
  }, [shopId, date, loadBranchDefaults]);

  // Calculations
  const extraIncomeSum = useMemo(() => {
    return extraIncome.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [extraIncome]);

  const revenueTotal = useMemo(() => {
    const t = parseFloat(transfer) || 0;
    const c = parseFloat(cash) || 0;
    const d = parseFloat(delivery) || 0;
    return t + c + d + extraIncomeSum;
  }, [transfer, cash, delivery, extraIncomeSum]);

  const porkTotal = useMemo(() => {
    const r = (parseFloat(redQty) || 0) * (parseFloat(redPrice) || 0);
    const m = (parseFloat(mincedQty) || 0) * (parseFloat(mincedPrice) || 0);
    const f = (parseFloat(fatQty) || 0) * (parseFloat(fatPrice) || 0);
    return r + m + f;
  }, [redQty, redPrice, mincedQty, mincedPrice, fatQty, fatPrice]);

  const expensesTotal = useMemo(() => {
    const m = parseFloat(materials) || 0;
    const l = parseFloat(labor) || 0;
    const g = parseFloat(gas) || 0;
    const i = parseFloat(ice) || 0;
    const extras = extraExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    return porkTotal + m + l + g + i + extras;
  }, [porkTotal, materials, labor, gas, ice, extraExpenses]);

  const netProfit = useMemo(() => revenueTotal - expensesTotal, [revenueTotal, expensesTotal]);

  // Extra Income Handlers
  const handleAddExtraIncome = () => {
    const amount = parseFloat(newIncomeAmount);
    if (!newIncomeName.trim() || isNaN(amount) || amount <= 0) return;
    setExtraIncome([...extraIncome, { name: newIncomeName.trim(), amount }]);
    setNewIncomeName("");
    setNewIncomeAmount("");
  };

  const handleRemoveExtraIncome = (index: number) => {
    setExtraIncome(extraIncome.filter((_, i) => i !== index));
  };

  // Extra Expense Handlers
  const handleAddExtraExpense = () => {
    const amount = parseFloat(newExpenseAmount);
    if (!newExpenseName.trim() || isNaN(amount) || amount <= 0) return;
    setExtraExpenses([...extraExpenses, { name: newExpenseName.trim(), amount }]);
    setNewExpenseName("");
    setNewExpenseAmount("");
  };

  const handleRemoveExtraExpense = (index: number) => {
    setExtraExpenses(extraExpenses.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    const deliveryAmount = parseFloat(delivery) || 0;
    const combinedExtraIncome = extraIncome.filter((item) => !isDeliveryChannelName(item.name));

    const payload = {
      shopId,
      shopName: shopId === "shop1" ? "ตลาดญี่ปุ่น" : "สายหนองปิง",
      date,
      transfer: parseFloat(transfer) || 0,
      cash: parseFloat(cash) || 0,
      delivery: deliveryAmount,
      extraIncome: combinedExtraIncome,
      revenue: revenueTotal,
      pork: porkTotal,
      porkBreakdown: {
        redQty: parseFloat(redQty) || 0,
        redPrice: parseFloat(redPrice) || 0,
        redTotal: (parseFloat(redQty) || 0) * (parseFloat(redPrice) || 0),
        mincedQty: parseFloat(mincedQty) || 0,
        mincedPrice: parseFloat(mincedPrice) || 0,
        mincedTotal: (parseFloat(mincedQty) || 0) * (parseFloat(mincedPrice) || 0),
        fatQty: parseFloat(fatQty) || 0,
        fatPrice: parseFloat(fatPrice) || 0,
        fatTotal: (parseFloat(fatQty) || 0) * (parseFloat(fatPrice) || 0),
        total: porkTotal,
      },
      materials: parseFloat(materials) || 0,
      labor: parseFloat(labor) || 0,
      gas: parseFloat(gas) || 0,
      ice: parseFloat(ice) || 0,
      extraExpenses,
      expense: expensesTotal,
      profit: netProfit,
      status: "complete",
    };

    try {
      const res = await fetch("/api/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "บันทึกยอดไม่สำเร็จ");
      }

      setStatusMessage({
        type: "success",
        text: `✅ บันทึกยอดเรียบร้อย! สาขา${payload.shopName} ประจำวันที่ ${date}`,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0F172A", color: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflowX: "hidden" }}>
      {/* Top Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
          padding: "24px 16px",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(16, 185, 129, 0.2)",
        }}
      >
        <h1 style={{ fontSize: "1.45rem", fontWeight: "bold", margin: 0, color: "#FFFFFF" }}>
          📝 ตารางบันทึกรายรับ - รายจ่าย
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#D1FAE5" }}>
          ระบบลงบัญชีรายวัน ร้านครูตอม
        </p>
      </div>

      <div style={{ maxWidth: "560px", width: "100%", margin: "0 auto", padding: "16px", boxSizing: "border-box" }}>
        {/* Status Toast */}
        {statusMessage && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "16px",
              backgroundColor: statusMessage.type === "success" ? "#064E3B" : "#7F1D1D",
              color: statusMessage.type === "success" ? "#A7F3D0" : "#FECACA",
              border: `1px solid ${statusMessage.type === "success" ? "#059669" : "#DC2626"}`,
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Carry Forward Notice */}
        {hasCarriedNotice && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              marginBottom: "12px",
              backgroundColor: "#1E3A8A",
              color: "#BFDBFE",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>📋 ดึงราคาหมูและรายจ่ายประจำจากยอดล่าสุดให้อัตโนมัติ</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>(แก้ไขได้)</span>
          </div>
        )}

        {/* Live Summary Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
            backgroundColor: "#1E293B",
            borderRadius: "12px",
            padding: "12px",
            marginBottom: "16px",
            border: "1px solid #334155",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>💰 รายรับรวม</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#34D399" }}>
              ฿{revenueTotal.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>💸 รายจ่ายรวม</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#F87171" }}>
              ฿{expensesTotal.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>📈 กำไรสุทธิ</div>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: "bold",
                color: netProfit >= 0 ? "#60A5FA" : "#F87171",
              }}
            >
              ฿{netProfit.toLocaleString()}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Branch & Date Selection */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "16px", marginBottom: "16px", border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#94A3B8" }}>
                🏪 เลือกสาขา
              </label>
              {loadingDefaults && <span style={{ fontSize: "0.75rem", color: "#38BDF8" }}>กำลังโหลดข้อมูล...</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={() => setShopId("shop1")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                  backgroundColor: shopId === "shop1" ? "#10B981" : "#334155",
                  color: shopId === "shop1" ? "#FFFFFF" : "#CBD5E1",
                }}
              >
                ตลาดญี่ปุ่น
              </button>
              <button
                type="button"
                onClick={() => setShopId("shop2")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                  backgroundColor: shopId === "shop2" ? "#10B981" : "#334155",
                  color: shopId === "shop2" ? "#FFFFFF" : "#CBD5E1",
                }}
              >
                สายหนองปิง
              </button>
            </div>

            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "8px", color: "#94A3B8" }}>
              📅 วันที่บันทึก
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                backgroundColor: "#0F172A",
                color: "#FFFFFF",
                border: "1px solid #475569",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Section 1: Income / Revenue */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "16px", marginBottom: "16px", border: "1px solid #334155" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: "bold", color: "#34D399", margin: "0 0 12px 0" }}>
              💰 รายรับประจำวัน
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Transfer & Cash */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94A3B8", marginBottom: "4px" }}>💳 ยอดโอน (บาท)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={transfer}
                    onChange={(e) => setTransfer(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#0F172A", color: "#FFF", border: "1px solid #475569", boxSizing: "border-box", fontSize: "1rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94A3B8", marginBottom: "4px" }}>💵 เงินสด (บาท)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#0F172A", color: "#FFF", border: "1px solid #475569", boxSizing: "border-box", fontSize: "1rem" }}
                  />
                </div>
              </div>

              {/* Delivery with customizable title */}
              <div style={{ backgroundColor: "#0F172A", borderRadius: "8px", padding: "10px", border: "1px solid #334155" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "#38BDF8", fontWeight: "bold" }}>
                    🛵 รายรับเสริม / Delivery (พิมพ์หัวข้อได้)
                  </label>
                </div>

                {/* Quick Presets */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {DELIVERY_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDeliveryTitle(`ยอด ${preset}`)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        backgroundColor: deliveryTitle.includes(preset) ? "#0284C7" : "#334155",
                        color: "#FFFFFF",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "8px", width: "100%", boxSizing: "border-box" }}>
                  <input
                    type="text"
                    placeholder="ชื่อหัวข้อ (เช่น ยอด LINE MAN)"
                    value={deliveryTitle}
                    onChange={(e) => setDeliveryTitle(e.target.value)}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      backgroundColor: "#1E293B",
                      color: "#FFF",
                      border: "1px solid #475569",
                      fontSize: "0.9rem",
                    }}
                  />
                  <input
                    type="number"
                    placeholder="จำนวนเงิน (฿)"
                    value={delivery}
                    onChange={(e) => setDelivery(e.target.value)}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      backgroundColor: "#1E293B",
                      color: "#FFF",
                      border: "1px solid #475569",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>
              </div>

              {/* Extra Income Rows */}
              {extraIncome.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", boxSizing: "border-box" }}>
                  {extraIncome.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: "#0F172A",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        border: "1px solid #334155",
                        boxSizing: "border-box",
                        width: "100%",
                        minWidth: 0,
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "8px" }}>
                        💵 {item.name}: ฿{item.amount.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraIncome(idx)}
                        style={{
                          color: "#EF4444",
                          backgroundColor: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          flexShrink: 0,
                        }}
                      >
                        ✕ ลบ
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add More Extra Income */}
              <div
                style={{
                  backgroundColor: "#0F172A",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px dashed #334155",
                  boxSizing: "border-box",
                  width: "100%",
                }}
              >
                <div style={{ fontSize: "0.8rem", color: "#94A3B8", marginBottom: "8px", fontWeight: "bold" }}>
                  ➕ เพิ่มรายรับอื่น
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "8px", marginBottom: "8px", width: "100%", boxSizing: "border-box" }}>
                  <input
                    type="text"
                    placeholder="ชื่อรายรับ (เช่น คนละครึ่ง)"
                    value={newIncomeName}
                    onChange={(e) => setNewIncomeName(e.target.value)}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      backgroundColor: "#1E293B",
                      color: "#FFF",
                      border: "1px solid #475569",
                      fontSize: "0.85rem",
                    }}
                  />
                  <input
                    type="number"
                    placeholder="จำนวนเงิน (฿)"
                    value={newIncomeAmount}
                    onChange={(e) => setNewIncomeAmount(e.target.value)}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      backgroundColor: "#1E293B",
                      color: "#FFF",
                      border: "1px solid #475569",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddExtraIncome}
                  style={{
                    width: "100%",
                    padding: "8px",
                    backgroundColor: "#059669",
                    color: "#FFF",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span>➕</span> เพิ่มรายการรายรับนี้
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Pork Breakdown */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "16px", marginBottom: "16px", border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: "bold", color: "#FBBF24", margin: 0 }}>
                🥩 ยอดหมูประจำวัน
              </h2>
              <button
                type="button"
                onClick={() => setIsEditingPorkPrices(!isEditingPorkPrices)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  backgroundColor: isEditingPorkPrices ? "#10B981" : "#334155",
                  color: "#FFFFFF",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                }}
              >
                {isEditingPorkPrices ? "✔️ บันทึกราคา" : "✏️ แก้ไขราคา"}
              </button>
            </div>

            {/* Price Badge / Notice */}
            {!isEditingPorkPrices && (
              <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginBottom: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span>🔴 แดง: ฿{redPrice}/กก.</span>
                <span>🟠 สับ: ฿{mincedPrice}/กก.</span>
                <span>🟡 มัน: ฿{fatPrice}/กก.</span>
                <span style={{ color: "#38BDF8" }}>(ดึงค่าล่าสุดแล้ว)</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Red Pork */}
              <div style={{ display: "grid", gridTemplateColumns: isEditingPorkPrices ? "1fr 1fr" : "1fr", gap: "8px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#F87171", fontWeight: "bold" }}>🔴 หมูแดง (กิโลกรัม)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="เช่น 4 หรือ 4.5"
                    value={redQty}
                    onChange={(e) => setRedQty(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#0F172A", color: "#FFF", border: "1px solid #475569", boxSizing: "border-box", fontSize: "1rem" }}
                  />
                </div>
                {isEditingPorkPrices && (
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#94A3B8" }}>ราคาหมูแดง (บาท/กก.)</label>
                    <input
                      type="number"
                      value={redPrice}
                      onChange={(e) => setRedPrice(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#0F172A", color: "#FBBF24", border: "1px solid #F59E0B", boxSizing: "border-box", fontSize: "1rem" }}
                    />
                  </div>
                )}
              </div>

              {/* Minced Pork */}
              <div style={{ display: "grid", gridTemplateColumns: isEditingPorkPrices ? "1fr 1fr" : "1fr", gap: "8px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#FB923C", fontWeight: "bold" }}>🟠 หมูสับ (กิโลกรัม)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="เช่น 3"
                    value={mincedQty}
                    onChange={(e) => setMincedQty(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#0F172A", color: "#FFF", border: "1px solid #475569", boxSizing: "border-box", fontSize: "1rem" }}
                  />
                </div>
                {isEditingPorkPrices && (
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#94A3B8" }}>ราคาหมูสับ (บาท/กก.)</label>
                    <input
                      type="number"
                      value={mincedPrice}
                      onChange={(e) => setMincedPrice(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#0F172A", color: "#FBBF24", border: "1px solid #F59E0B", boxSizing: "border-box", fontSize: "1rem" }}
                    />
                  </div>
                )}
              </div>

              {/* Fat Pork */}
              <div style={{ display: "grid", gridTemplateColumns: isEditingPorkPrices ? "1fr 1fr" : "1fr", gap: "8px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#FDE047", fontWeight: "bold" }}>🟡 มันหมู (กิโลกรัม)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="เช่น 2 หรือ 8"
                    value={fatQty}
                    onChange={(e) => setFatQty(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#0F172A", color: "#FFF", border: "1px solid #475569", boxSizing: "border-box", fontSize: "1rem" }}
                  />
                </div>
                {isEditingPorkPrices && (
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#94A3B8" }}>ราคามันหมู (บาท/กก.)</label>
                    <input
                      type="number"
                      value={fatPrice}
                      onChange={(e) => setFatPrice(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#0F172A", color: "#FBBF24", border: "1px solid #F59E0B", boxSizing: "border-box", fontSize: "1rem" }}
                    />
                  </div>
                )}
              </div>

              {/* Pork Subtotal */}
              <div style={{ textAlign: "right", fontSize: "0.85rem", color: "#FBBF24", fontWeight: "bold", paddingTop: "4px" }}>
                รวมค่าหมู: ฿{porkTotal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Section 3: Expenses (Pre-filled from latest) */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "16px", marginBottom: "20px", border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: "bold", color: "#F87171", margin: 0 }}>
                💸 รายจ่าย (ดึงค่าล่าสุดให้อัตโนมัติ)
              </h2>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: "0 0 12px 0" }}>
              ค่าแรง แก๊ส น้ำแข็ง และวัตถุดิบดึงจากวันที่บันทึกล่าสุด สามารถแก้ไขได้ทันที
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#94A3B8" }}>📦 วัตถุดิบ (บาท)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#0F172A", color: "#FFF", border: "1px solid #475569", boxSizing: "border-box", fontSize: "1rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#94A3B8" }}>👷 ค่าแรง (บาท)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={labor}
                  onChange={(e) => setLabor(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#0F172A", color: "#FFF", border: "1px solid #475569", boxSizing: "border-box", fontSize: "1rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#94A3B8" }}>🔥 แก๊ส (บาท)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={gas}
                  onChange={(e) => setGas(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#0F172A", color: "#FFF", border: "1px solid #475569", boxSizing: "border-box", fontSize: "1rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#94A3B8" }}>🧊 น้ำแข็ง (บาท)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={ice}
                  onChange={(e) => setIce(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#0F172A", color: "#FFF", border: "1px solid #475569", boxSizing: "border-box", fontSize: "1rem" }}
                />
              </div>
            </div>

            {/* Custom Extra Expenses */}
            <div style={{ borderTop: "1px solid #334155", paddingTop: "14px", marginTop: "14px", width: "100%", boxSizing: "border-box" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#CBD5E1", marginBottom: "10px", fontWeight: "bold" }}>
                ➕ รายจ่ายพิเศษ (ดึงจากล่าสุด / เพิ่มใหม่ได้ เช่น แม็คโคร)
              </label>

              {extraExpenses.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px", width: "100%", boxSizing: "border-box" }}>
                  {extraExpenses.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: "#0F172A",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        border: "1px solid #334155",
                        boxSizing: "border-box",
                        width: "100%",
                        minWidth: 0,
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "8px" }}>
                        🏷️ {item.name}: ฿{item.amount.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraExpense(idx)}
                        style={{
                          color: "#EF4444",
                          backgroundColor: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          flexShrink: 0,
                        }}
                      >
                        ✕ ลบ
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Extra Expense Form */}
              <div
                style={{
                  backgroundColor: "#0F172A",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px dashed #475569",
                  boxSizing: "border-box",
                  width: "100%",
                }}
              >
                <div style={{ fontSize: "0.8rem", color: "#94A3B8", marginBottom: "8px", fontWeight: "bold" }}>
                  ➕ เพิ่มรายการรายจ่ายพิเศษใหม่
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "8px", marginBottom: "8px", width: "100%", boxSizing: "border-box" }}>
                  <input
                    type="text"
                    placeholder="ชื่อรายการ (เช่น แม็คโคร)"
                    value={newExpenseName}
                    onChange={(e) => setNewExpenseName(e.target.value)}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      backgroundColor: "#1E293B",
                      color: "#FFF",
                      border: "1px solid #475569",
                      fontSize: "0.85rem",
                    }}
                  />
                  <input
                    type="number"
                    placeholder="จำนวนเงิน (฿)"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      backgroundColor: "#1E293B",
                      color: "#FFF",
                      border: "1px solid #475569",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddExtraExpense}
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "#2563EB",
                    color: "#FFF",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span>➕</span> เพิ่มรายการรายจ่ายนี้
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "12px",
              background: loading ? "#6B7280" : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "#FFFFFF",
              fontSize: "1.1rem",
              fontWeight: "bold",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
              transition: "transform 0.1s ease",
            }}
          >
            {loading ? "⏳ กำลังบันทึก..." : "💾 บันทึกยอดเข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
