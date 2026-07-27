"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { FinancialRecord } from "@/lib/types/financial.types";
import type {
  DashboardTab,
  ApiConfig,
  FilterState,
  SyncStatus,
} from "./components/types";
import { SyncHeader } from "./components/SyncHeader";
import { Navbar } from "./components/Navbar";
import { FilterBar } from "./components/FilterBar";
import { KpiCards } from "./components/KpiCards";
import { FinancialCharts } from "./components/FinancialCharts";
import { RecordsTable } from "./components/RecordsTable";
import { AnalysisView } from "./components/AnalysisView";
import { PdfReportView } from "./components/PdfReportView";
import { SetupView } from "./components/SetupView";
import { RecordModal } from "./components/RecordModal";

const CFG_KEY = "kruTom_apiConfig";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");
  const [apiConfig, setApiConfig] = useState<ApiConfig>({ url: "", key: "" });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: "offline",
    message: "กำลังตรวจสอบการเชื่อมต่อ...",
    lastUpdated: "",
  });

  const [records, setRecords] = useState<FinancialRecord[]>([]);

  // Filter state
  const [filter, setFilter] = useState<FilterState>({
    month: "all",
    dateFrom: "",
    dateTo: "",
    shop: "all",
    profitLoss: "all",
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load API Credentials from localStorage or defaults
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CFG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url && parsed.key) {
          setApiConfig(parsed);
          return;
        }
      }
    } catch {}

    if (typeof window !== "undefined") {
      setApiConfig((prev) => ({
        ...prev,
        url: prev.url || window.location.origin,
      }));
    }
  }, []);

  // Fetch records function
  const fetchRecords = useCallback(async () => {
    if (!apiConfig.url || !apiConfig.key) {
      setSyncStatus({
        state: "offline",
        message: "ยังไม่ได้ตั้งค่า API Key (โปรดไปที่เมนู 'ตั้งค่า')",
        lastUpdated: "",
      });
      return;
    }

    setSyncStatus((prev) => ({ ...prev, state: "syncing", message: "กำลังดึงข้อมูล..." }));

    try {
      const baseUrl = apiConfig.url.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/records?limit=366&_=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${apiConfig.key}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const json = await res.json();
      const loaded: FinancialRecord[] = json.data?.records || [];
      setRecords(loaded);

      const timeStr = new Date().toLocaleTimeString("th-TH");
      setSyncStatus({
        state: "online",
        message: `เชื่อมต่อเรียบร้อย · ${loaded.length} รายการ`,
        lastUpdated: `อัปเดตล่าสุด ${timeStr}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เชื่อมต่อไม่สำเร็จ";
      setSyncStatus({
        state: "offline",
        message: `ล้มเหลว: ${msg}`,
        lastUpdated: "",
      });
      showToast(`❌ ${msg}`, "error");
    }
  }, [apiConfig]);

  // Initial fetch on config ready
  useEffect(() => {
    if (apiConfig.url && apiConfig.key) {
      fetchRecords();
    }
  }, [apiConfig, fetchRecords]);

  // Handle Save API Config
  const handleSaveApiConfig = (url: string, key: string) => {
    const newCfg = { url, key };
    setApiConfig(newCfg);
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(newCfg));
      showToast("💾 บันทึกการตั้งค่าเรียบร้อย", "success");
    } catch {}
  };

  // Seed data trigger
  const handleSeedData = async () => {
    if (!apiConfig.url || !apiConfig.key) {
      showToast("กรุณาใส่ API URL และ Key ก่อน Seed", "error");
      return;
    }
    const baseUrl = apiConfig.url.replace(/\/$/, "");
    const res = await fetch(`${baseUrl}/api/seed`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiConfig.key}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      showToast("❌ เกิดข้อผิดพลาดในการ Seed ข้อมูล", "error");
      return;
    }

    showToast("✅ Seed ข้อมูล 31 รายการเรียบร้อยแล้ว!", "success");
    fetchRecords();
  };

  // Export CSV
  const handleExportCsv = () => {
    if (records.length === 0) {
      showToast("ไม่มีข้อมูลสำหรับส่งออก CSV", "info");
      return;
    }

    const headers = [
      "ID",
      "Date",
      "ShopID",
      "ShopName",
      "Revenue",
      "Expense",
      "Profit",
      "Transfer",
      "Cash",
      "Delivery",
      "Status",
    ];

    const rows = records.map((r) => [
      r.id,
      r.date,
      r.shopId,
      `"${r.shopName || ""}"`,
      r.revenue || 0,
      r.expense || 0,
      r.profit ?? ((r.revenue || 0) - (r.expense || 0)),
      r.transfer || 0,
      r.cash || 0,
      r.delivery || 0,
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kruTom_financial_records_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("📥 ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว", "success");
  };

  // CRUD Record operations
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEditRecord = (record: FinancialRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?")) return;

    try {
      const baseUrl = apiConfig.url.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/records/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiConfig.key}`,
        },
      });

      if (!res.ok) {
        throw new Error("ไม่สามารถลบรายการได้");
      }

      showToast("🗑️ ลบรายการเรียบร้อย", "success");
      fetchRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "ลบไม่สำเร็จ";
      showToast(`❌ ${msg}`, "error");
    }
  };

  const handleSaveRecord = async (recordPayload: Partial<FinancialRecord>) => {
    const isEdit = Boolean(recordPayload.id);
    const baseUrl = apiConfig.url.replace(/\/$/, "");
    const url = isEdit
      ? `${baseUrl}/api/records/${recordPayload.id}`
      : `${baseUrl}/api/records`;
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiConfig.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(recordPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      showToast(`❌ บันทึกไม่สำเร็จ: ${errText.slice(0, 100)}`, "error");
      return;
    }

    showToast(isEdit ? "✏️ แก้ไขข้อมูลสำเร็จ!" : "💾 เพิ่มข้อมูลสำเร็จ!", "success");
    fetchRecords();
  };

  // Extract available months for filter
  const availableMonths = Array.from(
    new Set(records.map((r) => r.date.slice(0, 7)))
  ).sort().reverse();

  // Filter records for Dashboard / Views
  const filteredRecords = records.filter((r) => {
    if (filter.month !== "all" && !r.date.startsWith(filter.month)) return false;
    if (filter.dateFrom && r.date < filter.dateFrom) return false;
    if (filter.dateTo && r.date > filter.dateTo) return false;
    if (filter.shop !== "all" && r.shopId !== filter.shop) return false;
    const prof = r.profit ?? ((r.revenue || 0) - (r.expense || 0));
    if (filter.profitLoss === "profit" && prof < 0) return false;
    if (filter.profitLoss === "loss" && prof >= 0) return false;
    return true;
  });

  return (
    <div
      style={{
        background: "#0a0d12",
        color: "#e2e8f0",
        fontFamily: "'Sarabun', sans-serif",
        minHeight: "100vh",
      }}
    >
      <SyncHeader
        apiConfig={apiConfig}
        setApiConfig={setApiConfig}
        syncStatus={syncStatus}
        onConnect={() => {
          handleSaveApiConfig(apiConfig.url, apiConfig.key);
          fetchRecords();
        }}
        onRefresh={fetchRecords}
      />

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportCsv={handleExportCsv}
        onOpenAddModal={handleOpenAddModal}
      />

      <main style={{ padding: "20px 24px", maxWidth: 1500, margin: "0 auto" }}>
        {activeTab === "dashboard" && (
          <>
            <FilterBar
              filter={filter}
              setFilter={setFilter}
              availableMonths={availableMonths}
              onReset={() =>
                setFilter({
                  month: "all",
                  dateFrom: "",
                  dateTo: "",
                  shop: "all",
                  profitLoss: "all",
                })
              }
            />
            <KpiCards records={filteredRecords} />
            <FinancialCharts records={filteredRecords} />
          </>
        )}

        {activeTab === "records" && (
          <RecordsTable
            records={records}
            onEditRecord={handleEditRecord}
            onDeleteRecord={handleDeleteRecord}
            onOpenAddModal={handleOpenAddModal}
            onRefresh={fetchRecords}
          />
        )}

        {activeTab === "analysis" && <AnalysisView records={filteredRecords} />}

        {activeTab === "report" && (
          <PdfReportView records={records} availableMonths={availableMonths} />
        )}

        {activeTab === "setup" && (
          <SetupView
            apiConfig={apiConfig}
            onSaveConfig={handleSaveApiConfig}
            onSeedData={handleSeedData}
          />
        )}
      </main>

      <RecordModal
        isOpen={isModalOpen}
        initialRecord={editingRecord}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRecord}
      />

      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 999,
            background: "#161b22",
            border: "1px solid #374151",
            borderLeft:
              toast.type === "success"
                ? "4px solid #22c55e"
                : toast.type === "error"
                ? "4px solid #ef4444"
                : "4px solid #3b82f6",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
