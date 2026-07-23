import { useState, useEffect, useCallback } from "react";

const DEAL_TYPES = [
  { value: "newbusiness", label: "New Business" },
  { value: "existingbusiness", label: "Existing Business" },
];

const STEP_LABELS = ["Deal Details", "Contact & Owner", "Notes & Timeline", "Review & Submit"];
const G = "#ff7a59", DG = "#e8603c", LG = "#fff5f2", BR = "#ffd6cc", TX = "#33475b", MU = "#7c98b6";

const base = { width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${BR}`, background: "#fffaf8", fontSize: "14px", fontFamily: "inherit", color: TX, boxSizing: "border-box", outline: "none" };

function hsHeaders(token) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

function StepBar({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "30px" }}>
      {STEP_LABELS.map((label, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? DG : active ? G : "#fff0eb", border: `2px solid ${done ? DG : active ? G : BR}`, boxShadow: active ? "0 0 0 4px rgba(255,122,89,0.15)" : "none" }}>
                {done
                  ? <svg width="13" height="13" viewBox="0 0 13 13"><path d="M2 6.5l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                  : <span style={{ fontSize: "11px", fontWeight: "700", color: active ? "white" : MU }}>{i + 1}</span>}
              </div>
              <span style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase", color: active ? G : done ? DG : MU, whiteSpace: "nowrap" }}>{label}</span>
            </div>
            {i < 3 && <div style={{ flex: 1, height: "2px", background: done ? G : "#ffe8e0", margin: "0 6px", marginBottom: "20px" }} />}
          </div>
        );
      })}
    </div>
  );
}

function F({ label, req, hint, err, children }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ fontSize: "11px", fontWeight: "700", color: "#5a3e2b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
        {label} {req && <span style={{ color: "#c04040" }}>*</span>}
      </div>
      {children}
      {err && <div style={{ color: "#c04040", fontSize: "11px", marginTop: "4px" }}>{err}</div>}
      {hint && <div style={{ color: MU, fontSize: "11px", marginTop: "4px", fontStyle: "italic" }}>{hint}</div>}
    </div>
  );
}

const sel = (err) => ({ ...base, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M1 3l4 4 4-4' stroke='%237c98b6' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "32px", border: `1.5px solid ${err ? "#c04040" : BR}` });

export default function HubSpotDealCreator() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    dealName: "", pipeline: "", dealStage: "", amount: "", dealType: "",
    contactEmail: "", contactFirstName: "", contactLastName: "", contactCompany: "", contactPhone: "",
    ownerId: "", closeDate: "", description: "", priority: "",
  });
  const [errors, setErrors] = useState({});
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("hs_access_token") || "");
  const [portalId, setPortalId] = useState(() => localStorage.getItem("hs_portal_id") || "");
  const [proxyUrl, setProxyUrl] = useState(() => localStorage.getItem("hs_proxy_url") || "");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({ token: "", portal: "", proxy: "" });

  const configured = accessToken && portalId;

  function apiUrl(path) {
    const base = proxyUrl ? proxyUrl.replace(/\/+$/, "") : "https://api.hubapi.com";
    return `${base}${path}`;
  }

  function saveSettings(token, portal, proxy) {
    const t = token.trim(), p = portal.trim(), px = proxy.trim();
    setAccessToken(t); setPortalId(p); setProxyUrl(px);
    if (t) localStorage.setItem("hs_access_token", t); else localStorage.removeItem("hs_access_token");
    if (p) localStorage.setItem("hs_portal_id", p); else localStorage.removeItem("hs_portal_id");
    if (px) localStorage.setItem("hs_proxy_url", px); else localStorage.removeItem("hs_proxy_url");
    setShowSettings(false);
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })); }

  const loadPipelines = useCallback(async () => {
    if (!configured) return;
    setLoadingPipelines(true);
    try {
      const r = await fetch(apiUrl("/crm/v3/pipelines/deals"), { headers: hsHeaders(accessToken) });
      const d = await r.json();
      const pls = (d.results || []).map(p => ({ id: p.id, label: p.label, stages: (p.stages || []).map(s => ({ id: s.id, label: s.label })) }));
      setPipelines(pls);
      if (pls.length > 0 && !form.pipeline) {
        set("pipeline", pls[0].id);
        setStages(pls[0].stages);
        if (pls[0].stages.length > 0) set("dealStage", pls[0].stages[0].id);
      }
    } catch (e) { console.error("Failed to load pipelines:", e); }
    setLoadingPipelines(false);
  }, [configured, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOwners = useCallback(async () => {
    if (!configured) return;
    setLoadingOwners(true);
    try {
      const r = await fetch(apiUrl("/crm/v3/owners/?limit=100"), { headers: hsHeaders(accessToken) });
      const d = await r.json();
      setOwners((d.results || []).map(o => ({ id: o.id, name: `${o.firstName || ""} ${o.lastName || ""}`.trim() || o.email })).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) { console.error("Failed to load owners:", e); }
    setLoadingOwners(false);
  }, [configured, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (configured) { loadPipelines(); loadOwners(); }
  }, [configured, loadPipelines, loadOwners]);

  function onPipelineChange(pid) {
    set("pipeline", pid);
    const pl = pipelines.find(p => p.id === pid);
    const st = pl ? pl.stages : [];
    setStages(st);
    set("dealStage", st.length > 0 ? st[0].id : "");
  }

  function validate(s) {
    const e = {};
    if (s === 0) {
      if (!form.dealName.trim()) e.dealName = "Required";
      if (!form.pipeline) e.pipeline = "Required";
      if (!form.dealStage) e.dealStage = "Required";
    }
    if (s === 1) {
      if (!form.contactEmail.trim() && !form.contactFirstName.trim() && !form.contactLastName.trim()) {
        // Contact is optional but if any field is filled, email is required
      }
      if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
        e.contactEmail = "Invalid email format";
      }
    }
    if (s === 2) {
      if (!form.closeDate) e.closeDate = "Required";
    }
    setErrors(e); return Object.keys(e).length === 0;
  }

  function next() { if (validate(step)) setStep(s => s + 1); }
  function back() { setStep(s => s - 1); }

  async function submit() {
    setSubmitting(true);
    try {
      let contactId = null;

      if (form.contactEmail.trim()) {
        const contactBody = {
          properties: {
            email: form.contactEmail,
            firstname: form.contactFirstName,
            lastname: form.contactLastName,
            company: form.contactCompany,
            phone: form.contactPhone,
          }
        };

        try {
          const searchR = await fetch(apiUrl("/crm/v3/objects/contacts/search"), {
            method: "POST",
            headers: hsHeaders(accessToken),
            body: JSON.stringify({ filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: form.contactEmail }] }] }),
          });
          const searchD = await searchR.json();
          if (searchD.results && searchD.results.length > 0) {
            contactId = searchD.results[0].id;
          }
        } catch (e) { /* Contact search failed, try creating */ }

        if (!contactId) {
          const cR = await fetch(apiUrl("/crm/v3/objects/contacts"), {
            method: "POST",
            headers: hsHeaders(accessToken),
            body: JSON.stringify(contactBody),
          });
          if (cR.ok) {
            const cD = await cR.json();
            contactId = cD.id;
          }
        }
      }

      const dealBody = {
        properties: {
          dealname: form.dealName,
          pipeline: form.pipeline,
          dealstage: form.dealStage,
          amount: form.amount || undefined,
          dealtype: form.dealType || undefined,
          closedate: form.closeDate ? new Date(form.closeDate).toISOString() : undefined,
          hubspot_owner_id: form.ownerId || undefined,
          description: form.description || undefined,
          hs_priority: form.priority || undefined,
        },
      };

      if (contactId) {
        dealBody.associations = [{
          to: { id: contactId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
        }];
      }

      const r = await fetch(apiUrl("/crm/v3/objects/deals"), {
        method: "POST",
        headers: hsHeaders(accessToken),
        body: JSON.stringify(dealBody),
      });

      if (!r.ok) {
        const errText = await r.text();
        throw new Error(`HTTP ${r.status}: ${errText}`);
      }

      const d = await r.json();
      const dealId = d.id;
      const url = dealId ? `https://app.hubspot.com/contacts/${portalId}/deal/${dealId}` : null;
      setResult({ ok: true, url });
    } catch (e) { setResult({ ok: false, error: String(e) }); }
    setSubmitting(false);
  }

  const plName = pipelines.find(p => p.id === form.pipeline)?.label || "";
  const stName = stages.find(s => s.id === form.dealStage)?.label || "";
  const owName = owners.find(o => String(o.id) === String(form.ownerId))?.name || "";

  const settingsBar = (
    <div style={{ marginBottom: "16px" }}>
      {!configured ? (
        <div style={{ background: "#fff8f0", border: "1.5px solid #f0c878", borderRadius: "12px", padding: "18px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#8a6020", marginBottom: "12px", textAlign: "center" }}>Connect to HubSpot</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "420px", margin: "0 auto" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: TX, whiteSpace: "nowrap", minWidth: "100px" }}>Portal ID</span>
              <input value={settingsDraft.portal || portalId} onChange={e => setSettingsDraft(d => ({ ...d, portal: e.target.value }))}
                placeholder="e.g. 12345678" style={{ ...base, flex: 1, border: "1.5px solid #f0c878", background: "white", fontSize: "13px" }} />
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: TX, whiteSpace: "nowrap", minWidth: "100px" }}>Access Token</span>
              <input type="password" value={settingsDraft.token || accessToken} onChange={e => setSettingsDraft(d => ({ ...d, token: e.target.value }))}
                placeholder="Private app access token" style={{ ...base, flex: 1, border: "1.5px solid #f0c878", background: "white", fontSize: "13px" }} />
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: TX, whiteSpace: "nowrap", minWidth: "100px" }}>Proxy URL</span>
              <input value={settingsDraft.proxy || proxyUrl} onChange={e => setSettingsDraft(d => ({ ...d, proxy: e.target.value }))}
                placeholder="Optional CORS proxy URL" style={{ ...base, flex: 1, border: "1.5px solid #f0c878", background: "white", fontSize: "13px" }} />
            </div>
            <button onClick={() => saveSettings(settingsDraft.token || accessToken, settingsDraft.portal || portalId, settingsDraft.proxy || proxyUrl)}
              style={{ marginTop: "4px", padding: "10px", background: `linear-gradient(135deg,${G},${DG})`, border: "none", borderRadius: "8px", color: "white", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
              Connect
            </button>
          </div>
          <div style={{ fontSize: "11px", color: "#b08030", marginTop: "8px", textAlign: "center" }}>
            Settings → Integrations → Private Apps → Create/Select App → Access Token
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => { setSettingsDraft({ token: accessToken, portal: portalId, proxy: proxyUrl }); setShowSettings(!showSettings); }}
            style={{ padding: "5px 12px", background: LG, border: `1.5px solid ${BR}`, borderRadius: "6px", color: G, fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
            {showSettings ? "Hide" : `⚙ Portal ${portalId}`}
          </button>
        </div>
      )}
      {showSettings && configured && (
        <div style={{ marginTop: "8px", background: "#fffaf8", border: `1.5px solid ${BR}`, borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: TX, whiteSpace: "nowrap", minWidth: "100px" }}>Portal ID</span>
            <input value={settingsDraft.portal} onChange={e => setSettingsDraft(d => ({ ...d, portal: e.target.value }))}
              style={{ ...base, flex: 1, fontSize: "13px" }} />
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: TX, whiteSpace: "nowrap", minWidth: "100px" }}>Access Token</span>
            <input type="password" value={settingsDraft.token} onChange={e => setSettingsDraft(d => ({ ...d, token: e.target.value }))}
              style={{ ...base, flex: 1, fontSize: "13px" }} />
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: TX, whiteSpace: "nowrap", minWidth: "100px" }}>Proxy URL</span>
            <input value={settingsDraft.proxy} onChange={e => setSettingsDraft(d => ({ ...d, proxy: e.target.value }))}
              style={{ ...base, flex: 1, fontSize: "13px" }} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => saveSettings(settingsDraft.token, settingsDraft.portal, settingsDraft.proxy)}
              style={{ padding: "8px 16px", background: G, border: "none", borderRadius: "8px", color: "white", fontWeight: "600", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>Save</button>
            <button onClick={() => { saveSettings("", "", ""); setPipelines([]); setStages([]); setOwners([]); }}
              style={{ padding: "8px 16px", background: "#fff0f0", border: "1.5px solid #ffb0b0", borderRadius: "8px", color: "#c04040", fontWeight: "600", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>Disconnect</button>
          </div>
        </div>
      )}
    </div>
  );

  if (result?.ok) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#fff5f2,#ffe8e0)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: "24px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <div style={{ background: "white", borderRadius: "20px", padding: "48px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(232,96,60,0.12)" }}>
        <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: `linear-gradient(135deg,${G},${DG})`, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(232,96,60,0.3)" }}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none"><path d="M5 15L11 21L25 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: "700", color: TX, margin: "0 0 8px" }}>Deal Created!</h2>
        <p style={{ color: MU, fontSize: "14px", margin: "0 0 24px" }}><strong style={{ color: TX }}>{form.dealName}</strong><br />added to HubSpot successfully.</p>
        {result.url && <a href={result.url} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "9px 22px", background: LG, borderRadius: "8px", color: G, fontWeight: "600", fontSize: "13px", textDecoration: "none", border: `1.5px solid ${BR}`, marginBottom: "16px" }}>View in HubSpot →</a>}
        <br />
        <button onClick={() => { setResult(null); setStep(0); setForm({ dealName: "", pipeline: "", dealStage: "", amount: "", dealType: "", contactEmail: "", contactFirstName: "", contactLastName: "", contactCompany: "", contactPhone: "", ownerId: "", closeDate: "", description: "", priority: "" }); }}
          style={{ marginTop: "12px", padding: "11px 28px", background: `linear-gradient(135deg,${G},${DG})`, color: "white", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}>
          + Create Another
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#fff5f2,#ffe8e0 60%,#fffaf8)", fontFamily: "'DM Sans',sans-serif", padding: "28px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box}
        input:focus,select:focus,textarea:focus{border-color:${G}!important;box-shadow:0 0 0 3px rgba(255,122,89,.12)!important;outline:none!important}
        button{transition:opacity .15s,transform .15s}
        button:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: `linear-gradient(135deg,${G},${DG})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(232,96,60,.25)", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 6.5V4.5C11.5 3.4 10.6 2.5 9.5 2.5H9C8.2 2.5 7.5 3 7.2 3.7L7 4.2C6.7 3 5.6 2 4.3 2C2.7 2 1.5 3.2 1.5 4.8V7.5C1.5 10 3.5 12 6 12H8.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" /><circle cx="12" cy="10" r="3" stroke="white" strokeWidth="1.3" /><path d="M12 8.5V11.5" stroke="white" strokeWidth="1" strokeLinecap="round" /><path d="M10.5 10H13.5" stroke="white" strokeWidth="1" strokeLinecap="round" /></svg>
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: TX, lineHeight: 1.2 }}>New Deal</div>
            <div style={{ fontSize: "12px", color: MU }}>Create a deal in HubSpot</div>
          </div>
        </div>

        {settingsBar}

        <div style={{ background: "white", borderRadius: "18px", padding: "28px", boxShadow: "0 8px 40px rgba(232,96,60,.09)", border: "1px solid rgba(255,214,204,.5)" }}>
          <StepBar current={step} />

          {step === 0 && (
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", color: TX, margin: "0 0 14px" }}>Deal Details</h2>
              <F label="Deal Name" req err={errors.dealName}>
                <input value={form.dealName} onChange={e => set("dealName", e.target.value)} placeholder="e.g. Acme Corp - Enterprise Plan" style={{ ...base, border: `1.5px solid ${errors.dealName ? "#c04040" : BR}` }} />
              </F>
              <F label="Pipeline" req err={errors.pipeline}>
                {loadingPipelines
                  ? <div style={{ ...base, color: MU, display: "flex", alignItems: "center", gap: "8px" }}><div style={{ width: "13px", height: "13px", border: `2px solid ${BR}`, borderTopColor: G, borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />Loading pipelines...</div>
                  : <select value={form.pipeline} onChange={e => onPipelineChange(e.target.value)} style={sel(errors.pipeline)}>
                    <option value="">{!configured ? "Connect to HubSpot first..." : "Select pipeline..."}</option>
                    {pipelines.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                }
              </F>
              <F label="Deal Stage" req err={errors.dealStage}>
                <select value={form.dealStage} onChange={e => set("dealStage", e.target.value)} disabled={!form.pipeline} style={{ ...sel(errors.dealStage), opacity: !form.pipeline ? 0.55 : 1 }}>
                  <option value="">{!form.pipeline ? "Select a pipeline first..." : stages.length === 0 ? "No stages found" : "Select stage..."}</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </F>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <F label="Amount" hint="Deal value in currency">
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="e.g. 10000" style={{ ...base }} />
                </F>
                <F label="Deal Type">
                  <select value={form.dealType} onChange={e => set("dealType", e.target.value)} style={sel()}>
                    <option value="">Select type...</option>
                    {DEAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </F>
              </div>
              <F label="Priority">
                <div style={{ display: "flex", gap: "8px" }}>
                  {[["low", "Low", "#7aaa8f", "#f0f9f4"], ["medium", "Medium", "#c07020", "#fff8f0"], ["high", "High", "#c04040", "#fff0f0"]].map(([val, lbl, accent, bg]) => (
                    <button key={val} onClick={() => set("priority", val)} style={{ flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600", fontSize: "13px", background: form.priority === val ? accent : bg, color: form.priority === val ? "white" : accent, border: `1.5px solid ${form.priority === val ? accent : BR}` }}>{lbl}</button>
                  ))}
                </div>
              </F>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", color: TX, margin: "0 0 4px" }}>Contact & Owner</h2>
              <p style={{ fontSize: "12px", color: MU, fontStyle: "italic", margin: "0 0 14px" }}>
                Associate a contact with this deal (optional). If the contact exists it will be linked; otherwise a new contact is created.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <F label="First Name">
                  <input value={form.contactFirstName} onChange={e => set("contactFirstName", e.target.value)} placeholder="e.g. John" style={{ ...base }} />
                </F>
                <F label="Last Name">
                  <input value={form.contactLastName} onChange={e => set("contactLastName", e.target.value)} placeholder="e.g. Doe" style={{ ...base }} />
                </F>
              </div>
              <F label="Email" err={errors.contactEmail} hint="Used to find or create the contact">
                <input type="email" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="e.g. john@acme.com" style={{ ...base, border: `1.5px solid ${errors.contactEmail ? "#c04040" : BR}` }} />
              </F>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <F label="Company">
                  <input value={form.contactCompany} onChange={e => set("contactCompany", e.target.value)} placeholder="e.g. Acme Corp" style={{ ...base }} />
                </F>
                <F label="Phone">
                  <input value={form.contactPhone} onChange={e => set("contactPhone", e.target.value)} placeholder="e.g. +1-555-0100" style={{ ...base }} />
                </F>
              </div>
              <div style={{ borderTop: "1px solid #ffe8e0", marginTop: "8px", paddingTop: "18px" }}>
                <F label="Deal Owner" err={errors.ownerId}>
                  {loadingOwners
                    ? <div style={{ ...base, color: MU, display: "flex", alignItems: "center", gap: "8px" }}><div style={{ width: "13px", height: "13px", border: `2px solid ${BR}`, borderTopColor: G, borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />Loading owners...</div>
                    : <select value={form.ownerId} onChange={e => set("ownerId", e.target.value)} style={sel(errors.ownerId)}>
                      <option value="">Select owner...</option>
                      {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  }
                </F>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", color: TX, margin: "0 0 14px" }}>Notes & Timeline</h2>
              <F label="Close Date" req err={errors.closeDate}>
                <input type="date" value={form.closeDate} onChange={e => set("closeDate", e.target.value)} style={{ ...base, border: `1.5px solid ${errors.closeDate ? "#c04040" : BR}` }} />
              </F>
              <F label="Description / Notes" hint="Internal notes about this deal">
                <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={8}
                  placeholder="Add context about this deal, next steps, key contacts, etc."
                  style={{ ...base, resize: "vertical", lineHeight: "1.6", fontFamily: "'DM Mono',monospace", fontSize: "12.5px" }} />
              </F>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", color: TX, margin: "0 0 16px" }}>Review & Submit</h2>
              <div style={{ background: "#fffaf8", borderRadius: "12px", padding: "18px" }}>
                {[
                  ["Deal Name", form.dealName],
                  ["Pipeline", plName],
                  ["Stage", stName],
                  ["Amount", form.amount ? `$${Number(form.amount).toLocaleString()}` : ""],
                  ["Deal Type", DEAL_TYPES.find(t => t.value === form.dealType)?.label || ""],
                  ["Priority", form.priority ? form.priority[0].toUpperCase() + form.priority.slice(1) : ""],
                  ["Contact", [form.contactFirstName, form.contactLastName].filter(Boolean).join(" ")],
                  ["Contact Email", form.contactEmail],
                  ["Company", form.contactCompany],
                  ["Owner", owName],
                  ["Close Date", form.closeDate],
                ].map(([lbl, val]) => val ? (
                  <div key={lbl} style={{ display: "flex", gap: "14px", padding: "7px 0", borderBottom: "1px solid #ffe8e0" }}>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: MU, textTransform: "uppercase", letterSpacing: "0.07em", minWidth: "95px", paddingTop: "2px" }}>{lbl}</span>
                    <span style={{ fontSize: "13px", color: TX, flex: 1 }}>{val}</span>
                  </div>
                ) : null)}
                {form.description && (
                  <div style={{ paddingTop: "8px" }}>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: MU, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>Description</span>
                    <pre style={{ fontSize: "12px", color: TX, fontFamily: "'DM Mono',monospace", whiteSpace: "pre-wrap", margin: 0, lineHeight: "1.5", maxHeight: "150px", overflowY: "auto" }}>{form.description}</pre>
                  </div>
                )}
              </div>
              {result?.error && <div style={{ marginTop: "12px", padding: "10px 14px", background: "#fff0f0", border: "1.5px solid #ffb0b0", borderRadius: "8px", color: "#c04040", fontSize: "13px" }}>Error: {result.error}</div>}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "22px", paddingTop: "16px", borderTop: "1px solid #ffe8e0" }}>
            <button onClick={back} disabled={step === 0} style={{ padding: "10px 22px", background: step === 0 ? "#fffaf8" : "#ffe8e0", border: `1.5px solid ${BR}`, borderRadius: "9px", color: step === 0 ? BR : G, fontWeight: "600", fontSize: "14px", cursor: step === 0 ? "default" : "pointer", fontFamily: "inherit" }}>← Back</button>
            {step < 3
              ? <button onClick={next} style={{ padding: "10px 26px", background: `linear-gradient(135deg,${G},${DG})`, border: "none", borderRadius: "9px", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(232,96,60,.22)" }}>Continue →</button>
              : <button onClick={submit} disabled={submitting || !configured} style={{ padding: "11px 28px", background: (submitting || !configured) ? BR : `linear-gradient(135deg,${G},${DG})`, border: "none", borderRadius: "9px", color: "white", fontWeight: "700", fontSize: "14px", cursor: (submitting || !configured) ? "default" : "pointer", fontFamily: "inherit", boxShadow: (submitting || !configured) ? "none" : "0 4px 14px rgba(232,96,60,.22)", display: "flex", alignItems: "center", gap: "8px" }}>
                {submitting ? <><div style={{ width: "13px", height: "13px", border: "2px solid rgba(255,255,255,.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Creating...</> : "✓ Create in HubSpot"}
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
