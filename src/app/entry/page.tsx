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
    /^(?:ได้|รับ|รายรับ|ยอด)?\s*(?:line\s*man|lineman|ไลน์\s*แมน|grab|แกร็บ|robinhood|โรบินฮู้ด|shopee\s*food|shopeefood|ช้อปปี้ฟู้ด|foodpanda|ฟู้ดแพนด้า|delivery|เดลิเวอรี่|เดลิเวอรี)$/i.test(n)
  );
}

interface DeliveryPresetConfig {
  name: string;
  color: string;
  borderColor: string;
  icon: string;
}

const DELIVERY_PRESETS: DeliveryPresetConfig[] = [
  { name: "LINE MAN", color: "var(--delivery-lineman)", borderColor: "rgba(6, 199, 85, 0.3)", icon: "🛵" },
  { name: "Grab", color: "var(--delivery-grab)", borderColor: "rgba(0, 177, 79, 0.3)", icon: "🛵" },
  { name: "Robinhood", color: "var(--delivery-robinhood)", borderColor: "rgba(140, 68, 219, 0.3)", icon: "🛵" },
  { name: "ShopeeFood", color: "var(--delivery-shopee)", borderColor: "rgba(238, 77, 45, 0.3)", icon: "🛵" },
  { name: "คนละครึ่ง", color: "var(--info)", borderColor: "var(--info-tint)", icon: "📱" },
  { name: "Delivery", color: "var(--text-secondary)", borderColor: "var(--border)", icon: "🛵" },
];

function getPresetConfig(name: string): DeliveryPresetConfig | undefined {
  const clean = name.toLowerCase();
  return DELIVERY_PRESETS.find((p) => clean.includes(p.name.toLowerCase()));
}

export default function EntryPage() {
  const todayStr = new Date().toISOString().split("T")[0];

  // Form State
  const [shopId, setShopId] = useState<"shop1" | "shop2">("shop1");
  const [date, setDate] = useState<string>(todayStr);

  // Revenue
  const [transfer, setTransfer] = useState<string>("");
  const [cash, setCash] = useState<string>("");

  // Delivery & Extra Income Items
  const [incomeItems, setIncomeItems] = useState<ExtraItem[]>([]);
  const [activePresetTab, setActivePresetTab] = useState<string>("LINE MAN");
  const [itemTitle, setItemTitle] = useState<string>("LINE MAN");
  const [itemAmount, setItemAmount] = useState<string>("");

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
          setTransfer(existing.transfer ? String(existing.transfer) : "");
          setCash(existing.cash ? String(existing.cash) : "");
          setMaterials(existing.materials ? String(existing.materials) : "");
          setLabor(existing.labor ? String(existing.labor) : "");
          setGas(existing.gas ? String(existing.gas) : "");
          setIce(existing.ice ? String(existing.ice) : "");
          if (existing.extraExpenses?.length) setExtraExpenses(existing.extraExpenses);

          const loadedItems: ExtraItem[] = [];
          if (existing.extraIncome?.length) {
            loadedItems.push(...existing.extraIncome);
          }
          const hasDelivery = loadedItems.some((it) => isDeliveryChannelName(it.name));
          if (existing.delivery && existing.delivery > 0 && !hasDelivery) {
            loadedItems.unshift({ name: "Delivery", amount: existing.delivery });
          }
          setIncomeItems(loadedItems);

          if (existing.porkBreakdown) {
            setRedQty(existing.porkBreakdown.redQty ? String(existing.porkBreakdown.redQty) : "");
            setMincedQty(existing.porkBreakdown.mincedQty ? String(existing.porkBreakdown.mincedQty) : "");
            setFatQty(existing.porkBreakdown.fatQty ? String(existing.porkBreakdown.fatQty) : "");
          }
          setHasCarriedNotice(false);
        } else if (latestExpenses) {
          if (latestExpenses.labor) setLabor(String(latestExpenses.labor));
          if (latestExpenses.gas) setGas(String(latestExpenses.gas));
          if (latestExpenses.ice) setIce(String(latestExpenses.ice));
          if (latestExpenses.materials) setMaterials(String(latestExpenses.materials));
          if (latestExpenses.extraExpenses?.length) {
            setExtraExpenses(latestExpenses.extraExpenses);
          }
          setIncomeItems([]);
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
  const deliveryItems = useMemo(() => {
    return incomeItems.filter((item) => isDeliveryChannelName(item.name));
  }, [incomeItems]);

  const deliveryTotal = useMemo(() => {
    return deliveryItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [deliveryItems]);

  const otherIncomeItems = useMemo(() => {
    return incomeItems.filter((item) => !isDeliveryChannelName(item.name));
  }, [incomeItems]);

  const otherIncomeTotal = useMemo(() => {
    return otherIncomeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [otherIncomeItems]);

  const totalDeliveryAndExtra = useMemo(() => {
    return deliveryTotal + otherIncomeTotal;
  }, [deliveryTotal, otherIncomeTotal]);

  const revenueTotal = useMemo(() => {
    const t = parseFloat(transfer) || 0;
    const c = parseFloat(cash) || 0;
    return t + c + totalDeliveryAndExtra;
  }, [transfer, cash, totalDeliveryAndExtra]);

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

  // Delivery & Extra Income Handlers
  const handleSelectPresetTab = (presetName: string) => {
    setActivePresetTab(presetName);
    setItemTitle(presetName);
  };

  const handleSelectCustomTab = () => {
    setActivePresetTab("custom");
    setItemTitle("");
  };

  const handleAddIncomeItem = () => {
    const amount = parseFloat(itemAmount);
    const title = itemTitle.trim() || (activePresetTab !== "custom" ? activePresetTab : "");
    if (!title || isNaN(amount) || amount <= 0) return;

    setIncomeItems((prev) => [...prev, { name: title, amount }]);
    setItemAmount("");
  };

  const handleRemoveIncomeItem = (index: number) => {
    setIncomeItems((prev) => prev.filter((_, i) => i !== index));
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

    let finalItems = [...incomeItems];
    const pendingAmount = parseFloat(itemAmount);
    const pendingTitle = itemTitle.trim() || (activePresetTab !== "custom" ? activePresetTab : "");
    if (pendingTitle && !isNaN(pendingAmount) && pendingAmount > 0) {
      finalItems.push({ name: pendingTitle, amount: pendingAmount });
      setIncomeItems(finalItems);
      setItemAmount("");
    }

    const deliveryAmount = finalItems
      .filter((item) => isDeliveryChannelName(item.name))
      .reduce((sum, item) => sum + item.amount, 0);

    const cleanExtraIncome = finalItems.filter((item) => !isDeliveryChannelName(item.name));
    const extraIncomeTotal = cleanExtraIncome.reduce((sum, item) => sum + item.amount, 0);
    const calculatedRevenue = (parseFloat(transfer) || 0) + (parseFloat(cash) || 0) + deliveryAmount + extraIncomeTotal;

    const payload = {
      shopId,
      shopName: shopId === "shop1" ? "ตลาดญี่ปุ่น" : "สายหนองปิง",
      date,
      transfer: parseFloat(transfer) || 0,
      cash: parseFloat(cash) || 0,
      delivery: deliveryAmount,
      extraIncome: cleanExtraIncome,
      revenue: calculatedRevenue,
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
      profit: calculatedRevenue - expensesTotal,
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
        text: `บันทึกยอดเรียบร้อย! สาขา${payload.shopName} ประจำวันที่ ${date}`,
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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        color: "var(--text-primary)",
        paddingBottom: "48px",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          backgroundColor: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "20px 16px",
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--primary)",
                backgroundColor: "var(--primary-tint)",
                padding: "4px 10px",
                borderRadius: "var(--radius-pill)",
                marginBottom: "6px",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--primary)" }} />
              ระบบบันทึกรายวัน
            </div>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              บันทึกรายรับ - รายจ่าย
            </h1>
          </div>

          <div
            style={{
              textAlign: "right",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--surface-raised)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontWeight: 600,
              }}
            >
              {shopId === "shop1" ? "ตลาดญี่ปุ่น" : "สายหนองปิง"}
            </span>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: "600px",
          width: "100%",
          margin: "0 auto",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        {/* Status Toast Notification */}
        {statusMessage && (
          <div
            role="alert"
            style={{
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              marginBottom: "16px",
              backgroundColor: statusMessage.type === "success" ? "var(--success-tint)" : "var(--danger-tint)",
              color: statusMessage.type === "success" ? "var(--success)" : "var(--danger)",
              border: `1px solid ${statusMessage.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              fontSize: "0.9rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>{statusMessage.type === "success" ? "✓" : "⚠"}</span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Carry Forward Notice */}
        {hasCarriedNotice && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              marginBottom: "16px",
              backgroundColor: "var(--info-tint)",
              border: "1px solid var(--border)",
              color: "var(--info)",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>ℹ</span>
              ดึงราคาหมูและรายจ่ายประจำจากยอดล่าสุดให้อัตโนมัติ
            </span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>(แก้ไขได้)</span>
          </div>
        )}

        {/* Live Summary KPI Metric Bar */}
        <section
          aria-label="สรุปยอดสด"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1.1fr",
            gap: "10px",
            backgroundColor: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            padding: "16px",
            marginBottom: "20px",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              รายรับรวม
            </span>
            <span
              className="tabular-nums"
              style={{
                fontSize: "clamp(1.1rem, 3.5vw, 1.25rem)",
                fontWeight: 700,
                color: "var(--primary)",
                lineHeight: 1.2,
              }}
            >
              ฿{revenueTotal.toLocaleString()}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              รายจ่ายรวม
            </span>
            <span
              className="tabular-nums"
              style={{
                fontSize: "clamp(1.1rem, 3.5vw, 1.25rem)",
                fontWeight: 700,
                color: "var(--danger)",
                lineHeight: 1.2,
              }}
            >
              ฿{expensesTotal.toLocaleString()}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              paddingLeft: "8px",
              borderLeft: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              กำไรสุทธิ
            </span>
            <span
              className="tabular-nums"
              style={{
                fontSize: "clamp(1.1rem, 3.8vw, 1.25rem)",
                fontWeight: 800,
                color: netProfit >= 0 ? "var(--primary)" : "var(--danger)",
                lineHeight: 1.2,
              }}
            >
              ฿{netProfit.toLocaleString()}
            </span>
          </div>
        </section>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Card 1: Branch & Date Selection */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              padding: "18px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                เลือกสาขา
              </label>
              {loadingDefaults && (
                <span style={{ fontSize: "0.75rem", color: "var(--info)", fontWeight: 500 }}>
                  กำลังโหลดข้อมูล...
                </span>
              )}
            </div>

            {/* 48px Branch Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <button
                type="button"
                className="touch-target"
                onClick={() => setShopId("shop1")}
                style={{
                  padding: "12px",
                  borderRadius: "var(--radius-md)",
                  border: shopId === "shop1" ? "2px solid var(--primary)" : "1px solid var(--border)",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  backgroundColor: shopId === "shop1" ? "var(--primary-tint)" : "var(--surface-raised)",
                  color: shopId === "shop1" ? "var(--primary)" : "var(--text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                ตลาดญี่ปุ่น
              </button>
              <button
                type="button"
                className="touch-target"
                onClick={() => setShopId("shop2")}
                style={{
                  padding: "12px",
                  borderRadius: "var(--radius-md)",
                  border: shopId === "shop2" ? "2px solid var(--primary)" : "1px solid var(--border)",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  backgroundColor: shopId === "shop2" ? "var(--primary-tint)" : "var(--surface-raised)",
                  color: shopId === "shop2" ? "var(--primary)" : "var(--text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                สายหนองปิง
              </button>
            </div>

            <label
              htmlFor="entry-date"
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "8px",
                color: "var(--text-primary)",
              }}
            >
              วันที่บันทึก
            </label>
            <input
              id="entry-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="touch-target tabular-nums"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--surface-raised)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                fontSize: "1rem",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {/* Card 2: Revenue Section */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              padding: "18px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)", margin: 0 }}>
                รายรับประจำวัน
              </h2>
              <span className="tabular-nums" style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                รวม ฿{revenueTotal.toLocaleString()}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Transfer & Cash Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label
                    htmlFor="input-transfer"
                    style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}
                  >
                    ยอดโอน (บาท)
                  </label>
                  <input
                    id="input-transfer"
                    type="number"
                    placeholder="0"
                    value={transfer}
                    onChange={(e) => setTransfer(e.target.value)}
                    className="touch-target tabular-nums"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--surface-raised)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      boxSizing: "border-box",
                      fontSize: "1rem",
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="input-cash"
                    style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}
                  >
                    เงินสด (บาท)
                  </label>
                  <input
                    id="input-cash"
                    type="number"
                    placeholder="0"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    className="touch-target tabular-nums"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--surface-raised)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      boxSizing: "border-box",
                      fontSize: "1rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Delivery / Extra Income Section */}
              <div
                style={{
                  backgroundColor: "var(--surface-raised)",
                  borderRadius: "var(--radius-md)",
                  padding: "16px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🛵</span> รายรับ Delivery / เสริม
                  </label>
                  {incomeItems.length > 0 && (
                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--primary)",
                        backgroundColor: "var(--primary-tint)",
                        padding: "3px 8px",
                        borderRadius: "var(--radius-pill)",
                        border: "1px solid rgba(6, 199, 85, 0.25)",
                      }}
                    >
                      รวม ฿{totalDeliveryAndExtra.toLocaleString()}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                  เลือกแถบรายการ ใส่จำนวนเงิน แล้วกดบันทึกเพื่อเพิ่มรายการแถบอื่นต่อได้
                </div>

                {/* Preset Chips / Tabs */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                  {DELIVERY_PRESETS.map((preset) => {
                    const isSelected = activePresetTab === preset.name;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleSelectPresetTab(preset.name)}
                        className="touch-target"
                        style={{
                          minHeight: "36px",
                          padding: "6px 12px",
                          borderRadius: "var(--radius-pill)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          backgroundColor: isSelected ? preset.color : "var(--surface)",
                          color: isSelected ? "#FFFFFF" : "var(--text-secondary)",
                          border: `1px solid ${isSelected ? preset.color : "var(--border)"}`,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          boxShadow: isSelected ? `0 2px 8px ${preset.borderColor}` : "none",
                        }}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.name}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleSelectCustomTab}
                    className="touch-target"
                    style={{
                      minHeight: "36px",
                      padding: "6px 12px",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      backgroundColor: activePresetTab === "custom" ? "var(--primary)" : "var(--surface)",
                      color: activePresetTab === "custom" ? "#FFFFFF" : "var(--text-secondary)",
                      border: activePresetTab === "custom" ? "1px solid var(--primary)" : "1px dashed var(--border)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span>💰</span>
                    <span>+ รายการอื่น</span>
                  </button>
                </div>

                {/* Input Fields & Add Button */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>
                        ชื่อรายการ
                      </label>
                      <input
                        type="text"
                        placeholder="ชื่อรายการ (เช่น LINE MAN, คนละครึ่ง)"
                        value={itemTitle}
                        onChange={(e) => setItemTitle(e.target.value)}
                        className="touch-target"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border)",
                          fontSize: "0.9rem",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>
                        จำนวนเงิน (บาท)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={itemAmount}
                        onChange={(e) => setItemAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddIncomeItem();
                          }
                        }}
                        className="touch-target tabular-nums"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border)",
                          fontSize: "0.9rem",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddIncomeItem}
                    className="touch-target"
                    style={{
                      width: "100%",
                      minHeight: "42px",
                      padding: "10px 14px",
                      backgroundColor: "var(--primary)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                      boxShadow: "0 2px 6px rgba(6, 199, 85, 0.25)",
                    }}
                  >
                    <span>+</span>
                    <span>บันทึกรายการนี้</span>
                  </button>
                </div>

                {/* List of Added Income Items */}
                <div style={{ marginTop: "14px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      รายการที่บันทึกแล้ว ({incomeItems.length})
                    </span>
                  </div>

                  {incomeItems.length === 0 ? (
                    <div
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        backgroundColor: "var(--surface)",
                        borderRadius: "var(--radius-md)",
                        border: "1px dashed var(--border)",
                        color: "var(--text-secondary)",
                        fontSize: "0.8rem",
                      }}
                    >
                      ยังไม่มีรายการ — แตะเลือกแถบด้านบน ใส่จำนวนเงิน แล้วกด &quot;+ บันทึกรายการนี้&quot;
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {incomeItems.map((item, idx) => {
                        const preset = getPresetConfig(item.name);
                        const isDelivery = isDeliveryChannelName(item.name);
                        const badgeColor = preset ? preset.color : isDelivery ? "var(--delivery-lineman)" : "var(--info)";
                        const badgeIcon = preset?.icon ?? (isDelivery ? "🛵" : "💰");

                        return (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              backgroundColor: "var(--surface)",
                              padding: "10px 12px",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--border)",
                              gap: "8px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color: badgeColor,
                                  backgroundColor: "var(--surface-raised)",
                                  padding: "2px 8px",
                                  borderRadius: "var(--radius-pill)",
                                  border: `1px solid ${preset ? preset.borderColor : "var(--border)"}`,
                                  whiteSpace: "nowrap",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <span>{badgeIcon}</span>
                                <span>{item.name}</span>
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span
                                className="tabular-nums"
                                style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}
                              >
                                ฿{item.amount.toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveIncomeItem(idx)}
                                className="touch-target"
                                style={{
                                  color: "var(--danger)",
                                  backgroundColor: "var(--danger-tint)",
                                  border: "1px solid rgba(239, 68, 68, 0.25)",
                                  borderRadius: "var(--radius-sm)",
                                  padding: "4px 10px",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                }}
                              >
                                ลบ
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Subtotals Breakdown */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                          marginTop: "6px",
                          paddingTop: "6px",
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                          fontWeight: 600,
                        }}
                      >
                        {deliveryTotal > 0 && (
                          <span
                            style={{
                              backgroundColor: "var(--surface)",
                              padding: "4px 8px",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            🛵 Delivery: <span className="tabular-nums" style={{ color: "var(--text-primary)", fontWeight: 700 }}>฿{deliveryTotal.toLocaleString()}</span>
                          </span>
                        )}
                        {otherIncomeTotal > 0 && (
                          <span
                            style={{
                              backgroundColor: "var(--surface)",
                              padding: "4px 8px",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            📱 เสริม: <span className="tabular-nums" style={{ color: "var(--text-primary)", fontWeight: 700 }}>฿{otherIncomeTotal.toLocaleString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Pork Breakdown Section */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              padding: "18px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--warning)", margin: 0 }}>
                  ยอดหมูประจำวัน
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingPorkPrices(!isEditingPorkPrices)}
                style={{
                  minHeight: "36px",
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: isEditingPorkPrices ? "var(--warning)" : "var(--surface-raised)",
                  color: isEditingPorkPrices ? "var(--bg)" : "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  transition: "all 0.15s ease",
                }}
              >
                {isEditingPorkPrices ? "บันทึกราคา" : "แก้ไขราคา"}
              </button>
            </div>

            {/* Price reference indicator */}
            {!isEditingPorkPrices && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  marginBottom: "14px",
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <span className="tabular-nums">หมูแดง: ฿{redPrice}/กก.</span>
                <span className="tabular-nums">หมูสับ: ฿{mincedPrice}/กก.</span>
                <span className="tabular-nums">มันหมู: ฿{fatPrice}/กก.</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Red Pork Row */}
              <div style={{ display: "grid", gridTemplateColumns: isEditingPorkPrices ? "1fr 1fr" : "1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--danger)", fontWeight: 700, marginBottom: "4px" }}>
                    หมูแดง (กิโลกรัม)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="เช่น 4 หรือ 4.5"
                    value={redQty}
                    onChange={(e) => setRedQty(e.target.value)}
                    className="touch-target tabular-nums"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--surface-raised)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      boxSizing: "border-box",
                      fontSize: "1rem",
                      outline: "none",
                    }}
                  />
                </div>
                {isEditingPorkPrices && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                      ราคาหมูแดง (บาท/กก.)
                    </label>
                    <input
                      type="number"
                      value={redPrice}
                      onChange={(e) => setRedPrice(e.target.value)}
                      className="touch-target tabular-nums"
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--surface-raised)",
                        color: "var(--warning)",
                        border: "1px solid var(--warning)",
                        boxSizing: "border-box",
                        fontSize: "1rem",
                        outline: "none",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Minced Pork Row */}
              <div style={{ display: "grid", gridTemplateColumns: isEditingPorkPrices ? "1fr 1fr" : "1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--warning)", fontWeight: 700, marginBottom: "4px" }}>
                    หมูสับ (กิโลกรัม)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="เช่น 3"
                    value={mincedQty}
                    onChange={(e) => setMincedQty(e.target.value)}
                    className="touch-target tabular-nums"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--surface-raised)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      boxSizing: "border-box",
                      fontSize: "1rem",
                      outline: "none",
                    }}
                  />
                </div>
                {isEditingPorkPrices && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                      ราคาหมูสับ (บาท/กก.)
                    </label>
                    <input
                      type="number"
                      value={mincedPrice}
                      onChange={(e) => setMincedPrice(e.target.value)}
                      className="touch-target tabular-nums"
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--surface-raised)",
                        color: "var(--warning)",
                        border: "1px solid var(--warning)",
                        boxSizing: "border-box",
                        fontSize: "1rem",
                        outline: "none",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Fat Pork Row */}
              <div style={{ display: "grid", gridTemplateColumns: isEditingPorkPrices ? "1fr 1fr" : "1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--info)", fontWeight: 700, marginBottom: "4px" }}>
                    มันหมู (กิโลกรัม)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="เช่น 2 หรือ 8"
                    value={fatQty}
                    onChange={(e) => setFatQty(e.target.value)}
                    className="touch-target tabular-nums"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--surface-raised)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      boxSizing: "border-box",
                      fontSize: "1rem",
                      outline: "none",
                    }}
                  />
                </div>
                {isEditingPorkPrices && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                      ราคามันหมู (บาท/กก.)
                    </label>
                    <input
                      type="number"
                      value={fatPrice}
                      onChange={(e) => setFatPrice(e.target.value)}
                      className="touch-target tabular-nums"
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--surface-raised)",
                        color: "var(--warning)",
                        border: "1px solid var(--warning)",
                        boxSizing: "border-box",
                        fontSize: "1rem",
                        outline: "none",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Pork Subtotal */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "10px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>รวมค่าหมูตามคำนวณ</span>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: "1.05rem",
                    color: "var(--warning)",
                    fontWeight: 700,
                  }}
                >
                  ฿{porkTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Operating Expenses Section */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              padding: "18px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--danger)", margin: 0 }}>
                รายจ่ายประจำวัน
              </h2>
              <span className="tabular-nums" style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                รวม ฿{expensesTotal.toLocaleString()}
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 14px 0" }}>
              ค่าแรง แก๊ส น้ำแข็ง และวัตถุดิบ ดึงจากวันที่ล่าสุดให้อัตโนมัติ (แก้ไขได้)
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                  วัตถุดิบ (บาท)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  className="touch-target tabular-nums"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--surface-raised)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    boxSizing: "border-box",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                  ค่าแรง (บาท)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={labor}
                  onChange={(e) => setLabor(e.target.value)}
                  className="touch-target tabular-nums"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--surface-raised)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    boxSizing: "border-box",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                  แก๊ส (บาท)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={gas}
                  onChange={(e) => setGas(e.target.value)}
                  className="touch-target tabular-nums"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--surface-raised)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    boxSizing: "border-box",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                  น้ำแข็ง (บาท)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={ice}
                  onChange={(e) => setIce(e.target.value)}
                  className="touch-target tabular-nums"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--surface-raised)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    boxSizing: "border-box",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Extra Expenses Block */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "10px", fontWeight: 700 }}>
                รายจ่ายพิเศษ (เช่น ซื้อของแม็คโคร / ของใช้)
              </label>

              {extraExpenses.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                  {extraExpenses.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: "var(--surface-raised)",
                        padding: "10px 14px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>
                        {item.name}: <span className="tabular-nums" style={{ fontWeight: 700, color: "var(--danger)" }}>฿{item.amount.toLocaleString()}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraExpense(idx)}
                        style={{
                          color: "var(--danger)",
                          backgroundColor: "var(--danger-tint)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          borderRadius: "var(--radius-sm)",
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                        }}
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Extra Expense Form */}
              <div
                style={{
                  backgroundColor: "var(--surface-raised)",
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px dashed var(--border)",
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "10px", fontWeight: 600 }}>
                  เพิ่มรายการรายจ่ายพิเศษ
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <input
                    type="text"
                    placeholder="ชื่อรายการ (เช่น แม็คโคร)"
                    value={newExpenseName}
                    onChange={(e) => setNewExpenseName(e.target.value)}
                    className="touch-target"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      fontSize: "0.9rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <input
                    type="number"
                    placeholder="จำนวนเงิน (฿)"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    className="touch-target tabular-nums"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      fontSize: "0.9rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddExtraExpense}
                  className="touch-target"
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "var(--surface-overlay)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  + เพิ่มรายการรายจ่ายนี้
                </button>
              </div>
            </div>
          </div>

          {/* Primary Action / Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="touch-target"
            style={{
              width: "100%",
              height: "52px",
              borderRadius: "var(--radius-md)",
              backgroundColor: loading ? "var(--surface-raised)" : "var(--primary)",
              color: loading ? "var(--text-secondary)" : "#FFFFFF",
              fontSize: "1.05rem",
              fontWeight: 700,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 16px var(--primary-glow)",
              transition: "all 0.15s ease",
              marginTop: "4px",
            }}
          >
            {loading ? "กำลังบันทึกข้อมูล..." : "บันทึกยอดเข้าสู่ระบบ"}
          </button>
        </form>
      </main>
    </div>
  );
}
