"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { LogoutButton } from "@/components/logout-button";
import type { StockStatus } from "@/db/schema";
import { FRESHNESS_WINDOW_HOURS } from "@/lib/search-utils";

type Pharmacy = {
  id: number;
  name: string;
  area: string;
  address: string;
  licenseNumber: string;
  verified: boolean;
  phone: string;
  hours: string;
  approvalStatus: "pending" | "approved" | "rejected";
  reviewedAt: string | null;
  createdAt: string;
};
type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
};
type Medicine = {
  id: number;
  genericName: string;
  brandNames: string[];
  nameAmharic: string;
  strength: string;
  form: string;
  category: string;
};
type Stock = {
  id: number;
  pharmacyId: number;
  medicineId: number;
  status: StockStatus;
  quantity: number;
  lastConfirmedAt: string;
  updatedAt: string;
  priceBirr: number | null;
};
type WorkspaceResponse = {
  pharmacies: Pharmacy[];
  pharmacy: Pharmacy | null;
  medicines: Medicine[];
  stocks: Stock[];
  user: AuthUser;
  error?: string;
};
type Draft = { status: StockStatus; quantity: number };
type ProductDraft = {
  name: string;
  strength: string;
  form: string;
  category: string;
  brandNames: string;
  nameAmharic: string;
  status: StockStatus;
  quantity: number;
  priceBirr: string;
};

const emptyProductDraft: ProductDraft = {
  name: "",
  strength: "",
  form: "Tablet",
  category: "",
  brandNames: "",
  nameAmharic: "",
  status: "in_stock",
  quantity: 12,
  priceBirr: "",
};

const medicineForms = ["Tablet", "Capsule", "Syrup", "Suspension", "Injection", "Inhaler", "Sachet", "Cream", "Drops", "Ointment"];

const statusOptions: { status: StockStatus; label: string }[] = [
  { status: "in_stock", label: "In stock" },
  { status: "low_stock", label: "Low" },
  { status: "out_of_stock", label: "Out" },
];

function createDrafts(medicines: Medicine[], stocks: Stock[]) {
  return Object.fromEntries(medicines.map((medicine) => {
    const saved = stocks.find((stock) => stock.medicineId === medicine.id);
    return [medicine.id, { status: saved?.status ?? "out_of_stock", quantity: saved?.quantity ?? 0 }];
  })) as Record<number, Draft>;
}

function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function initials(name?: string) {
  if (!name) return "MF";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatSubmitted(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeStatus(value: string): StockStatus | null {
  const normalized = value.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (["out", "out_of_stock", "unavailable", "no", "0"].includes(normalized)) return "out_of_stock";
  if (["low", "low_stock", "few", "limited"].includes(normalized)) return "low_stock";
  if (["in", "in_stock", "available", "yes", "stocked"].includes(normalized)) return "in_stock";
  return null;
}

export function PharmacyDashboard() {
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState("");
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "attention">("all");
  const [loading, setLoading] = useState(true);
  const [savingMedicine, setSavingMedicine] = useState<number | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProductDraft);
  const [savingProduct, setSavingProduct] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = workspace?.user;
  const selectedPharmacy = workspace?.pharmacy;
  const hasPharmacies = (workspace?.pharmacies.length ?? 0) > 0;
  const isApproved = selectedPharmacy?.approvalStatus === "approved";

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const path = selectedPharmacyId ? `/api/pharmacy?pharmacyId=${selectedPharmacyId}` : "/api/pharmacy";
        const response = await fetch(path, { signal: controller.signal });
        const result = await response.json() as WorkspaceResponse;
        if (!response.ok) throw new Error(result.error ?? "Unable to load pharmacy workspace.");
        setWorkspace(result);
        if (result.pharmacy) {
          setSelectedPharmacyId(String(result.pharmacy.id));
          setDrafts(createDrafts(result.medicines, result.stocks));
        }
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Unable to load pharmacy workspace.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [selectedPharmacyId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const stockByMedicine = useMemo(() => new Map((workspace?.stocks ?? []).map((stock) => [stock.medicineId, stock])), [workspace?.stocks]);
  const categoryOptions = useMemo(
    () => [...new Set((workspace?.medicines ?? []).map((medicine) => medicine.category))].sort((a, b) => a.localeCompare(b)),
    [workspace?.medicines],
  );
  const visibleMedicines = useMemo(() => (workspace?.medicines ?? []).filter((medicine) => {
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || [medicine.genericName, medicine.nameAmharic, ...medicine.brandNames, medicine.category].join(" ").toLowerCase().includes(needle);
    const currentStatus = drafts[medicine.id]?.status ?? stockByMedicine.get(medicine.id)?.status ?? "out_of_stock";
    const matchesFilter = filter === "all" || currentStatus !== "in_stock";
    return matchesQuery && matchesFilter;
  }), [workspace?.medicines, query, filter, drafts, stockByMedicine]);

  const lowCount = Object.values(drafts).filter((draft) => draft.status === "low_stock").length;
  const outCount = Object.values(drafts).filter((draft) => draft.status === "out_of_stock").length;
  const staleCount = Object.entries(drafts).filter(([medicineId]) => {
    const stock = stockByMedicine.get(Number(medicineId));
    return !stock || (Date.now() - new Date(stock.lastConfirmedAt).getTime()) / 3600000 > FRESHNESS_WINDOW_HOURS;
  }).length;

  function changeDraft(medicineId: number, changes: Partial<Draft>) {
    setDrafts((current) => {
      const existing = current[medicineId] ?? { status: "out_of_stock" as StockStatus, quantity: 0 };
      let next = { ...existing, ...changes };
      if (changes.status === "out_of_stock") next = { ...next, quantity: 0 };
      if (changes.status && changes.status !== "out_of_stock" && existing.status === "out_of_stock" && existing.quantity === 0) {
        next = { ...next, quantity: changes.status === "low_stock" ? 3 : 12 };
      }
      return { ...current, [medicineId]: next };
    });
  }

  function isDirty(medicineId: number) {
    const saved = stockByMedicine.get(medicineId);
    const draft = drafts[medicineId];
    if (!draft) return false;
    return !saved || draft.status !== saved.status || draft.quantity !== saved.quantity;
  }

  async function saveUpdates(updates: { medicineId: number; status: StockStatus; quantity: number }[], successMessage: string) {
    if (!workspace?.pharmacy || updates.length === 0) return false;
    setSavingBulk(true);
    setError("");
    try {
      const response = await fetch("/api/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacyId: workspace.pharmacy.id, updates }),
      });
      const result = await response.json() as { stocks?: Stock[]; error?: string; updatedCount?: number };
      if (!response.ok) throw new Error(result.error ?? "Could not save inventory.");
      setWorkspace((current) => current ? { ...current, stocks: result.stocks ?? current.stocks } : current);
      setDrafts((current) => ({ ...current, ...Object.fromEntries(updates.map((update) => [update.medicineId, { status: update.status, quantity: update.quantity }])) }));
      setToast(successMessage);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save inventory.");
      return false;
    } finally {
      setSavingBulk(false);
    }
  }

  async function saveOne(medicineId: number) {
    const draft = drafts[medicineId];
    if (!draft) return;
    setSavingMedicine(medicineId);
    await saveUpdates([{ medicineId, ...draft }], "Stock confirmed and saved.");
    setSavingMedicine(null);
  }

  async function saveAllDrafts() {
    if (!workspace) return;
    const updates = workspace.medicines
      .filter((medicine) => isDirty(medicine.id))
      .map((medicine) => ({ medicineId: medicine.id, ...drafts[medicine.id] }));
    if (updates.length > 0) await saveUpdates(updates, `${updates.length} stock updates saved.`);
  }

  function changeProduct(changes: Partial<ProductDraft>) {
    setProductDraft((current) => {
      const next = { ...current, ...changes };
      if (changes.status === "out_of_stock") next.quantity = 0;
      if (changes.status && changes.status !== "out_of_stock" && current.status === "out_of_stock" && current.quantity === 0) {
        next.quantity = changes.status === "low_stock" ? 3 : 12;
      }
      return next;
    });
  }

  function closeProductForm() {
    setShowProductForm(false);
    setProductDraft(emptyProductDraft);
  }

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace?.pharmacy) return;
    setSavingProduct(true);
    setError("");
    try {
      const response = await fetch("/api/stock/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacyId: workspace.pharmacy.id,
          name: productDraft.name,
          strength: productDraft.strength,
          form: productDraft.form,
          category: productDraft.category,
          brandNames: productDraft.brandNames,
          nameAmharic: productDraft.nameAmharic,
          status: productDraft.status,
          quantity: productDraft.quantity,
          priceBirr: productDraft.priceBirr === "" ? null : Number(productDraft.priceBirr),
        }),
      });
      const result = (await response.json()) as { medicine?: Medicine; stock?: Stock; message?: string; error?: string };
      if (!response.ok || !result.medicine || !result.stock) {
        throw new Error(result.error ?? "The product could not be added.");
      }

      const addedMedicine = result.medicine;
      const addedStock = result.stock;
      setWorkspace((current) => {
        if (!current) return current;
        const medicinesList = current.medicines.some((medicine) => medicine.id === addedMedicine.id)
          ? current.medicines
          : [...current.medicines, addedMedicine];
        const stocksList = [...current.stocks.filter((stock) => stock.medicineId !== addedStock.medicineId), addedStock];
        return { ...current, medicines: medicinesList, stocks: stocksList };
      });
      setDrafts((current) => ({
        ...current,
        [addedStock.medicineId]: { status: addedStock.status, quantity: addedStock.quantity },
      }));
      setQuery("");
      setFilter("all");
      setToast(result.message ?? `${addedMedicine.genericName} was added to your inventory.`);
      closeProductForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The product could not be added.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !workspace) return;
    setError("");
    setSavingBulk(true);
    try {
      const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length < 2) throw new Error("CSV needs a header and at least one inventory row.");
      const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().trim().replace(/[\s-]+/g, "_"));
      const medicineColumn = headers.findIndex((header) => ["medicine", "medicine_name", "name", "generic_name"].includes(header));
      const statusColumn = headers.findIndex((header) => ["status", "stock", "availability"].includes(header));
      const quantityColumn = headers.findIndex((header) => ["quantity", "qty", "count"].includes(header));
      if (medicineColumn < 0 || statusColumn < 0) throw new Error("CSV must include medicine and status columns.");

      const updates: { medicineId: number; status: StockStatus; quantity: number }[] = [];
      let skipped = 0;
      for (const line of lines.slice(1)) {
        const cells = parseCsvLine(line);
        const medicineName = (cells[medicineColumn] ?? "").toLowerCase().trim();
        const medicine = workspace.medicines.find((entry) => [entry.genericName, entry.nameAmharic, ...entry.brandNames].some((name) => name.toLowerCase() === medicineName));
        const status = normalizeStatus(cells[statusColumn] ?? "");
        if (!medicine || !status) {
          skipped += 1;
          continue;
        }
        const parsedQuantity = quantityColumn < 0 ? Number.NaN : Number.parseInt(cells[quantityColumn] ?? "", 10);
        const quantity = status === "out_of_stock" ? 0 : Number.isFinite(parsedQuantity) ? Math.max(0, Math.min(100000, parsedQuantity)) : status === "low_stock" ? 3 : 12;
        updates.push({ medicineId: medicine.id, status, quantity });
      }
      if (updates.length === 0) throw new Error("No valid medicine rows found. Check the medicine names and stock status.");
      const succeeded = await saveUpdates(updates, `Imported ${updates.length} item${updates.length === 1 ? "" : "s"}${skipped ? ` · ${skipped} row${skipped === 1 ? "" : "s"} skipped` : ""}.`);
      if (!succeeded) return;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "CSV import could not be completed.");
    } finally {
      setSavingBulk(false);
      event.target.value = "";
    }
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link className="brand dashboard-brand" href="/"><span className="brand-mark"><Icon name="pin" size={21} /><span>+</span></span><span className="brand-name">medfinder<span>.</span><small>PHARMACY PORTAL</small></span></Link>
        <div className="sidebar-section-label">WORKSPACE</div>
        <a className="sidebar-link active" href="#inventory"><Icon name="store" size={18} /><span>Inventory</span><span className="sidebar-active-dot" /></a>
        {user?.role === "admin" && <Link className="sidebar-link" href="/admin"><Icon name="shield" size={18} /><span>Admin approvals</span><Icon className="sidebar-external" name="external" size={14} /></Link>}
        {user?.role !== "admin" && <Link className="sidebar-link" href="/pharmacy/register"><Icon name="plus" size={18} /><span>Register pharmacy</span><Icon className="sidebar-external" name="external" size={14} /></Link>}
        <Link className="sidebar-link" href="/"><Icon name="search" size={18} /><span>Patient search</span><Icon className="sidebar-external" name="external" size={14} /></Link>
        <div className="sidebar-divider" />
        <div className="sidebar-section-label">YOUR PHARMACY</div>
        <div className="sidebar-pharmacy-card"><span className="sidebar-pharmacy-icon"><Icon name="store" size={17} /></span><div><strong>{selectedPharmacy?.name ?? "No pharmacy linked"}</strong><small>{selectedPharmacy ? `${selectedPharmacy.area} · ${selectedPharmacy.approvalStatus}` : "Register to get started"}</small></div><span className="sidebar-online" /></div>
        <div className="sidebar-bottom-card"><span className="sidebar-bottom-icon"><Icon name="sparkle" size={17} /></span><strong>Small updates, big impact.</strong><p>Fresh stock information helps neighbors find what they need.</p></div>
        <Link className="sidebar-back" href="/"><Icon name="arrow" size={16} /> Back to MedFinder</Link>
        <LogoutButton className="sidebar-back sidebar-signout" label="Sign out" />
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={14} /><strong>Inventory</strong></div>
          <div className="topbar-actions">
            <span className="demo-workspace-chip"><span />{user?.role === "admin" ? "Administrator" : "Pharmacy owner"}</span>
            {user?.role === "admin" && <Link className="topbar-home-link" href="/admin"><Icon name="shield" size={15} /> Approvals</Link>}
            <Link className="topbar-home-link" href="/"><Icon name="external" size={15} /> Patient view</Link>
            <span className="user-avatar">{initials(user?.name)}</span>
            <LogoutButton className="topbar-logout" compact />
          </div>
        </header>

        <div className="dashboard-content">
          <div className="dashboard-title-row"><div><div className="dashboard-eyebrow"><span /> PHARMACY DASHBOARD</div><h1>Stock, simplified.</h1><p>Quickly confirm what you have in stock. Fresh updates help patients find you.</p></div><div className="dashboard-pharmacy-select-wrap"><label htmlFor="pharmacy-select">VIEWING PHARMACY</label>{hasPharmacies ? <div className="dashboard-select-inner"><Icon name="store" size={17} /><select id="pharmacy-select" value={selectedPharmacyId} onChange={(event) => setSelectedPharmacyId(event.target.value)} disabled={loading || !workspace?.pharmacies?.length}>{workspace?.pharmacies?.map((pharmacy) => <option key={pharmacy.id} value={pharmacy.id}>{pharmacy.name} · {pharmacy.area}</option>)}</select><Icon className="select-chevron" name="chevron" size={15} /></div> : <Link className="register-pharmacy-link" href="/pharmacy/register"><Icon name="plus" size={16} /> Register your pharmacy</Link>}</div></div>

          {isApproved && <div className="dashboard-demo-notice"><span className="dashboard-notice-icon"><Icon name="alert" size={17} /></span><p><strong>Approved pharmacy.</strong> Stock updates are saved to the MedFinder pilot database and shown to patients with a freshness timestamp.</p><span className="demo-notice-label">LIVE WORKSPACE</span></div>}
          {error && <div className="dashboard-error" role="alert"><Icon name="alert" size={17} />{error}</div>}
          {toast && <div className="dashboard-toast" role="status"><Icon name="check" size={17} />{toast}<button type="button" onClick={() => setToast("")} aria-label="Dismiss"><Icon name="close" size={15} /></button></div>}

          {!loading && !hasPharmacies && (
            <section className="pharmacy-onboarding">
              <span className="pharmacy-onboarding-icon"><Icon name="store" size={28} /></span>
              <div>
                <span className="dashboard-eyebrow"><span /> GET STARTED</span>
                <h2>Register your pharmacy</h2>
                <p>Your account is ready. Submit your pharmacy licence and details, then a MedFinder administrator will review the application before it appears in patient search.</p>
                <Link className="pharmacy-onboarding-link" href="/pharmacy/register"><Icon name="plus" size={16} /> Start pharmacy application <Icon name="arrow" size={15} /></Link>
              </div>
            </section>
          )}

          {!loading && selectedPharmacy && selectedPharmacy.approvalStatus !== "approved" && (
            <section className={`pharmacy-status-card is-${selectedPharmacy.approvalStatus}`}>
              <span className="pharmacy-status-icon"><Icon name={selectedPharmacy.approvalStatus === "pending" ? "clock" : "alert"} size={24} /></span>
              <div>
                <span className={`status-pill ${selectedPharmacy.approvalStatus}`}>{selectedPharmacy.approvalStatus === "pending" ? "Pending review" : "Application rejected"}</span>
                <h2>{selectedPharmacy.approvalStatus === "pending" ? "Your pharmacy is awaiting approval" : "This application was not approved"}</h2>
                <p>
                  {selectedPharmacy.approvalStatus === "pending"
                    ? `We received your application for ${selectedPharmacy.name}. An administrator must approve it before you can manage stock or appear in patient search.`
                    : `The application for ${selectedPharmacy.name} was not approved. You can correct the details and submit a new application.`}
                </p>
                <div className="pharmacy-status-meta">
                  <span>Licence <strong>{selectedPharmacy.licenseNumber}</strong></span>
                  <span>Area <strong>{selectedPharmacy.area}</strong></span>
                  <span>Submitted <strong>{formatSubmitted(selectedPharmacy.createdAt)}</strong></span>
                </div>
                {selectedPharmacy.approvalStatus === "rejected" && (
                  <Link className="pharmacy-onboarding-link" href="/pharmacy/register"><Icon name="refresh" size={15} /> Re-submit application <Icon name="arrow" size={15} /></Link>
                )}
              </div>
            </section>
          )}

          {isApproved && (
            <>
          <div className="dashboard-stats">
            <article className="dashboard-stat-card"><span className="stat-icon icon-mint"><Icon name="capsule" size={19} /></span><div><span>LISTED MEDICINES</span><strong>{workspace?.medicines.length ?? "—"}</strong></div><small>in this demo catalog</small></article>
            <article className="dashboard-stat-card"><span className="stat-icon icon-amber"><Icon name="alert" size={19} /></span><div><span>LOW OR OUT</span><strong>{lowCount + outCount}</strong></div><small>{lowCount} low · {outCount} out of stock</small></article>
            <article className="dashboard-stat-card"><span className="stat-icon icon-blue"><Icon name="clock" size={19} /></span><div><span>NEEDS CONFIRMATION</span><strong>{staleCount}</strong></div><small>older than 24 hours</small></article>
          </div>

          <section className="inventory-panel" id="inventory">
            <div className="inventory-panel-head"><div><h2>Your inventory</h2><p>Set the current availability for each medicine.</p></div><div className="inventory-head-actions"><button className="add-product-button" type="button" onClick={() => (showProductForm ? closeProductForm() : setShowProductForm(true))} aria-expanded={showProductForm}><Icon name={showProductForm ? "close" : "plus"} size={16} />{showProductForm ? "Close" : "Add product"}</button><a className="csv-template-link" href="data:text/csv;charset=utf-8,medicine%2Cstatus%2Cquantity%0AMetformin%2Cin_stock%2C12%0AAmlodipine%2Clow_stock%2C3" download="medfinder-inventory-template.csv"><Icon name="download" size={15} />Template</a><input className="hidden-file-input" ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={importCsv} /><button className="csv-import-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={savingBulk}><Icon name="upload" size={16} />{savingBulk ? "Importing…" : "Import CSV"}</button></div></div>
            {showProductForm && (
              <form className="product-add-panel" onSubmit={addProduct}>
                <div className="product-add-head">
                  <div>
                    <h3>Add one product</h3>
                    <p>Add a single medicine to {selectedPharmacy?.name ?? "this pharmacy"}. Use CSV import for bulk updates.</p>
                  </div>
                  <button className="product-add-close" type="button" onClick={closeProductForm} aria-label="Close add product form"><Icon name="close" size={16} /></button>
                </div>
                <div className="product-add-grid">
                  <label className="product-field span-2"><span>Medicine name</span><input value={productDraft.name} onChange={(event) => changeProduct({ name: event.target.value })} placeholder="e.g. Azithromycin" required minLength={2} maxLength={120} /></label>
                  <label className="product-field"><span>Strength</span><input value={productDraft.strength} onChange={(event) => changeProduct({ strength: event.target.value })} placeholder="500 mg" required maxLength={40} /></label>
                  <label className="product-field"><span>Form</span><input list="medicine-form-options" value={productDraft.form} onChange={(event) => changeProduct({ form: event.target.value })} placeholder="Tablet" required maxLength={40} /></label>
                  <label className="product-field"><span>Category</span><input list="medicine-category-options" value={productDraft.category} onChange={(event) => changeProduct({ category: event.target.value })} placeholder="e.g. Antibiotic" required maxLength={60} /></label>
                  <label className="product-field span-2"><span>Brand names <em>optional</em></span><input value={productDraft.brandNames} onChange={(event) => changeProduct({ brandNames: event.target.value })} placeholder="Zithromax, Azee" maxLength={240} /></label>
                  <label className="product-field"><span>Availability</span><select value={productDraft.status} onChange={(event) => changeProduct({ status: event.target.value as StockStatus })}>{statusOptions.map((option) => <option key={option.status} value={option.status}>{option.label}</option>)}</select></label>
                  <label className="product-field"><span>Quantity</span><input type="number" min={0} max={100000} value={productDraft.quantity} disabled={productDraft.status === "out_of_stock"} onChange={(event) => changeProduct({ quantity: Math.max(0, Math.min(100000, Number(event.target.value))) })} /></label>
                  <label className="product-field"><span>Price (birr) <em>optional</em></span><input type="number" min={0} max={100000} step="0.01" value={productDraft.priceBirr} onChange={(event) => changeProduct({ priceBirr: event.target.value })} placeholder="0.00" /></label>
                  <label className="product-field span-2"><span>Amharic name <em>optional</em></span><input value={productDraft.nameAmharic} onChange={(event) => changeProduct({ nameAmharic: event.target.value })} placeholder="የመድኃኒት ስም" maxLength={120} /></label>
                </div>
                <datalist id="medicine-form-options">{medicineForms.map((form) => <option key={form} value={form} />)}</datalist>
                <datalist id="medicine-category-options">{categoryOptions.map((category) => <option key={category} value={category} />)}</datalist>
                <div className="product-add-actions">
                  <button className="product-cancel" type="button" onClick={closeProductForm}>Cancel</button>
                  <button className="product-submit" type="submit" disabled={savingProduct}>
                    {savingProduct ? <span className="button-spinner" /> : <Icon name="plus" size={15} />}
                    {savingProduct ? "Adding…" : "Add product"}
                  </button>
                </div>
              </form>
            )}
            <div className="inventory-controls"><label className="inventory-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search medicine or brand" aria-label="Search inventory" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={15} /></button>}</label><div className="inventory-filters" role="tablist" aria-label="Inventory filter"><button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All items <span>{workspace?.medicines.length ?? 0}</span></button><button type="button" className={filter === "attention" ? "active" : ""} onClick={() => setFilter("attention")}>Needs attention <span>{lowCount + outCount}</span></button></div></div>
            <div className="inventory-table-head"><span>MEDICINE</span><span>AVAILABILITY</span><span>QUANTITY</span><span>LAST CONFIRMED</span><span /></div>
            <div className="inventory-list">
              {loading && !workspace && <div className="inventory-loading"><span className="loading-spinner" /> Loading inventory…</div>}
              {!loading && visibleMedicines.length === 0 && <div className="inventory-empty"><Icon name="search" size={22} /><strong>No medicines match.</strong><span>Try a different name or filter.</span></div>}
              {visibleMedicines.map((medicine) => {
                const stock = stockByMedicine.get(medicine.id);
                const draft = drafts[medicine.id] ?? { status: stock?.status ?? "out_of_stock", quantity: stock?.quantity ?? 0 };
                const overdue = !stock || (Date.now() - new Date(stock.lastConfirmedAt).getTime()) / 3600000 > FRESHNESS_WINDOW_HOURS;
                const dirty = isDirty(medicine.id);
                return (
                  <article className={`inventory-row ${dirty ? "row-dirty" : ""}`} key={medicine.id}>
                    <div className="inventory-medicine"><span className={`medicine-mini-icon mini-${medicine.category.toLowerCase().split(" ")[0].replace(/[^a-z]/g, "")}`}><Icon name="capsule" size={17} /></span><div><strong>{medicine.genericName}</strong><span>{medicine.strength} · {medicine.form} <i>·</i> {medicine.category}</span><small>{medicine.brandNames.slice(0, 2).join(" · ")}</small></div></div>
                    <div className="status-selector" role="group" aria-label={`Availability for ${medicine.genericName}`}>{statusOptions.map((option) => <button key={option.status} type="button" aria-pressed={draft.status === option.status} className={`${draft.status === option.status ? `selected selected-${option.status}` : ""}`} onClick={() => changeDraft(medicine.id, { status: option.status })}>{option.label}</button>)}</div>
                    <div className="quantity-field"><input aria-label={`Quantity for ${medicine.genericName}`} type="number" min="0" max="100000" value={draft.quantity} disabled={draft.status === "out_of_stock"} onChange={(event) => changeDraft(medicine.id, { quantity: Math.max(0, Number(event.target.value)) })} /><span>units</span></div>
                    <div className={`last-confirmed ${overdue ? "is-overdue" : ""}`}><span className={`confirmation-dot ${overdue ? "" : "fresh"}`} /><div><strong>{overdue ? "Needs confirmation" : timeAgo(stock?.lastConfirmedAt ?? "")}</strong><small>{overdue ? "Older than 24 hours" : "Confirmed recently"}</small></div></div>
                    <div className="row-save-wrap"><button className={`row-save-button ${dirty ? "is-dirty" : ""}`} type="button" onClick={() => saveOne(medicine.id)} disabled={!dirty || savingBulk || savingMedicine === medicine.id}>{savingMedicine === medicine.id ? <span className="button-spinner" /> : dirty ? "Save" : <><Icon name="check" size={15} />Saved</>}</button></div>
                  </article>
                );
              })}
            </div>
            <div className="inventory-panel-foot"><span><Icon name="clock" size={15} /> Updates automatically expire from patient search after 24 hours.</span><button className="save-all-button" type="button" onClick={saveAllDrafts} disabled={savingBulk || !workspace?.medicines.some((medicine) => isDirty(medicine.id))}><Icon name="check" size={15} />{savingBulk ? "Saving…" : "Save all changes"}</button></div>
          </section>

          <div className="dashboard-bottom-grid"><section className="tip-card"><span className="tip-icon"><Icon name="sparkle" size={19} /></span><div><h3>A quick stock check goes a long way</h3><p>Confirm items at the start of the day. After 24 hours, older availability is clearly marked unconfirmed for patients.</p></div><span className="tip-decoration"><Icon name="cross" size={30} /></span></section><section className="csv-help-card"><span className="csv-help-icon"><Icon name="file" size={19} /></span><div><h3>Bulk update with a CSV</h3><p>Use columns <code>medicine</code>, <code>status</code> and <code>quantity</code>. Generic or brand names are accepted. For one item, use <strong>Add product</strong>.</p><a href="data:text/csv;charset=utf-8,medicine%2Cstatus%2Cquantity%0AMetformin%2Cin_stock%2C12" download="medfinder-inventory-template.csv">Download template <Icon name="arrow" size={14} /></a></div></section></div>
            </>
          )}

          <footer className="dashboard-footer"><span>MedFinder pharmacy workspace · Approved pharmacy</span><span>Need a hand? <a href="mailto:hello@medfinder.example">Contact the pilot team</a></span></footer>
        </div>
      </main>
    </div>
  );
}
