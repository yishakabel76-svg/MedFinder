"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthNav } from "@/components/auth-nav";
import { Icon } from "@/components/icon";
import type { AvailabilityStatus } from "@/lib/search-utils";

type Language = "en" | "am";
type Medicine = {
  id: number;
  genericName: string;
  brandNames: string[];
  nameAmharic: string;
  strength: string;
  form: string;
  category: string;
  matchScore?: number;
};
type SearchResult = {
  stockId: number;
  medicineId: number;
  genericName: string;
  brandNames: string[];
  nameAmharic: string;
  strength: string;
  form: string;
  category: string;
  pharmacyId: number;
  pharmacyName: string;
  area: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  verified: boolean;
  hours: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
  availability: AvailabilityStatus;
  quantity: number;
  priceBirr: number | null;
  distanceKm: number;
  lastConfirmedAt: string;
};
type SearchResponse = {
  medicines: Medicine[];
  results: SearchResult[];
  suggestions?: Medicine[];
  error?: string;
  demo?: boolean;
};

const defaultLocation = { latitude: 9.02497, longitude: 38.74686 };
const translations = {
  en: {
    find: "Find medicine",
    pharmacies: "For pharmacies",
    heroEyebrow: "A little less searching. A lot more certainty.",
    heroTitle: "Find the medicine you need, closer to home.",
    heroBody: "See which nearby pharmacies may have your prescription in stock. Check the last update, then call ahead before you travel.",
    searchPlaceholder: "Search a medicine, brand or generic name",
    searchButton: "Search availability",
    nearMe: "Use my location",
    popular: "Popular searches",
    resultsTitle: "Nearby availability",
    resultsSub: "Availability around your location",
    availableOnly: "Available now",
    allNearby: "All nearby",
    radius: "Search radius",
    km: "km",
    call: "Call pharmacy",
    directions: "Directions",
    report: "Report an issue",
    reportReason: "What happened?",
    sendReport: "Send report",
    cancel: "Cancel",
    noResults: "No matching medicine found nearby.",
    noAvailable: "No recently confirmed stock in this radius.",
    tryAll: "See all nearby listings",
    tryAnother: "Try another name or brand, or check the spelling.",
    suggestions: "Did you mean one of these?",
    showing: "Showing results for",
    match: "matched medicine",
    fresh: "Freshness matters",
    freshnessCopy: "Listings older than 24 hours are marked unconfirmed.",
    how: "A clearer path to your medicine",
    howBody: "Three quick steps. No guesswork, no extra stops.",
    stepOne: "Search your medicine",
    stepOneBody: "Try a generic name, brand or a quick typo.",
    stepTwo: "Check nearby stock",
    stepTwoBody: "Compare distance and the latest confirmation.",
    stepThree: "Call before you go",
    stepThreeBody: "Confirm with the pharmacy, then get directions.",
    safety: "A safer way to search",
    safetyBody: "MedFinder only shows availability. It does not provide medical advice. Prescription medicines require a prescription.",
    footer: "Made for better access to medicines in Addis Ababa.",
    demoTitle: "Pilot preview",
    demoBody: "Sample inventory only — not live pharmacy stock. Please call to confirm before travelling.",
    freshness: "Updated",
    inStock: "In stock",
    lowStock: "Low stock",
    outOfStock: "Out of stock",
    unconfirmed: "Unconfirmed",
    verified: "Sample profile",
    hours: "Hours",
    privacy: "No patient health information is collected.",
    reportingSent: "Thanks — your report helps keep listings honest.",
    sendError: "Could not send report. Please try again.",
    locationError: "We could not access your location. Showing central Addis Ababa instead.",
    loading: "Checking nearby availability…",
    openPharmacy: "Manage pharmacy stock",
    resultCount: "listings",
  },
  am: {
    find: "መድኃኒት ፈልግ",
    pharmacies: "ለፋርማሲዎች",
    heroEyebrow: "ፍለጋውን ያቀልሉ፣ እርግጠኝነትን ይጨምሩ።",
    heroTitle: "የሚያስፈልግዎትን መድኃኒት በአቅራቢያዎ ያግኙ።",
    heroBody: "በአቅራቢያ ያሉ ፋርማሲዎች መድኃኒቱን ሊኖራቸው እንደሚችል ይመልከቱ። ከመሄድዎ በፊት በስልክ ያረጋግጡ።",
    searchPlaceholder: "የመድኃኒት ወይም የብራንድ ስም ይፈልጉ",
    searchButton: "መኖሩን ፈልግ",
    nearMe: "አካባቢዬን ተጠቀም",
    popular: "ብዙ የሚፈለጉ",
    resultsTitle: "በአቅራቢያ ያለ መኖር",
    resultsSub: "በአካባቢዎ ያለ መረጃ",
    availableOnly: "አሁን ይገኛል",
    allNearby: "ሁሉንም አሳይ",
    radius: "የፍለጋ ርቀት",
    km: "ኪ.ሜ",
    call: "ወደ ፋርማሲ ይደውሉ",
    directions: "አቅጣጫ",
    report: "ችግር ሪፖርት",
    reportReason: "ምን ተፈጠረ?",
    sendReport: "ሪፖርት ላክ",
    cancel: "ዝጋ",
    noResults: "በአቅራቢያዎ ይህ መድኃኒት አልተገኘም።",
    noAvailable: "በዚህ ርቀት ውስጥ በቅርቡ የተረጋገጠ ክምችት የለም።",
    tryAll: "በአቅራቢያ ያሉ ሁሉንም ይመልከቱ",
    tryAnother: "ሌላ ስም ይሞክሩ ወይም አጻጻፉን ያረጋግጡ።",
    suggestions: "ይህን ማለትዎ ነው?",
    showing: "የፍለጋ ውጤት",
    match: "የተገኘ መድኃኒት",
    fresh: "የመረጃ አዲስነት",
    freshnessCopy: "ከ24 ሰዓት በላይ የቆዩ መረጃዎች አልተረጋገጡም ተብለው ይታያሉ።",
    how: "መድኃኒትዎን ለማግኘት ቀላል መንገድ",
    howBody: "ሶስት ፈጣን ደረጃዎች።",
    stepOne: "መድኃኒትዎን ይፈልጉ",
    stepOneBody: "የጄኔሪክ ስም፣ ብራንድ ወይም አጻጻፍ ይሞክሩ።",
    stepTwo: "አቅራቢያ ያለውን ክምችት ይመልከቱ",
    stepTwoBody: "ርቀትንና የቅርብ ጊዜ ማረጋገጫን ያነጻጽሩ።",
    stepThree: "ከመሄድዎ በፊት ይደውሉ",
    stepThreeBody: "በስልክ ያረጋግጡ ከዚያም አቅጣጫ ይውሰዱ።",
    safety: "ደህንነት ያለው ፍለጋ",
    safetyBody: "MedFinder የመድኃኒት መኖርን ብቻ ያሳያል፤ የሕክምና ምክር አይሰጥም። በሐኪም ትእዛዝ የሚሸጡ መድኃኒቶች ትእዛዝ ይፈልጋሉ።",
    footer: "በአዲስ አበባ የመድኃኒት ተደራሽነትን ለማሻሻል።",
    demoTitle: "የሙከራ ማሳያ",
    demoBody: "የምሳሌ መረጃ ብቻ ነው፤ ቀጥታ የፋርማሲ ክምችት አይደለም። ከመሄድዎ በፊት በስልክ ያረጋግጡ።",
    freshness: "ተረጋግጧል",
    inStock: "ይገኛል",
    lowStock: "ጥቂት ቀርቷል",
    outOfStock: "አልቋል",
    unconfirmed: "አልተረጋገጠም",
    verified: "የምሳሌ መዝገብ",
    hours: "የሥራ ሰዓት",
    privacy: "የታካሚ የጤና መረጃ አንሰበስብም።",
    reportingSent: "እናመሰግናለን፤ ሪፖርትዎ መረጃውን ትክክለኛ ለማድረግ ይረዳል።",
    sendError: "ሪፖርቱን መላክ አልተቻለም። እንደገና ይሞክሩ።",
    locationError: "አካባቢዎን ማግኘት አልተቻለም። የአዲስ አበባ መሃል እንጠቀማለን።",
    loading: "በአቅራቢያ መኖሩን በመፈለግ ላይ…",
    openPharmacy: "የፋርማሲ ክምችት ያስተዳድሩ",
    resultCount: "ውጤቶች",
  },
} as const;

function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusLabel(status: AvailabilityStatus, language: Language) {
  const labels = translations[language];
  if (status === "in_stock") return labels.inStock;
  if (status === "low_stock") return labels.lowStock;
  if (status === "out_of_stock") return labels.outOfStock;
  return labels.unconfirmed;
}

function MapPreview({ language }: { language: Language }) {
  const t = translations[language];
  return (
    <div className="map-preview" aria-label="Illustrated Addis Ababa map preview">
      <div className="map-caption">
        <span className="map-caption-icon"><Icon name="pin" size={17} /></span>
        <div><strong>Addis Ababa</strong><span>Medicine access, made closer</span></div>
        <span className="map-live-dot" aria-hidden="true" />
      </div>
      <div className="map-canvas">
        <svg className="map-streets" viewBox="0 0 500 365" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-20 72 123 92l62-38 110 29 83-50 142 23M-12 266l122-72 91 10 67-72 103 31 141-70M73-20l34 111-19 71 54 75-12 143M263-15l-26 91 26 88-23 86 34 123M427-10l-52 109 15 76-47 90 18 118" />
          <path d="m-5 145 118-26 93 36 78-53 103 31 117-16M24 326l82-72 92 3 99-61 89 14 118-67" />
          <path className="map-road" d="m-12 214 127-43 101 13 90-52 113 35 103-42" />
        </svg>
        <div className="map-park park-a" />
        <div className="map-park park-b" />
        <div className="map-label label-one">BOLE</div>
        <div className="map-label label-two">KAZANCHIS</div>
        <div className="map-label label-three">PIASSA</div>
        <span className="map-store-dot store-a"><Icon name="cross" size={12} /></span>
        <span className="map-store-dot store-b"><Icon name="cross" size={12} /></span>
        <span className="map-store-dot store-c"><Icon name="cross" size={12} /></span>
        <span className="map-store-dot store-d"><Icon name="cross" size={12} /></span>
        <span className="map-home-dot"><Icon name="locate" size={17} /></span>
        <span className="map-radius radius-one" />
        <span className="map-radius radius-two" />
      </div>
      <div className="map-result-card">
        <div className="map-result-icon"><Icon name="capsule" size={20} /></div>
        <div className="map-result-copy"><strong>{language === "am" ? "በአቅራቢያ ያሉ ፋርማሲዎች" : "Nearby pharmacies"}</strong><span>{language === "am" ? "የአዲስ አበባ የሙከራ መረጃ" : "Across the Addis pilot area"}</span></div>
        <span className="map-result-count">12</span>
      </div>
      <div className="map-footnote"><span className="map-legend-dot" /> {t.demoTitle} · sample map view</div>
    </div>
  );
}

export function MedFinderApp() {
  const [language, setLanguage] = useState<Language>("en");
  const [query, setQuery] = useState("Metformin");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [matchedMedicines, setMatchedMedicines] = useState<Medicine[]>([]);
  const [suggestions, setSuggestions] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [radius, setRadius] = useState(8);
  const [location, setLocation] = useState(defaultLocation);
  const [locationName, setLocationName] = useState("Addis Ababa");
  const [reportingStock, setReportingStock] = useState<number | null>(null);
  const [reporting, setReporting] = useState<number | null>(null);
  const [reportedStocks, setReportedStocks] = useState<Set<number>>(new Set());
  const [reportError, setReportError] = useState<number | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const t = translations[language];

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          lat: String(location.latitude),
          lng: String(location.longitude),
          radius: String(radius),
        });
        const response = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
        const data = await response.json() as SearchResponse;
        if (!response.ok) throw new Error(data.error ?? "Search failed.");
        setResults(data.results ?? []);
        setMatchedMedicines(data.medicines ?? []);
        setSuggestions(data.suggestions ?? []);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Search could not be completed.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, location.latitude, location.longitude, radius]);

  const visibleResults = useMemo(() => results.filter((result) => {
    if (!onlyAvailable) return true;
    return result.availability === "in_stock" || result.availability === "low_stock";
  }), [results, onlyAvailable]);
  const availableCount = useMemo(() => results.filter((result) => result.availability === "in_stock" || result.availability === "low_stock").length, [results]);
  const chosenMedicine = matchedMedicines[0];

  function useMyLocation() {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage(t.locationError);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationName(language === "am" ? "አካባቢዬ" : "Your location");
      },
      () => setLocationMessage(t.locationError),
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 },
    );
  }

  async function sendReport(event: FormEvent<HTMLFormElement>, stockId: number) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "");
    setReporting(stockId);
    setReportError(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockId, reason }),
      });
      if (!response.ok) throw new Error("Report failed");
      setReportedStocks((previous) => new Set(previous).add(stockId));
      setReportingStock(null);
    } catch {
      setReportError(stockId);
    } finally {
      setReporting(null);
    }
  }

  return (
    <div className="site-shell">
      <div className="pilot-strip"><Icon name="alert" size={15} /><span><strong>{t.demoTitle}:</strong> {t.demoBody}</span></div>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="MedFinder home">
            <span className="brand-mark"><Icon name="pin" size={22} /><span>+</span></span>
            <span className="brand-name">medfinder<span>.</span><small>ADDIS ABABA</small></span>
          </Link>
          <nav className="main-nav" aria-label="Main navigation">
            <a className="nav-link active" href="#search">{t.find}</a>
            <Link className="nav-link" href="/pharmacy">{t.pharmacies}</Link>
          </nav>
          <div className="header-actions">
            <span className="city-chip"><Icon name="pin" size={15} /> Addis Ababa</span>
            <span className="header-divider" />
            <button className={`language-toggle ${language === "am" ? "is-amharic" : ""}`} type="button" onClick={() => setLanguage(language === "en" ? "am" : "en")} aria-label="Change language">
              <span>አ</span>{language === "en" ? "አማ" : "EN"}
            </button>
            <AuthNav />
            <Link className="header-dashboard" href="/pharmacy"><Icon name="store" size={17} /><span>{t.openPharmacy}</span><Icon name="arrow" size={15} /></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section" id="search">
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line" />{t.heroEyebrow}</div>
              <h1>{t.heroTitle}</h1>
              <p className="hero-description">{t.heroBody}</p>
              <form className="medicine-search" onSubmit={(event) => { event.preventDefault(); setQuery((event.currentTarget.elements.namedItem("medicine") as HTMLInputElement).value); }}>
                <Icon name="search" size={22} />
                <input
                  name="medicine"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  aria-label={t.searchPlaceholder}
                  autoComplete="off"
                />
                {query && <button className="search-clear" type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={17} /></button>}
                <button className="search-submit" type="submit">{t.searchButton}<Icon name="arrow" size={17} /></button>
              </form>
              <div className="search-under-row">
                <button className="use-location" type="button" onClick={useMyLocation}><Icon name="locate" size={16} />{t.nearMe}</button>
                <span className="location-current"><Icon name="pin" size={13} />{locationName}</span>
              </div>
              {locationMessage && <div className="location-note" role="status">{locationMessage}</div>}
              <div className="popular-searches"><span>{t.popular}</span>{["Amoxicillin", "Ventolin", "Amlodipine"].map((item) => <button type="button" key={item} onClick={() => setQuery(item)}>{item}<Icon name="arrow" size={13} /></button>)}</div>
              <div className="hero-trust-row"><span><Icon name="shield" size={17} /> Licensed pharmacies</span><span><Icon name="clock" size={16} /> Freshness shown</span><span><Icon name="heart" size={16} /> Free for patients</span></div>
            </div>
            <div className="hero-visual"><MapPreview language={language} /><div className="floating-note"><span className="floating-note-icon"><Icon name="clock" size={17} /></span><span><strong>Every update counts</strong><small>See when stock was confirmed</small></span><span className="floating-check"><Icon name="check" size={14} /></span></div></div>
            <div className="hero-backdrop-shape shape-one" /><div className="hero-backdrop-shape shape-two" />
          </div>
        </section>

        <section className="results-section" id="results">
          <div className="section-container">
            <div className="results-heading-row">
              <div className="results-heading-copy">
                <div className="section-kicker"><span className="section-kicker-dot" />{t.resultsSub}</div>
                <h2>{t.resultsTitle}</h2>
                <p className="results-query-line">{t.showing} <strong>{chosenMedicine ? `${chosenMedicine.genericName} ${chosenMedicine.strength}` : query.trim() || "—"}</strong>{chosenMedicine?.brandNames?.length ? <span> · {chosenMedicine.brandNames[0]}</span> : null}</p>
              </div>
              <div className="results-controls">
                <button type="button" className="radius-button" onClick={() => setRadius((current) => current === 8 ? 5 : current === 5 ? 12 : 8)} title={`${t.radius}: ${radius} ${t.km}`}><Icon name="sliders" size={16} /><span>{t.radius}</span><strong>{radius} {t.km}</strong></button>
                <select className="radius-select" value={radius} onChange={(event) => setRadius(Number(event.target.value))} aria-label={t.radius}>
                  {[3, 5, 8, 12, 20].map((distance) => <option key={distance} value={distance}>{distance} {t.km}</option>)}
                </select>
              </div>
            </div>

            <div className="results-toolbar">
              <div className="results-tabs" role="tablist" aria-label="Availability filter">
                <button type="button" role="tab" aria-selected={onlyAvailable} className={onlyAvailable ? "selected" : ""} onClick={() => setOnlyAvailable(true)}>{t.availableOnly}<span>{availableCount}</span></button>
                <button type="button" role="tab" aria-selected={!onlyAvailable} className={!onlyAvailable ? "selected" : ""} onClick={() => setOnlyAvailable(false)}>{t.allNearby}<span>{results.length}</span></button>
              </div>
              <span className="result-count"><span className="result-live-dot" />{visibleResults.length} {t.resultCount} · {radius} {t.km}</span>
            </div>

            {error && <div className="error-banner" role="alert"><Icon name="alert" size={18} />{error}</div>}
            {loading && results.length === 0 && <div className="loading-panel"><span className="loading-spinner" />{t.loading}</div>}
            {!loading && !error && query.trim() && matchedMedicines.length === 0 && (
              <div className="empty-results"><span className="empty-icon"><Icon name="search" size={24} /></span><div><strong>{t.noResults}</strong><p>{t.tryAnother}</p>{suggestions.length > 0 && <div className="suggestion-row"><span>{t.suggestions}</span>{suggestions.slice(0, 3).map((suggestion) => <button key={suggestion.id} type="button" onClick={() => setQuery(suggestion.genericName)}>{suggestion.genericName}</button>)}</div>}</div></div>
            )}
            {!loading && matchedMedicines.length > 0 && visibleResults.length === 0 && (
              <div className="empty-results"><span className="empty-icon"><Icon name="alert" size={24} /></span><div><strong>{t.noAvailable}</strong><p>{t.tryAnother}</p>{onlyAvailable && <button className="inline-link-button" type="button" onClick={() => setOnlyAvailable(false)}>{t.tryAll} <Icon name="arrow" size={15} /></button>}</div></div>
            )}

            <div className={`pharmacy-results ${loading ? "is-loading" : ""}`}>
              {visibleResults.map((result, index) => {
                const isAvailable = result.availability === "in_stock" || result.availability === "low_stock";
                const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}`;
                return (
                  <article className="pharmacy-card" key={result.stockId}>
                    <div className="result-order">{String(index + 1).padStart(2, "0")}</div>
                    <div className="pharmacy-avatar"><Icon name="store" size={21} /></div>
                    <div className="pharmacy-main">
                      <div className="pharmacy-title-line"><h3>{result.pharmacyName}</h3><span className="sample-tag"><Icon name="shield" size={13} />{t.verified}</span></div>
                      <div className="pharmacy-address"><Icon name="pin" size={14} />{result.address}</div>
                      <div className="pharmacy-meta"><span><Icon name="clock" size={14} />{t.hours}: {result.hours}</span><span className="meta-dot" /><span>{result.area}</span></div>
                      {reportedStocks.has(result.stockId) && <div className="report-success"><Icon name="check" size={14} />{t.reportingSent}</div>}
                      {reportError === result.stockId && <div className="report-error" role="alert">{t.sendError}</div>}
                      {reportingStock === result.stockId && !reportedStocks.has(result.stockId) && (
                        <form className="report-form" onSubmit={(event) => sendReport(event, result.stockId)}>
                          <label htmlFor={`reason-${result.stockId}`}>{t.reportReason}</label>
                          <select id={`reason-${result.stockId}`} name="reason" defaultValue="The pharmacy says this is out of stock">
                            <option>The pharmacy says this is out of stock</option>
                            <option>The medicine or strength is different</option>
                            <option>The pharmacy could not be reached</option>
                            <option>Other availability issue</option>
                          </select>
                          <button type="submit" disabled={reporting === result.stockId}>{reporting === result.stockId ? "…" : t.sendReport}</button>
                          <button type="button" className="report-cancel" onClick={() => setReportingStock(null)}>{t.cancel}</button>
                        </form>
                      )}
                    </div>
                    <div className="pharmacy-availability">
                      <span className={`availability-badge status-${result.availability}`}><span className="availability-dot" />{statusLabel(result.availability, language)}</span>
                      <span className="freshness-label"><Icon name="clock" size={13} />{t.freshness} {timeAgo(result.lastConfirmedAt)}</span>
                      <span className="distance-label"><Icon name="pin" size={13} />{result.distanceKm.toFixed(1)} {t.km}</span>
                    </div>
                    <div className="pharmacy-actions">
                      <a className={`action-call ${!isAvailable ? "action-call-muted" : ""}`} href={`tel:${result.phone.replace(/\s/g, "")}`}><Icon name="phone" size={16} />{t.call}</a>
                      <a className="action-directions" href={directionsUrl} target="_blank" rel="noreferrer" aria-label={`${t.directions} to ${result.pharmacyName}`}><Icon name="directions" size={17} />{t.directions}</a>
                      {!reportedStocks.has(result.stockId) && reportingStock !== result.stockId && <button className="action-report" type="button" onClick={() => setReportingStock(result.stockId)} aria-label={`${t.report} for ${result.pharmacyName}`}><Icon name="report" size={15} /><span>{t.report}</span></button>}
                    </div>
                  </article>
                );
              })}
            </div>
            {loading && results.length > 0 && <div className="refreshing-note"><span className="loading-spinner small-spinner" />{t.loading}</div>}

            <div className="freshness-note"><span className="freshness-note-icon"><Icon name="clock" size={18} /></span><div><strong>{t.fresh}</strong><p>{t.freshnessCopy} {t.demoBody}</p></div><span className="freshness-window">24h</span></div>
          </div>
        </section>

        <section className="how-section">
          <div className="section-container">
            <div className="how-heading"><div className="section-kicker"><span className="section-kicker-dot" />{language === "am" ? "ለመጠቀም ቀላል" : "SIMPLE BY DESIGN"}</div><h2>{t.how}</h2><p>{t.howBody}</p></div>
            <div className="steps-grid">
              <article className="step-card"><span className="step-number">01</span><span className="step-icon step-icon-search"><Icon name="search" size={23} /></span><h3>{t.stepOne}</h3><p>{t.stepOneBody}</p><span className="step-dash" /></article>
              <article className="step-card"><span className="step-number">02</span><span className="step-icon step-icon-map"><Icon name="pin" size={23} /></span><h3>{t.stepTwo}</h3><p>{t.stepTwoBody}</p><span className="step-dash" /></article>
              <article className="step-card"><span className="step-number">03</span><span className="step-icon step-icon-call"><Icon name="phone" size={22} /></span><h3>{t.stepThree}</h3><p>{t.stepThreeBody}</p><span className="step-dash" /></article>
            </div>
          </div>
        </section>

        <section className="safety-section">
          <div className="section-container"><div className="safety-card"><span className="safety-icon"><Icon name="shield" size={23} /></span><div><h2>{t.safety}</h2><p>{t.safetyBody}</p></div><span className="safety-spark"><Icon name="sparkle" size={24} /></span></div></div>
        </section>
      </main>

      <footer className="site-footer"><div className="section-container footer-inner"><Link className="brand footer-brand" href="/"><span className="brand-mark"><Icon name="pin" size={20} /><span>+</span></span><span className="brand-name">medfinder<span>.</span><small>ADDIS ABABA</small></span></Link><div className="footer-center"><span>{t.footer}</span><span>{t.privacy}</span></div><div className="footer-links"><Link href="/pharmacy">{t.pharmacies}</Link><a href="#search">{t.find}</a></div></div><div className="section-container footer-disclaimer">Availability shown is a sample for product demonstration only. Always verify with a licensed pharmacy. MedFinder does not provide diagnosis, treatment, or dosage recommendations.</div></footer>
    </div>
  );
}
