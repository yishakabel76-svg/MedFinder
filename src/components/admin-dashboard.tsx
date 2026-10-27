"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { LogoutButton } from "@/components/logout-button";

type ApprovalStatus = "pending" | "approved" | "rejected";

type AdminPharmacy = {
  id: number;
  name: string;
  area: string;
  address: string;
  licenseNumber: string;
  phone: string;
  hours: string;
  verified: boolean;
  approvalStatus: ApprovalStatus;
  reviewedAt: string | null;
  createdAt: string;
  ownerId: number | null;
  ownerName: string | null;
  ownerEmail: string | null;
};

type AdminResponse = {
  pharmacies: AdminPharmacy[];
  stats: { pending: number; approved: number; rejected: number; total: number; owners: number };
  admin: { id: number; name: string; email: string; role: "admin" };
  error?: string;
};

const statusLabels: Record<ApprovalStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function AdminDashboard() {
  const [data, setData] = useState<AdminResponse | null>(null);
  const [filter, setFilter] = useState<"all" | ApprovalStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/pharmacies", { cache: "no-store" });
      const result = (await response.json()) as AdminResponse;
      if (response.status === 401) {
        window.location.href = "/login?next=/admin";
        return;
      }
      if (!response.ok) throw new Error(result.error ?? "Could not load pharmacy applications.");
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load pharmacy applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const visible = useMemo(
    () => (data?.pharmacies ?? []).filter((pharmacy) => filter === "all" || pharmacy.approvalStatus === filter),
    [data?.pharmacies, filter],
  );

  async function review(pharmacy: AdminPharmacy, action: "approve" | "reject") {
    setBusyId(pharmacy.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/pharmacies/${pharmacy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = (await response.json()) as { pharmacy?: AdminPharmacy; error?: string };
      if (!response.ok) throw new Error(result.error ?? "The pharmacy could not be updated.");
      setToast(
        action === "approve"
          ? `${pharmacy.name} is approved and now visible in patient search.`
          : `${pharmacy.name} has been marked as rejected.`,
      );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The pharmacy could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(pharmacy: AdminPharmacy) {
    const confirmed = window.confirm(
      `Remove ${pharmacy.name}? This deletes the pharmacy profile and all of its stock listings. This cannot be undone.`,
    );
    if (!confirmed) return;

    setBusyId(pharmacy.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/pharmacies/${pharmacy.id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The pharmacy could not be removed.");
      setToast(`${pharmacy.name} was removed from MedFinder.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The pharmacy could not be removed.");
    } finally {
      setBusyId(null);
    }
  }

  const stats = data?.stats;
  const admin = data?.admin;

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link className="brand dashboard-brand" href="/"><span className="brand-mark"><Icon name="pin" size={21} /><span>+</span></span><span className="brand-name">medfinder<span>.</span><small>ADMIN CONSOLE</small></span></Link>
        <div className="sidebar-section-label">ADMINISTRATION</div>
        <a className="sidebar-link active" href="#approvals"><Icon name="shield" size={18} /><span>Pharmacy approvals</span><span className="sidebar-active-dot" /></a>
        <Link className="sidebar-link" href="/pharmacy"><Icon name="store" size={18} /><span>Inventory</span><Icon className="sidebar-external" name="external" size={14} /></Link>
        <Link className="sidebar-link" href="/"><Icon name="search" size={18} /><span>Patient search</span><Icon className="sidebar-external" name="external" size={14} /></Link>
        <div className="sidebar-divider" />
        <div className="sidebar-section-label">SIGNED IN AS</div>
        <div className="sidebar-pharmacy-card"><span className="sidebar-pharmacy-icon"><Icon name="shield" size={17} /></span><div><strong>{admin?.name ?? "MedFinder Admin"}</strong><small>{admin?.email ?? "Administrator"}</small></div><span className="sidebar-online" /></div>
        <div className="sidebar-bottom-card"><span className="sidebar-bottom-icon"><Icon name="check" size={17} /></span><strong>Verify before approving.</strong><p>Check the licence number and pharmacy details before a profile becomes public.</p></div>
        <Link className="sidebar-back" href="/"><Icon name="arrow" size={16} /> Back to MedFinder</Link>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb"><span>Admin</span><Icon name="chevron" size={14} /><strong>Pharmacy approvals</strong></div>
          <div className="topbar-actions">
            <span className="demo-workspace-chip"><span /> Administrator</span>
            <Link className="topbar-home-link" href="/"><Icon name="external" size={15} /> Patient view</Link>
            <span className="user-avatar">{admin ? initials(admin.name) : "AD"}</span>
            <LogoutButton className="topbar-logout" compact />
          </div>
        </header>

        <div className="dashboard-content">
          <div className="dashboard-title-row">
            <div>
              <div className="dashboard-eyebrow"><span /> ADMIN CONSOLE</div>
              <h1>Pharmacy approvals.</h1>
              <p>Review owner applications, approve trusted pharmacies, and remove profiles that should not be listed.</p>
            </div>
          </div>

          <div className="dashboard-demo-notice">
            <span className="dashboard-notice-icon"><Icon name="alert" size={17} /></span>
            <p><strong>Approval controls visibility.</strong> Pending and rejected pharmacies never appear in patient search. Deleting a pharmacy also removes its stock listings.</p>
            <span className="demo-notice-label">ADMIN ONLY</span>
          </div>

          {error && <div className="dashboard-error" role="alert"><Icon name="alert" size={17} />{error}</div>}
          {toast && <div className="dashboard-toast" role="status"><Icon name="check" size={17} />{toast}<button type="button" onClick={() => setToast("")} aria-label="Dismiss"><Icon name="close" size={15} /></button></div>}

          <div className="dashboard-stats admin-stats">
            <article className="dashboard-stat-card"><span className="stat-icon icon-amber"><Icon name="clock" size={19} /></span><div><span>PENDING</span><strong>{stats?.pending ?? "—"}</strong></div><small>awaiting review</small></article>
            <article className="dashboard-stat-card"><span className="stat-icon icon-mint"><Icon name="shield" size={19} /></span><div><span>APPROVED</span><strong>{stats?.approved ?? "—"}</strong></div><small>visible to patients</small></article>
            <article className="dashboard-stat-card"><span className="stat-icon icon-blue"><Icon name="close" size={19} /></span><div><span>REJECTED</span><strong>{stats?.rejected ?? "—"}</strong></div><small>hidden from search</small></article>
            <article className="dashboard-stat-card"><span className="stat-icon icon-mint"><Icon name="user" size={19} /></span><div><span>OWNERS</span><strong>{stats?.owners ?? "—"}</strong></div><small>linked accounts</small></article>
          </div>

          <section className="inventory-panel admin-panel" id="approvals">
            <div className="inventory-panel-head">
              <div><h2>Registered pharmacies</h2><p>Approve, reject, or permanently remove a pharmacy.</p></div>
              <div className="inventory-head-actions"><Link className="csv-template-link" href="/pharmacy"><Icon name="store" size={15} />Inventory</Link></div>
            </div>

            <div className="admin-filter-tabs" role="tablist" aria-label="Filter pharmacies">
              {([
                ["all", "All", stats?.total ?? 0],
                ["pending", "Pending", stats?.pending ?? 0],
                ["approved", "Approved", stats?.approved ?? 0],
                ["rejected", "Rejected", stats?.rejected ?? 0],
              ] as const).map(([value, label, count]) => (
                <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>
                  {label}<span>{count}</span>
                </button>
              ))}
            </div>

            <div className="admin-pharmacy-list">
              {loading && !data && <div className="inventory-loading"><span className="loading-spinner" /> Loading pharmacies…</div>}
              {!loading && visible.length === 0 && <div className="inventory-empty"><Icon name="store" size={22} /><strong>No pharmacies in this view.</strong><span>Try a different filter.</span></div>}
              {visible.map((pharmacy) => (
                <article className="admin-pharmacy-card" key={pharmacy.id}>
                  <div className="admin-pharmacy-main">
                    <div className="admin-pharmacy-title">
                      <h3>{pharmacy.name}</h3>
                      <span className={`status-pill ${pharmacy.approvalStatus}`}>{statusLabels[pharmacy.approvalStatus]}</span>
                    </div>
                    <div className="admin-pharmacy-meta">
                      <span><Icon name="pin" size={14} />{pharmacy.area}</span>
                      <span>{pharmacy.address}</span>
                      <span><Icon name="phone" size={13} />{pharmacy.phone}</span>
                    </div>
                    <div className="admin-pharmacy-owner">
                      <Icon name="user" size={14} />
                      {pharmacy.ownerName ? (
                        <span><strong>{pharmacy.ownerName}</strong> · {pharmacy.ownerEmail}</span>
                      ) : (
                        <span>MedFinder demo pharmacy</span>
                      )}
                    </div>
                    <div className="admin-pharmacy-foot">
                      <span>Licence <strong>{pharmacy.licenseNumber}</strong></span>
                      <span>Submitted {formatDate(pharmacy.createdAt)}</span>
                      {pharmacy.reviewedAt && <span>Reviewed {formatDate(pharmacy.reviewedAt)}</span>}
                    </div>
                  </div>
                  <div className="admin-actions">
                    {pharmacy.approvalStatus !== "approved" && (
                      <button type="button" className="admin-action admin-approve" onClick={() => review(pharmacy, "approve")} disabled={busyId === pharmacy.id}>
                        <Icon name="check" size={15} />Approve
                      </button>
                    )}
                    {pharmacy.approvalStatus !== "rejected" && (
                      <button type="button" className="admin-action admin-reject" onClick={() => review(pharmacy, "reject")} disabled={busyId === pharmacy.id}>
                        <Icon name="close" size={15} />{pharmacy.approvalStatus === "approved" ? "Revoke" : "Reject"}
                      </button>
                    )}
                    <button type="button" className="admin-action admin-delete" onClick={() => remove(pharmacy)} disabled={busyId === pharmacy.id}>
                      <Icon name="trash" size={15} />Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="inventory-panel-foot">
              <span><Icon name="shield" size={15} /> Only approved pharmacies are shown in patient search.</span>
            </div>
          </section>

          <footer className="dashboard-footer"><span>MedFinder admin console · Pharmacy verification</span><span>Need a hand? <a href="mailto:hello@medfinder.example">Contact the pilot team</a></span></footer>
        </div>
      </main>
    </div>
  );
}
