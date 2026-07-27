"use client";

import React, { useState, useEffect } from "react";
import type { FinancialRecord } from "@/lib/types/financial.types";

interface RecordModalProps {
  isOpen: boolean;
  initialRecord: FinancialRecord | null;
  onClose: () => void;
  onSave: (recordData: Partial<FinancialRecord>) => Promise<void>;
}

export function RecordModal({
  isOpen,
  initialRecord,
  onClose,
  onSave,
}: RecordModalProps) {
  const [date, setDate] = useState<string>("");
  const [status, setStatus] = useState<"complete" | "pending" | "draft">("complete");
  const [shopId, setShopId] = useState<string>("shop1");

  // Income
  const [transfer, setTransfer] = useState<number>(0);
  const [cash, setCash] = useState<number>(0);
  const [delivery, setDelivery] = useState<number>(0);

  // Pork
  const [porkRedQty, setPorkRedQty] = useState<number>(0);
  const [porkRedPrice, setPorkRedPrice] = useState<number>(0);
  const [porkMincedQty, setPorkMincedQty] = useState<number>(0);
  const [porkMincedPrice, setPorkMincedPrice] = useState<number>(0);
  const [porkFatQty, setPorkFatQty] = useState<number>(0);
  const [porkFatPrice, setPorkFatPrice] = useState<number>(0);

  // Other Expenses
  const [materials, setMaterials] = useState<number>(0);
  const [supplies, setSupplies] = useState<number>(0);
  const [gas, setGas] = useState<number>(150);
  const [labor, setLabor] = useState<number>(1500);
  const [ice, setIce] = useState<number>(35);
  const [note, setNote] = useState<string>("");

  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (initialRecord) {
      setDate(initialRecord.date || new Date().toISOString().split("T")[0]);
      setStatus(initialRecord.status || "complete");
      setShopId(initialRecord.shopId || "shop1");

      setTransfer(initialRecord.transfer || 0);
      setCash(initialRecord.cash || 0);
      setDelivery(initialRecord.delivery || 0);

      const pb = initialRecord.porkBreakdown;
      setPorkRedQty(pb?.redQty || 0);
      setPorkRedPrice(pb?.redPrice || 0);
      setPorkMincedQty(pb?.mincedQty || 0);
      setPorkMincedPrice(pb?.mincedPrice || 0);
      setPorkFatQty(pb?.fatQty || 0);
      setPorkFatPrice(pb?.fatPrice || 0);

      setMaterials(initialRecord.materials || 0);
      setSupplies(initialRecord.supplies || 0);
      setGas(initialRecord.gas ?? 150);
      setLabor(initialRecord.labor ?? 1500);
      setIce(initialRecord.ice ?? 35);
      setNote(initialRecord.note || "");
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setStatus("complete");
      setShopId("shop1");
      setTransfer(0);
      setCash(0);
      setDelivery(0);
      setPorkRedQty(0);
      setPorkRedPrice(0);
      setPorkMincedQty(0);
      setPorkMincedPrice(0);
      setPorkFatQty(0);
      setPorkFatPrice(0);
      setMaterials(0);
      setSupplies(0);
      setGas(150);
      setLabor(1500);
      setIce(35);
      setNote("");
    }
  }, [initialRecord, isOpen]);

  if (!isOpen) return null;

  const totalRev = transfer + cash + delivery;
  const redTotal = porkRedQty * porkRedPrice;
  const mincedTotal = porkMincedQty * porkMincedPrice;
  const fatTotal = porkFatQty * porkFatPrice;
  const porkTotal = redTotal + mincedTotal + fatTotal;
  const totalExp = porkTotal + materials + supplies + gas + labor + ice;

  const handleFormSubmit = async () => {
    setSaving(true);
    try {
      const payload: Partial<FinancialRecord> = {
        date,
        shopId,
        shopName:
          shopId === "shop1"
            ? "ก๋วยเตี๋ยวไทยครูตอมตลาดญี่ปุ่น"
            : "ก๋วยเตี๋ยวไทยครูตอมสายหนองปิง",
        status,
        revenue: totalRev,
        transfer,
        cash,
        delivery,
        expense: totalExp,
        pork: porkTotal,
        porkBreakdown: {
          redQty: porkRedQty,
          redPrice: porkRedPrice,
          redTotal,
          mincedQty: porkMincedQty,
          mincedPrice: porkMincedPrice,
          mincedTotal,
          fatQty: porkFatQty,
          fatPrice: porkFatPrice,
          fatTotal,
          total: porkTotal,
        },
        materials,
        supplies,
        gas,
        labor,
        ice,
        extraExpenses: initialRecord?.extraExpenses || [],
        extraIncome: initialRecord?.extraIncome || [],
        profit: totalRev - totalExp,
        marginPct: totalRev > 0 ? ((totalRev - totalExp) / totalRev) * 100 : 0,
        note,
      };

      if (initialRecord?.id) {
        payload.id = initialRecord.id;
      }

      await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("th-TH");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 500,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#161b22",
          border: "1px solid #374151",
          borderRadius: 16,
          padding: 24,
          width: 540,
          maxWidth: "95vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontFamily: "Chakra Petch, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#f97316",
            marginBottom: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{initialRecord ? "✏️ แก้ไขข้อมูลรายวัน" : "＋ เพิ่มข้อมูลรายวัน"}</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
              วันที่ *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
              สถานะ
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "complete" | "pending" | "draft")
              }
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            >
              <option value="complete">✅ สมบูรณ์</option>
              <option value="pending">⌛ รอข้อมูล</option>
              <option value="draft">📝 ร่าง</option>
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
              🏪 ร้าน / สาขา
            </label>
            <select
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            >
              <option value="shop1">ก๋วยเตี๋ยวไทยครูตอมตลาดญี่ปุ่น</option>
              <option value="shop2">ก๋วยเตี๋ยวไทยครูตอมสายหนองปิง</option>
            </select>
          </div>

          {/* Income Section */}
          <div
            style={{
              gridColumn: "1 / -1",
              fontSize: 11,
              color: "#fb923c",
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginTop: 6,
            }}
          >
            💰 รายรับ
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8" }}>โอนเงิน (฿)</label>
            <input
              type="number"
              value={transfer || ""}
              onChange={(e) => setTransfer(Number(e.target.value) || 0)}
              placeholder="0"
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8" }}>เงินสด (฿)</label>
            <input
              type="number"
              value={cash || ""}
              onChange={(e) => setCash(Number(e.target.value) || 0)}
              placeholder="0"
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8" }}>Delivery (฿)</label>
            <input
              type="number"
              value={delivery || ""}
              onChange={(e) => setDelivery(Number(e.target.value) || 0)}
              placeholder="0"
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11, color: "#94a3b8" }}>รายรับรวม (คำนวณอัตโนมัติ)</label>
            <input
              type="text"
              readOnly
              value={`฿${fmt(totalRev)}`}
              style={{
                background: "rgba(59, 130, 246, 0.07)",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 15,
                fontWeight: 700,
                color: "#60a5fa",
                fontFamily: "Chakra Petch",
                width: "100%",
              }}
            />
          </div>

          {/* Pork Section */}
          <div
            style={{
              gridColumn: "1 / -1",
              fontSize: 11,
              color: "#fb923c",
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginTop: 6,
            }}
          >
            🥩 ค่าหมู (แยกชนิด)
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8" }}>🔴 หมูแดง จำนวน (กก.)</label>
            <input
              type="number"
              step="0.1"
              value={porkRedQty || ""}
              onChange={(e) => setPorkRedQty(Number(e.target.value) || 0)}
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8" }}>ราคา/กก. (฿)</label>
            <input
              type="number"
              value={porkRedPrice || ""}
              onChange={(e) => setPorkRedPrice(Number(e.target.value) || 0)}
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8" }}>🟠 หมูสับ จำนวน (กก.)</label>
            <input
              type="number"
              step="0.1"
              value={porkMincedQty || ""}
              onChange={(e) => setPorkMincedQty(Number(e.target.value) || 0)}
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8" }}>ราคา/กก. (฿)</label>
            <input
              type="number"
              value={porkMincedPrice || ""}
              onChange={(e) => setPorkMincedPrice(Number(e.target.value) || 0)}
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
          </div>

          {/* Expenses */}
          <div
            style={{
              gridColumn: "1 / -1",
              fontSize: 11,
              color: "#fb923c",
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginTop: 6,
            }}
          >
            🧾 ค่าใช้จ่ายอื่น
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8" }}>วัตถุดิบ (฿)</label>
            <input
              type="number"
              value={materials || ""}
              onChange={(e) => setMaterials(Number(e.target.value) || 0)}
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8" }}>ค่าแรง (฿)</label>
            <input
              type="number"
              value={labor || ""}
              onChange={(e) => setLabor(Number(e.target.value) || 0)}
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11, color: "#94a3b8" }}>หมายเหตุ</label>
            <input
              type="text"
              placeholder="บันทึกเพิ่มเติม..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
                width: "100%",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid #2a3140",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid #374151",
              background: "#1c2128",
              color: "#94a3b8",
            }}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleFormSubmit}
            disabled={saving}
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              border: "none",
              background: "#f97316",
              color: "#fff",
            }}
          >
            {saving ? "⌛ กำลังบันทึก..." : "💾 บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
