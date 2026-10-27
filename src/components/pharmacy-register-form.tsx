"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { ADDIS_AREAS } from "@/lib/addis-areas";

type CreatedPharmacy = {
  id: number;
  name: string;
  area: string;
  licenseNumber: string;
  approvalStatus: "pending" | "approved" | "rejected";
};

export function PharmacyRegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [area, setArea] = useState(ADDIS_AREAS[0]?.name ?? "Bole");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("08:00–20:00");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedPharmacy | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/pharmacy/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, licenseNumber, area, address, phone, hours }),
      });
      const data = (await response.json()) as { pharmacy?: CreatedPharmacy; error?: string };
      if (response.status === 401) {
        router.push("/login?next=/pharmacy/register");
        return;
      }
      if (!response.ok || !data.pharmacy) throw new Error(data.error ?? "Your application could not be submitted.");
      setCreated(data.pharmacy);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your application could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <Link className="brand auth-brand" href="/">
            <span className="brand-mark"><Icon name="pin" size={21} /><span>+</span></span>
            <span className="brand-name">medfinder<span>.</span><small>ADDIS ABABA</small></span>
          </Link>
          <div className="auth-brand-copy">
            <span className="auth-eyebrow">APPLICATION RECEIVED</span>
            <h1>One review away from joining the network.</h1>
            <p>Our administrators verify licence details before a pharmacy appears in patient search results.</p>
          </div>
          <p className="auth-brand-note">You can check the review status from your pharmacy workspace.</p>
        </aside>
        <main className="auth-main">
          <div className="auth-card auth-success-card">
            <span className="auth-success-icon"><Icon name="check" size={26} /></span>
            <h2>Application submitted</h2>
            <p>
              <strong>{created.name}</strong> in {created.area} is now waiting for administrator approval.
              It will not appear in patient search until it is approved.
            </p>
            <dl className="auth-summary">
              <div><dt>Licence</dt><dd>{created.licenseNumber}</dd></div>
              <div><dt>Status</dt><dd><span className="status-pill pending">Pending review</span></dd></div>
            </dl>
            <Link className="auth-submit auth-submit-link" href="/pharmacy">Go to pharmacy workspace <Icon name="arrow" size={16} /></Link>
            <Link className="auth-back auth-back-inline" href="/">Back to patient search</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <aside className="auth-brand-panel">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark"><Icon name="pin" size={21} /><span>+</span></span>
          <span className="brand-name">medfinder<span>.</span><small>ADDIS ABABA</small></span>
        </Link>
        <div className="auth-brand-copy">
          <span className="auth-eyebrow">PHARMACY OWNERS</span>
          <h1>Register your pharmacy for the MedFinder pilot.</h1>
          <p>Tell us about your pharmacy. A MedFinder administrator will verify the licence before your profile goes live.</p>
          <ul className="auth-benefits">
            <li><Icon name="shield" size={17} /><span>Manual admin verification</span></li>
            <li><Icon name="clock" size={17} /><span>Keep stock freshness up to date</span></li>
            <li><Icon name="store" size={17} /><span>One pharmacy per owner account</span></li>
          </ul>
        </div>
        <p className="auth-brand-note">Approval usually happens before a pharmacy is shown to patients.</p>
      </aside>

      <main className="auth-main">
        <div className="auth-card is-wide">
          <div className="auth-card-head">
            <span className="auth-card-icon"><Icon name="store" size={20} /></span>
            <h2>Pharmacy registration</h2>
            <p>All fields are required. Your profile stays hidden until an administrator approves it.</p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <div className="auth-form-grid">
              <label className="auth-field span-2">
                <span>Pharmacy name</span>
                <span className="auth-input-wrap">
                  <Icon name="store" size={17} />
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Bole Family Pharmacy" required minLength={2} maxLength={120} />
                </span>
              </label>

              <label className="auth-field">
                <span>Licence number</span>
                <span className="auth-input-wrap">
                  <Icon name="file" size={17} />
                  <input value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} placeholder="AA-PH-12345" required minLength={3} maxLength={60} />
                </span>
              </label>

              <label className="auth-field">
                <span>Area</span>
                <span className="auth-input-wrap">
                  <Icon name="pin" size={17} />
                  <select value={area} onChange={(event) => setArea(event.target.value)} required>
                    {ADDIS_AREAS.map((entry) => <option key={entry.name} value={entry.name}>{entry.name}</option>)}
                  </select>
                </span>
              </label>

              <label className="auth-field span-2">
                <span>Street address</span>
                <span className="auth-input-wrap">
                  <Icon name="pin" size={17} />
                  <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, landmark, or building" required minLength={5} maxLength={240} />
                </span>
              </label>

              <label className="auth-field">
                <span>Contact phone</span>
                <span className="auth-input-wrap">
                  <Icon name="phone" size={17} />
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+251 91 000 0000" required minLength={7} maxLength={40} />
                </span>
              </label>

              <label className="auth-field">
                <span>Opening hours</span>
                <span className="auth-input-wrap">
                  <Icon name="clock" size={17} />
                  <input value={hours} onChange={(event) => setHours(event.target.value)} placeholder="08:00–20:00" maxLength={60} />
                </span>
              </label>
            </div>

            {error && <div className="auth-error" role="alert"><Icon name="alert" size={16} />{error}</div>}

            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? <span className="button-spinner" /> : <Icon name="shield" size={17} />}
              {busy ? "Submitting…" : "Submit for admin approval"}
            </button>
          </form>

          <p className="auth-switch"><Link href="/pharmacy">Back to pharmacy workspace</Link></p>
        </div>
        <Link className="auth-back" href="/"><Icon name="arrow" size={15} /> Back to patient search</Link>
      </main>
    </div>
  );
}
