"use client";

import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Plus,
  Download,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  computeModes,
  computeCosting,
  getDefaultPackagingCostingInput,
  type CostingMode,
  type CartonDimensionInput,
  type CostingParametersInput,
  type PackagingCostingInput,
  type ModeDetails,
  type CostingResult,
} from "@/modules/factory/utils/packagingCostingCalculator";

function csvEscape(val: any): string {
  const s = val === undefined || val === null ? "" : String(val);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function buildEntryLines(item: any): string[] {
  const lines: string[] = [];
  lines.push(["তারিখ", item.date].map(csvEscape).join(","));
  lines.push(["কাস্টমার", item.customer].map(csvEscape).join(","));
  lines.push(["আইটেম", item.itemName].map(csvEscape).join(","));
  lines.push(["ডিসক্রিপশন", item.description].map(csvEscape).join(","));
  lines.push(["মোড", item.mode].map(csvEscape).join(","));
  lines.push(["রিল সাইজ", item.reel].map(csvEscape).join(","));
  lines.push(["কাটিং সাইজ", item.cutsize].map(csvEscape).join(","));
  lines.push("");
  lines.push([`Liner Cost (GSM ${item.linerGsm || "—"}, ${item.linerKg || "—"} kg)`, item.liner].map(csvEscape).join(","));
  lines.push([`Media Cost (GSM ${item.mediaGsm || "—"}, ${item.mediaKg || "—"} kg)`, item.media].map(csvEscape).join(","));
  lines.push([`Glue Cost (Rate ৳${item.glueRate || "—"}/kg, ${item.glueKg || "—"} kg)`, item.glue].map(csvEscape).join(","));
  lines.push(["One Color Print", item.print].map(csvEscape).join(","));
  lines.push(["Stitching Wire", item.stitch].map(csvEscape).join(","));
  lines.push(["Unload Labour", item.unload].map(csvEscape).join(","));
  lines.push(["Transport Rent", item.transport].map(csvEscape).join(","));
  lines.push(["Corrugation Starch", item.starch].map(csvEscape).join(","));
  lines.push(["Electricity Cost", item.electricity].map(csvEscape).join(","));
  lines.push(["Hanicom Cost", item.hanicom].map(csvEscape).join(","));
  lines.push(["Top & Bottom Cost", item.topBottom].map(csvEscape).join(","));
  lines.push(["AIT Cost", item.ait].map(csvEscape).join(","));
  lines.push(["Other Cost", item.other].map(csvEscape).join(","));
  lines.push(["Sub Total", item.subtotal].map(csvEscape).join(","));
  lines.push(["Profit (%)", item.profitPct].map(csvEscape).join(","));
  lines.push(["Profit (৳)", item.profitTaka].map(csvEscape).join(","));
  lines.push(["Final Cost (প্রতি পিস)", item.finalCost].map(csvEscape).join(","));
  return lines;
}

function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function PackagingCostingPage() {
  // Job / Customer state
  const [customerName, setCustomerName] = useState("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [jobReel, setJobReel] = useState("");
  const [jobCutsize, setJobCutsize] = useState("");

  // Carton dimensions state
  const [L, setL] = useState(34.5);
  const [W, setW] = useState(26.5);
  const [H, setH] = useState(21.5);
  const [Fo, setFo] = useState(4.0);
  const [T, setT] = useState(1.0);

  // Selected layout mode
  const [mode, setMode] = useState<CostingMode>("1b2c");

  // Costing inputs state
  const [linerGsm, setLinerGsm] = useState(300);
  const [mediaGsm, setMediaGsm] = useState(175);
  const [linerRate, setLinerRate] = useState(48);
  const [mediaRate, setMediaRate] = useState(44);
  const [glueRate, setGlueRate] = useState(24);
  const [ply, setPly] = useState("3");

  // Other itemized costs
  const [printCost, setPrintCost] = useState(1.00);
  const [stitchCost, setStitchCost] = useState(0.15);
  const [unloadCost, setUnloadCost] = useState(0.20);
  const [transportCost, setTransportCost] = useState(0.30);
  const [starchCost, setStarchCost] = useState(0.35);
  const [electricityCost, setElectricityCost] = useState(0.05);
  const [hanicomCost, setHanicomCost] = useState(0.05);
  const [topBottomCost, setTopBottomCost] = useState(0.05);
  const [aitCost, setAitCost] = useState(0.05);
  const [otherCost, setOtherCost] = useState(0.05);
  const [profitPct, setProfitPct] = useState(30);

  // UI state
  const [showCompare, setShowCompare] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("corrugated_costing_history_v1");
      if (raw) {
        setHistory(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  // Recalculate modes and costing details dynamically
  const modes = useMemo(() => computeModes({ L, W, H, Fo, T }), [L, W, H, Fo, T]);
  const selectedModeDetails = modes[mode];

  const costing = useMemo(() => {
    return computeCosting(
      selectedModeDetails.reel,
      selectedModeDetails.cl,
      {
        linerGsm,
        mediaGsm,
        linerRate,
        mediaRate,
        glueRate,
        ply,
        boardQty: selectedModeDetails.cpb,
        printCost,
        stitchCost,
        unloadCost,
        transportCost,
        starchCost,
        electricityCost,
        hanicomCost,
        topBottomCost,
        aitCost,
        otherCost,
        profitPct,
      }
    );
  }, [
    selectedModeDetails,
    linerGsm,
    mediaGsm,
    linerRate,
    mediaRate,
    glueRate,
    ply,
    printCost,
    stitchCost,
    unloadCost,
    transportCost,
    starchCost,
    electricityCost,
    hanicomCost,
    topBottomCost,
    aitCost,
    otherCost,
    profitPct,
  ]);

  // Sync board quantity to the selected mode's cpb internally
  const boardQty = selectedModeDetails.cpb;

  // History action handlers
  const saveHistory = (newItem: any) => {
    const updated = [...history, newItem];
    setHistory(updated);
    try {
      localStorage.setItem("corrugated_costing_history_v1", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  const deleteHistoryItem = (id: number) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    try {
      localStorage.setItem("corrugated_costing_history_v1", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to delete history item", e);
    }
  };

  const clearHistory = () => {
    if (confirm("সব হিস্টোরি মুছে ফেলতে চান? এটা আর ফিরিয়ে আনা যাবে না।")) {
      setHistory([]);
      try {
        localStorage.removeItem("corrugated_costing_history_v1");
      } catch (e) {
        console.error("Failed to clear history", e);
      }
    }
  };

  const handleSaveHistory = () => {
    const modeLabel = selectedModeDetails.label;
    const finalReel = jobReel.trim() || `${selectedModeDetails.reel.toFixed(0)} inch`;
    const finalCutsize = jobCutsize.trim() || `${selectedModeDetails.cl.toFixed(1)} mm`;

    const newItem = {
      id: Date.now(),
      date: new Date().toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" }),
      customer: customerName.trim(),
      itemName: itemName.trim(),
      description: description.trim(),
      mode: modeLabel,
      reel: finalReel,
      cutsize: finalCutsize,
      liner: `৳ ${costing.valLiner.toFixed(2)}`,
      linerKg: costing.kgLiner.toFixed(4),
      linerGsm,
      media: `৳ ${costing.valMedia.toFixed(2)}`,
      mediaKg: costing.kgMedia.toFixed(4),
      mediaGsm,
      glue: `৳ ${costing.valGlue.toFixed(2)}`,
      glueKg: costing.kgGlue.toFixed(4),
      glueRate,
      print: printCost,
      stitch: stitchCost,
      unload: unloadCost,
      transport: transportCost,
      starch: starchCost,
      electricity: electricityCost,
      hanicom: hanicomCost,
      topBottom: topBottomCost,
      ait: aitCost,
      other: otherCost,
      subtotal: `৳ ${costing.subtotal.toFixed(2)}`,
      profitPct,
      profitTaka: `৳ ${costing.profit.toFixed(2)}`,
      finalCost: `৳ ${costing.finalCost.toFixed(2)}`,
    };

    saveHistory(newItem);
  };

  const downloadSingleHistory = (item: any) => {
    const lines = buildEntryLines(item);
    const safeName = (item.customer || "Costing").replace(/[^a-zA-Z0-9\u0980-\u09FF]+/g, "_");
    downloadCsv("\uFEFF" + lines.join("\n"), `Costing_${safeName}_${item.id}.csv`);
  };

  const downloadAllHistory = () => {
    if (!history.length) {
      alert("ডাউনলোড করার মতো কোনো হিস্টোরি নেই।");
      return;
    }
    let lines: string[] = [];
    history.forEach((item, idx) => {
      lines = lines.concat(buildEntryLines(item));
      if (idx !== history.length - 1) {
        lines.push("");
        lines.push("========================================");
        lines.push("");
      }
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv("\uFEFF" + lines.join("\n"), `Costing_History_${stamp}.csv`);
  };

  const autoFillReel = () => {
    if (Number.isFinite(selectedModeDetails.reel)) {
      setJobReel(`${selectedModeDetails.reel.toFixed(0)} inch`);
    }
  };

  const autoFillCutsize = () => {
    if (Number.isFinite(selectedModeDetails.cl)) {
      setJobCutsize(`${selectedModeDetails.cl.toFixed(1)} mm`);
    }
  };

  const modeNames: Record<CostingMode, string> = {
    "1b1c": "1 Broad 1 Carton",
    "1b2c": "1 Broad 2 Carton",
    "1b3c": "1 Broad 3 Carton",
    "1b4c": "1 Broad 4 Carton",
    "2b1c": "2 Broad 1 Carton",
  };

  const modeBengaliNames: Record<CostingMode, string> = {
    "1b1c": "এক বোর্ডে এক কার্টন",
    "1b2c": "এক বোর্ডে দুই কার্টন",
    "1b3c": "এক বোর্ডে তিন কার্টন",
    "1b4c": "এক বোর্ডে চার কার্টন",
    "2b1c": "দুই বোর্ড মিলে এক কার্টন",
  };

  return (
    <div
      className="min-h-screen pb-16 px-4"
      style={{
        background: `repeating-linear-gradient(0deg, rgba(122,82,48,0.03) 0px, rgba(122,82,48,0.03) 1px, transparent 1px, transparent 48px), #FAF6EE`,
        color: "#2A2018",
        fontFamily: "'Hind Siliguri', 'Segoe UI', sans-serif",
      }}
    >
      {/* Masthead Header */}
      <div className="bg-gradient-to-b from-[#3C2817] to-[#5C3D24] text-[#FAF6EE] p-5 border-b-[4px] border-[#7A5230] relative overflow-hidden shadow-md -mx-4 mb-4">
        <div className="max-w-[920px] mx-auto flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-[38px] h-[38px] border-2 border-[#F2E9D8] rounded-[2px] relative flex-none">
              <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-[#F2E9D8] -translate-x-1/2" />
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[#F2E9D8] -translate-y-1/2" />
            </div>
            <div>
              <div className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-[#E4D3B0] opacity-80">
                Forkan Corrugated
              </div>
              <h1 className="text-[19px] font-bold tracking-[0.01em] mt-[2px]">
                Carton Costing Sheet
              </h1>
            </div>
          </div>
          <div className="text-right font-mono text-[10.5px] text-[#E4D3B0] leading-normal opacity-85 hidden sm:block">
            REEL → CUTTING → COST
            <br />
            AUTO-CALCULATED
          </div>
        </div>
        <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.025)_0_2px,transparent_2px_14px)] pointer-events-none" />
      </div>

      <div className="max-w-[920px] mx-auto space-y-4">
        {/* ============ SECTION 0 : JOB / CUSTOMER INFO ============ */}
        <div className="bg-[#FFFDF8] border border-[#D8C7A8] rounded-[3px] shadow-[0_1px_0_rgba(60,40,23,0.08)] overflow-hidden">
          <div className="p-4 border-b border-[#D8C7A8] bg-gradient-to-r from-[#F2E9D8] to-transparent">
            <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#7A5230] font-bold">
              00 / Job Info
            </div>
            <h2 className="text-base font-bold text-[#2A2018] mt-1">
              কাস্টমার ও আইটেম তথ্য
            </h2>
            <div className="text-[11.5px] text-[#6B5C4C] mt-0.5">
              কাস্টমারের নাম, আইটেম নেইম, ডিসক্রিপশন লিখুন — প্রয়োজনে রিল ও কাটিং সাইজ ম্যানুয়ালিও লিখতে পারবেন এবং Cost Calculation এর একটি হিস্টোরি নিচে জমা হবে।
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#6B5C4C]">
                  Customer Name
                </label>
                <Input
                  type="text"
                  id="job_customer"
                  placeholder="কাস্টমারের নাম"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="font-mono text-sm border-[#D8C7A8] rounded-[2px] bg-white text-[#2A2018] focus-visible:ring-[#1F5C6B]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#6B5C4C]">
                  Item Name
                </label>
                <Input
                  type="text"
                  id="job_item"
                  placeholder="আইটেমের নাম"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="font-mono text-sm border-[#D8C7A8] rounded-[2px] bg-white text-[#2A2018] focus-visible:ring-[#1F5C6B]"
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-semibold text-[#6B5C4C]">
                  Description
                </label>
                <Textarea
                  id="job_desc"
                  rows={2}
                  placeholder="বিবরণ লিখুন"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="font-mono text-sm border-[#D8C7A8] rounded-[2px] bg-white text-[#2A2018] focus-visible:ring-[#1F5C6B]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#6B5C4C]">
                  Reel Size
                </label>
                <Input
                  type="text"
                  id="job_reel"
                  placeholder="যেমনঃ 34 inch"
                  value={jobReel}
                  onChange={(e) => setJobReel(e.target.value)}
                  className="font-mono text-sm border-[#D8C7A8] rounded-[2px] bg-white text-[#2A2018] focus-visible:ring-[#1F5C6B]"
                />
                <span className="text-[10.5px] text-[#6B5C4C] opacity-80 mt-0.5">
                  অটো ক্যালকুলেটেড মান বসাতে বাটনে চাপুন, অথবা নিজে লিখুন
                </span>
                <button
                  type="button"
                  id="fillReelBtn"
                  onClick={autoFillReel}
                  className="font-mono text-[11px] tracking-wide text-[#6B5C4C] bg-none border border-dashed border-[#D8C7A8] rounded-[20px] px-4 py-1.5 hover:border-[#1F5C6B] hover:text-[#163F49] transition-all w-fit mt-1"
                >
                  অটো মান বসান
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#6B5C4C]">
                  Cutting Size
                </label>
                <Input
                  type="text"
                  id="job_cutsize"
                  placeholder="যেমনঃ 650 mm"
                  value={jobCutsize}
                  onChange={(e) => setJobCutsize(e.target.value)}
                  className="font-mono text-sm border-[#D8C7A8] rounded-[2px] bg-white text-[#2A2018] focus-visible:ring-[#1F5C6B]"
                />
                <span className="text-[10.5px] text-[#6B5C4C] opacity-80 mt-0.5">
                  অটো ক্যালকুলেটেড মান বসাতে বাটনে চাপুন, অথবা নিজে লিখুন
                </span>
                <button
                  type="button"
                  id="fillCutsizeBtn"
                  onClick={autoFillCutsize}
                  className="font-mono text-[11px] tracking-wide text-[#6B5C4C] bg-none border border-dashed border-[#D8C7A8] rounded-[20px] px-4 py-1.5 hover:border-[#1F5C6B] hover:text-[#163F49] transition-all w-fit mt-1"
                >
                  অটো মান বসান
                </button>
              </div>
            </div>

            {/* History Management Controls */}
            <div className="mt-5 pt-4 border-t border-dashed border-[#D8C7A8] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                id="saveHistoryBtn"
                onClick={handleSaveHistory}
                className="font-mono text-xs border border-solid border-[#1F5C6B] bg-[#1F5C6B] text-white rounded-[20px] px-4 py-1.5 hover:bg-[#163F49] transition-all"
              >
                ＋ হিস্টোরিতে সেভ করুন
              </button>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  id="downloadHistoryBtn"
                  onClick={downloadAllHistory}
                  className="font-mono text-xs border border-dashed border-[#D8C7A8] rounded-[20px] px-4 py-1.5 text-[#6B5C4C] hover:border-[#1F5C6B] hover:text-[#163F49] transition-all bg-white"
                >
                  ⬇ হিস্টোরি ডাউনলোড (CSV)
                </button>
                <button
                  type="button"
                  id="clearHistoryBtn"
                  onClick={clearHistory}
                  className="font-mono text-xs border border-dashed border-[#D8C7A8] rounded-[20px] px-4 py-1.5 text-[#6B5C4C] hover:border-[#1F5C6B] hover:text-[#163F49] transition-all bg-white"
                >
                  হিস্টোরি মুছে ফেলুন
                </button>
              </div>
            </div>

            {/* History Table */}
            <div className="mt-4 overflow-x-auto border border-[#D8C7A8] rounded-[3px] bg-white">
              <table className="w-full text-left text-xs border-collapse min-w-[1200px]" id="historyTable">
                <thead>
                  <tr className="bg-[#FAF6EE] border-b border-[#D8C7A8]">
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">তারিখ</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">কাস্টমার</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">আইটেম</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">মোড</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">রিল</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">কাটিং</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Liner</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Media</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Glue</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Print</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Stitch</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Unload</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Trans.</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Starch</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Elect.</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Hani.</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">T&B</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">AIT</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Other</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Subtotal</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Profit%</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Profit৳</th>
                    <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Final</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody id="historyTableBody">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={24} className="text-center text-[#6B5C4C] py-5">
                        এখনো কোনো হিস্টোরি সেভ করা হয়নি
                      </td>
                    </tr>
                  ) : (
                    history.map((item) => (
                      <tr key={item.id} className="border-b border-[#D8C7A8] last:border-0 hover:bg-[#FAF6EE] transition-colors">
                        <td className="p-2 font-mono text-[#6B5C4C]">{item.date}</td>
                        <td className="p-2">{item.customer || "—"}</td>
                        <td className="p-2">{item.itemName || "—"}</td>
                        <td className="p-2">{item.mode || "—"}</td>
                        <td className="p-2 font-mono">{item.reel || "—"}</td>
                        <td className="p-2 font-mono">{item.cutsize || "—"}</td>
                        <td className="p-2 font-mono">{item.liner || "—"}</td>
                        <td className="p-2 font-mono">{item.media || "—"}</td>
                        <td className="p-2 font-mono">{item.glue || "—"}</td>
                        <td className="p-2 font-mono">{item.print || "—"}</td>
                        <td className="p-2 font-mono">{item.stitch || "—"}</td>
                        <td className="p-2 font-mono">{item.unload || "—"}</td>
                        <td className="p-2 font-mono">{item.transport || "—"}</td>
                        <td className="p-2 font-mono">{item.starch || "—"}</td>
                        <td className="p-2 font-mono">{item.electricity || "—"}</td>
                        <td className="p-2 font-mono">{item.hanicom || "—"}</td>
                        <td className="p-2 font-mono">{item.topBottom || "—"}</td>
                        <td className="p-2 font-mono">{item.ait || "—"}</td>
                        <td className="p-2 font-mono">{item.other || "—"}</td>
                        <td className="p-2 font-mono">{item.subtotal || "—"}</td>
                        <td className="p-2 font-mono">{item.profitPct || "—"}%</td>
                        <td className="p-2 font-mono">{item.profitTaka || "—"}</td>
                        <td className="p-2 font-mono font-semibold text-[#1F5C6B]">{item.finalCost || "—"}</td>
                        <td className="p-2 flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => downloadSingleHistory(item)}
                            className="font-mono text-[10px] border border-dashed border-[#D8C7A8] rounded-[20px] px-2.5 py-0.5 text-[#6B5C4C] hover:border-[#1F5C6B] hover:text-[#163F49] transition-all bg-white"
                          >
                            ডাউনলোড
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteHistoryItem(item.id)}
                            className="font-mono text-[10px] border border-dashed border-red-200 rounded-[20px] px-2.5 py-0.5 text-red-500 hover:border-red-500 hover:text-red-700 transition-all bg-white"
                          >
                            মুছুন
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ============ SECTION 1 : CARTON INPUT SIZE ============ */}
        <div className="bg-[#FFFDF8] border border-[#D8C7A8] rounded-[3px] shadow-[0_1px_0_rgba(60,40,23,0.08)] overflow-hidden">
          <div className="p-4 border-b border-[#D8C7A8] bg-gradient-to-r from-[#F2E9D8] to-transparent">
            <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#7A5230] font-bold">
              01 / Input
            </div>
            <h2 className="text-base font-bold text-[#2A2018] mt-1">
              কার্টন সাইজ ও মোড
            </h2>
            <div className="text-[11.5px] text-[#6B5C4C] mt-0.5">
              মাপ দিন (cm), মোড বাছাই করুন — রিল ও কাটিং সাইজ অটো ক্যালকুলেট হবে
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#6B5C4C] flex items-center gap-1">
                  Carton Length <span className="font-mono text-[10.5px] text-[#7A5230] bg-[#F2E9D8] px-1.5 py-0.5 rounded-[2px] font-bold">L</span>
                </label>
                <Input
                  type="number"
                  id="in_L"
                  step="0.1"
                  value={L}
                  onChange={(e) => setL(parseFloat(e.target.value) || 0)}
                  className="font-mono text-sm border-[#D8C7A8] rounded-[2px] bg-white text-[#2A2018] focus-visible:ring-[#1F5C6B]"
                />
                <span className="text-[10.5px] text-[#6B5C4C] opacity-80 mt-0.5">সেন্টিমিটার (cm)</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#6B5C4C] flex items-center gap-1">
                  Carton Width <span className="font-mono text-[10.5px] text-[#7A5230] bg-[#F2E9D8] px-1.5 py-0.5 rounded-[2px] font-bold">W</span>
                </label>
                <Input
                  type="number"
                  id="in_W"
                  step="0.1"
                  value={W}
                  onChange={(e) => setW(parseFloat(e.target.value) || 0)}
                  className="font-mono text-sm border-[#D8C7A8] rounded-[2px] bg-white text-[#2A2018] focus-visible:ring-[#1F5C6B]"
                />
                <span className="text-[10.5px] text-[#6B5C4C] opacity-80 mt-0.5">সেন্টিমিটার (cm)</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#6B5C4C] flex items-center gap-1">
                  Carton Height <span className="font-mono text-[10.5px] text-[#7A5230] bg-[#F2E9D8] px-1.5 py-0.5 rounded-[2px] font-bold">H</span>
                </label>
                <Input
                  type="number"
                  id="in_H"
                  step="0.1"
                  value={H}
                  onChange={(e) => setH(parseFloat(e.target.value) || 0)}
                  className="font-mono text-sm border-[#D8C7A8] rounded-[2px] bg-white text-[#2A2018] focus-visible:ring-[#1F5C6B]"
                />
                <span className="text-[10.5px] text-[#6B5C4C] opacity-80 mt-0.5">সেন্টিমিটার (cm)</span>
              </div>

              {/* Hidden allowance inputs matching HTML IDs and values */}
              <input type="hidden" id="in_Fo" value={Fo} />
              <input type="hidden" id="in_T" value={T} />
            </div>

            <div className="flex flex-col gap-1 pt-2">
              <label className="text-xs font-semibold text-[#6B5C4C]">Select Mode</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5" id="modePills">
                {(Object.keys(modeNames) as CostingMode[]).map((k) => (
                  <div
                    key={k}
                    id={`mode-pill-${k}`}
                    onClick={() => setMode(k)}
                    className={`border rounded-[3px] p-2.5 cursor-pointer text-[12px] font-bold text-left transition-all leading-snug flex flex-col justify-between ${
                      mode === k
                        ? "border-[#1F5C6B] bg-gradient-to-b from-[#EAF3F4] to-white text-[#163F49] shadow-[inset_0_0_0_1px_#1F5C6B]"
                        : "border-[#D8C7A8] bg-white text-[#6B5C4C] hover:border-[#1F5C6B]"
                    }`}
                  >
                    <span>{modeNames[k]}</span>
                    <span className="block text-[10.5px] font-medium mt-1.5 opacity-80">
                      {modeBengaliNames[k]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Result Strip */}
            <div className="grid grid-cols-3 border border-[#D8C7A8] rounded-[3px] overflow-hidden bg-[#FAF6EE] mt-4 shadow-sm">
              <div className="p-3 border-r border-[#D8C7A8] text-center">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[#6B5C4C] font-semibold">
                  Cutting Size
                </div>
                <div className="font-mono text-lg font-bold text-[#5C3D24] mt-1" id="out_cl">
                  {Number.isFinite(selectedModeDetails.cl) ? selectedModeDetails.cl.toFixed(1) : "—"}
                </div>
                <div className="text-[10.5px] text-[#6B5C4C]">mm</div>
              </div>
              <div className="p-3 border-r border-[#D8C7A8] text-center">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[#6B5C4C] font-semibold">
                  Reel Size
                </div>
                <div className="font-mono text-lg font-bold text-[#5C3D24] mt-1" id="out_reel">
                  {Number.isFinite(selectedModeDetails.reel) ? selectedModeDetails.reel.toFixed(0) : "—"}
                </div>
                <div className="text-[10.5px] text-[#6B5C4C]">inch</div>
              </div>
              <div className="p-3 text-center">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[#6B5C4C] font-semibold">
                  Carton/Board
                </div>
                <div className="font-mono text-lg font-bold text-[#5C3D24] mt-1" id="out_cpb">
                  {selectedModeDetails.cpb}
                </div>
                <div className="text-[10.5px] text-[#6B5C4C]">pcs</div>
              </div>
            </div>

            {/* Mode Compare Toggle */}
            <div className="flex justify-center mt-4 pt-1">
              <button
                type="button"
                id="detailToggle"
                onClick={() => setShowCompare(!showCompare)}
                className="font-mono text-[11px] tracking-wide text-[#6B5C4C] bg-none border border-dashed border-[#D8C7A8] rounded-[20px] px-4 py-1.5 hover:border-[#1F5C6B] hover:text-[#163F49] transition-all flex items-center gap-1.5 bg-white"
              >
                {showCompare ? "কম্পেয়ার লুকান" : "সব মোড কম্পেয়ার দেখুন"}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCompare ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Collapsible Mode Compare Table */}
            {showCompare && (
              <div className="mt-4 border border-[#D8C7A8] rounded-[3px] overflow-hidden bg-white shadow-sm" id="detailPanel">
                <div className="p-4">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]" id="modeCompareTable">
                    <thead>
                      <tr className="bg-[#FAF6EE] border-b border-[#D8C7A8]">
                        <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Mode</th>
                        <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Cutting Size (mm)</th>
                        <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Reel (in)</th>
                        <th className="p-2 font-mono font-bold text-[#6B5C4C] uppercase tracking-wider">Cart/Board</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Object.keys(modes) as CostingMode[]).map((k) => {
                        const m = modes[k];
                        const isSel = k === mode;
                        return (
                          <tr
                            key={k}
                            className={`border-b border-[#D8C7A8] last:border-b-0 hover:bg-[#FAF6EE] transition-colors ${
                              isSel ? "bg-[#EAF3F4] font-bold text-[#163F49]" : ""
                            }`}
                          >
                            <td className="p-2 font-medium">{m.label}</td>
                            <td className="p-2 font-mono">{m.cl.toFixed(1)}</td>
                            <td className="p-2 font-mono">{m.reel.toFixed(0)}</td>
                            <td className="p-2 font-mono">{m.cpb}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============ SECTION 2 : COSTING ============ */}
        <div className="bg-[#FFFDF8] border border-[#D8C7A8] rounded-[3px] shadow-[0_1px_0_rgba(60,40,23,0.08)] overflow-hidden">
          <div className="p-4 border-b border-[#D8C7A8] bg-gradient-to-r from-[#F2E9D8] to-transparent">
            <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#7A5230] font-bold">
              02 / Costing
            </div>
            <h2 className="text-base font-bold text-[#2A2018] mt-1">
              💰 কস্টিং ক্যালকুলেশন
            </h2>
            <div className="text-[11.5px] text-[#6B5C4C] mt-0.5">
              উপরের রেজাল্ট থেকে রিল সাইজ ও কাটিং সাইজ অটো বসে গেছে
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-[#D8C7A8]">
            {/* LEFT: Input Parameters */}
            <div className="p-4 border-b md:border-b-0 md:border-r border-[#D8C7A8] bg-white">
              <div className="font-mono text-[10.5px] tracking-wider uppercase text-[#7A5230] font-bold mb-3.5 flex items-center gap-2">
                Input Parameters
                <div className="flex-1 h-[1px] bg-[#D8C7A8]" />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-[#D8C7A8]">
                  <label className="text-xs text-[#2A2018] font-medium">Reel Size (Inch)</label>
                  <input
                    type="text"
                    id="c_reel"
                    readOnly
                    value={Number.isFinite(selectedModeDetails.reel) ? `${selectedModeDetails.reel.toFixed(0)}"` : "—"}
                    className="font-mono text-xs p-1.5 border border-[#D8C7A8] rounded-[2px] text-right bg-[#FAF6EE] text-[#6B5C4C] w-[90px] focus:outline-none"
                  />
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-[#D8C7A8]">
                  <label className="text-xs text-[#2A2018] font-medium">Cutting Size (mm)</label>
                  <input
                    type="text"
                    id="c_cutsize"
                    readOnly
                    value={Number.isFinite(selectedModeDetails.cl) ? `${selectedModeDetails.cl.toFixed(1)} mm` : "—"}
                    className="font-mono text-xs p-1.5 border border-[#D8C7A8] rounded-[2px] text-right bg-[#FAF6EE] text-[#6B5C4C] w-[90px] focus:outline-none"
                  />
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-[#D8C7A8]">
                  <label className="text-xs text-[#2A2018] font-semibold">Liner GSM</label>
                  <Input
                    type="number"
                    id="c_linerGsm"
                    value={linerGsm}
                    onChange={(e) => setLinerGsm(parseFloat(e.target.value) || 0)}
                    className="font-mono text-xs p-1.5 border border-[#D8C7A8] rounded-[2px] text-right bg-white text-[#2A2018] w-[90px] h-8 focus-visible:ring-[#1F5C6B]"
                  />
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-[#D8C7A8]">
                  <label className="text-xs text-[#2A2018] font-semibold">Media GSM</label>
                  <Input
                    type="number"
                    id="c_mediaGsm"
                    value={mediaGsm}
                    onChange={(e) => setMediaGsm(parseFloat(e.target.value) || 0)}
                    className="font-mono text-xs p-1.5 border border-[#D8C7A8] rounded-[2px] text-right bg-white text-[#2A2018] w-[90px] h-8 focus-visible:ring-[#1F5C6B]"
                  />
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-[#D8C7A8]">
                  <label className="text-xs text-[#2A2018] font-semibold">Liner Rate (৳/kg)</label>
                  <Input
                    type="number"
                    id="c_linerRate"
                    value={linerRate}
                    onChange={(e) => setLinerRate(parseFloat(e.target.value) || 0)}
                    className="font-mono text-xs p-1.5 border border-[#D8C7A8] rounded-[2px] text-right bg-white text-[#2A2018] w-[90px] h-8 focus-visible:ring-[#1F5C6B]"
                  />
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-[#D8C7A8]">
                  <label className="text-xs text-[#2A2018] font-semibold">Media Rate (৳/kg)</label>
                  <Input
                    type="number"
                    id="c_mediaRate"
                    value={mediaRate}
                    onChange={(e) => setMediaRate(parseFloat(e.target.value) || 0)}
                    className="font-mono text-xs p-1.5 border border-[#D8C7A8] rounded-[2px] text-right bg-white text-[#2A2018] w-[90px] h-8 focus-visible:ring-[#1F5C6B]"
                  />
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-[#D8C7A8]">
                  <label className="text-xs text-[#2A2018] font-semibold">Glue Rate (৳/kg)</label>
                  <Input
                    type="number"
                    id="c_glueRate"
                    value={glueRate}
                    onChange={(e) => setGlueRate(parseFloat(e.target.value) || 0)}
                    className="font-mono text-xs p-1.5 border border-[#D8C7A8] rounded-[2px] text-right bg-white text-[#2A2018] w-[90px] h-8 focus-visible:ring-[#1F5C6B]"
                  />
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-[#D8C7A8]">
                  <label className="text-xs text-[#2A2018] font-semibold">Ply</label>
                  <select
                    id="c_ply"
                    value={ply}
                    onChange={(e) => setPly(e.target.value)}
                    className="font-mono text-xs p-1 border border-[#D8C7A8] rounded-[2px] text-right bg-white text-[#2A2018] w-[90px] h-8 focus:outline-none focus:border-[#1F5C6B]"
                  >
                    <option value="3">3 Ply</option>
                    <option value="5">5 Ply</option>
                    <option value="7">7 Ply</option>
                  </select>
                </div>

                {/* Hidden Board Qty element to match HTML exactly */}
                <input type="hidden" id="c_boardQty" value={boardQty} />
              </div>
            </div>

            {/* RIGHT: Cost Calculation Details */}
            <div className="p-4 bg-[#FAF6EE]">
              <div className="font-mono text-[10.5px] tracking-wider uppercase text-[#7A5230] font-bold mb-3.5 flex items-center gap-2">
                Cost Calculation
                <div className="flex-1 h-[1px] bg-[#D8C7A8]" />
              </div>

              <table className="w-full text-xs text-[#2A2018] border-collapse">
                <tbody>
                  <tr className="border-b border-dashed border-[#D8C7A8]">
                    <td className="py-2 text-left font-medium">Liner Cost</td>
                    <td className="py-2 text-right font-mono text-[10.5px] text-[#6B5C4C]" id="kg_liner">
                      {costing.kgLiner.toFixed(4)}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-[#2A2018]" id="val_liner">
                      {costing.valLiner.toFixed(2)}
                    </td>
                  </tr>

                  <tr className="border-b border-dashed border-[#D8C7A8]">
                    <td className="py-2 text-left font-medium">Media Cost</td>
                    <td className="py-2 text-right font-mono text-[10.5px] text-[#6B5C4C]" id="kg_media">
                      {costing.kgMedia.toFixed(4)}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-[#2A2018]" id="val_media">
                      {costing.valMedia.toFixed(2)}
                    </td>
                  </tr>

                  <tr className="border-b border-dashed border-[#D8C7A8]">
                    <td className="py-2 text-left font-medium">Glue Cost</td>
                    <td className="py-2 text-right font-mono text-[10.5px] text-[#6B5C4C]" id="kg_glue">
                      {costing.kgGlue.toFixed(4)}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-[#2A2018]" id="val_glue">
                      {costing.valGlue.toFixed(2)}
                    </td>
                  </tr>

                  {/* Manual Cost Adders */}
                  {[
                    { label: "One Color Print", id: "c_printCost", value: printCost, setter: setPrintCost },
                    { label: "Stitching Wire", id: "c_stitchCost", value: stitchCost, setter: setStitchCost },
                    { label: "Unload Labour", id: "c_unloadCost", value: unloadCost, setter: setUnloadCost },
                    { label: "Transport Rent", id: "c_transportCost", value: transportCost, setter: setTransportCost },
                    { label: "Corrugation Starch", id: "c_starchCost", value: starchCost, setter: setStarchCost },
                    { label: "Electricity Cost", id: "c_electricityCost", value: electricityCost, setter: setElectricityCost },
                    { label: "Hanicom Cost", id: "c_hanicomCost", value: hanicomCost, setter: setHanicomCost },
                    { label: "Top & Bottom Cost", id: "c_topBottomCost", value: topBottomCost, setter: setTopBottomCost },
                    { label: "AIT Cost", id: "c_aitCost", value: aitCost, setter: setAitCost },
                    { label: "Other Cost", id: "c_otherCost", value: otherCost, setter: setOtherCost },
                  ].map((row) => (
                    <tr key={row.id} className="border-b border-dashed border-[#D8C7A8]">
                      <td className="py-1 text-left font-medium">{row.label}</td>
                      <td className="py-1"></td>
                      <td className="py-1 text-right">
                        <input
                          type="number"
                          id={row.id}
                          step="0.01"
                          value={row.value}
                          onChange={(e) => row.setter(parseFloat(e.target.value) || 0)}
                          className="font-mono text-xs text-right border border-[#D8C7A8] rounded-[2px] p-1 bg-white text-[#2A2018] w-[60px] focus:outline-none focus:border-[#1F5C6B]"
                        />
                      </td>
                    </tr>
                  ))}

                  <tr className="font-bold border-t-[1.5px] border-[#7A5230]">
                    <td className="py-2.5 text-left text-base text-[#2A2018]">Sub Total</td>
                    <td></td>
                    <td className="py-2.5 text-right font-mono text-[13px] text-[#2A2018]" id="val_subtotal">
                      {costing.subtotal.toFixed(2)}
                    </td>
                  </tr>

                  <tr className="border-b border-dashed border-[#D8C7A8]">
                    <td className="py-1.5 text-left font-medium">Profit (%)</td>
                    <td></td>
                    <td className="py-1.5 text-right font-mono text-xs flex items-center justify-end gap-1">
                      <input
                        type="number"
                        id="c_profitPct"
                        value={profitPct}
                        onChange={(e) => setProfitPct(parseFloat(e.target.value) || 0)}
                        className="font-mono text-xs text-right border border-[#D8C7A8] rounded-[2px] p-1 bg-white text-[#2A2018] w-[60px] focus:outline-none focus:border-[#1F5C6B]"
                      />
                      %
                    </td>
                  </tr>

                  <tr className="border-b border-dashed border-[#D8C7A8] font-medium">
                    <td className="py-2 text-left">Profit (৳)</td>
                    <td></td>
                    <td className="py-2 text-right font-mono text-[#2A2018]" id="val_profit">
                      {costing.profit.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Highlighted Final Cost Band */}
              <div className="mt-4 bg-gradient-to-br from-[#5C3D24] to-[#3C2817] text-[#FAF6EE] rounded-[3px] p-4 flex items-center justify-between relative overflow-hidden shadow-md">
                <div className="relative z-10">
                  <div className="font-mono text-[10px] tracking-wider uppercase opacity-80">
                    ✅ Final Cost
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">প্রতি পিস কার্টন</div>
                </div>
                <div className="font-mono text-2xl font-bold relative z-10" id="val_final">
                  ৳ {costing.finalCost.toFixed(2)}
                </div>
                <div className="absolute -top-[30%] -right-[10%] w-[120px] h-[120px] border border-white/5 rounded-[2px] rotate-[18deg] pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="max-w-[920px] mx-auto mt-8 font-mono text-[10px] text-[#6B5C4C] opacity-70 text-center uppercase tracking-wider">
        FORKAN CORRUGATED — INTERNAL COSTING TOOL — সব ভ্যালু পরিবর্তনযোগ্য
      </footer>
    </div>
  );
}
