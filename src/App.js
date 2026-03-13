import { useState, useEffect } from "react";

const USERS = [
  { id: 708003, name: "Artium Koner" },
  { id: 708202, name: "Michael Abramson" },
  { id: 708244, name: "Ran Arnon" },
  { id: 712388, name: "Amit Maimon" },
  { id: 725037, name: "Dana Carmiel Shterman" },
  { id: 727409, name: "Ofek Hacohen" },
];

const DESC_TEMPLATES = {
  "Small Task": `Why are we doing this and what's the goal?
[Explain the reason and expected outcome]

Execution approach (if needed):
[How will this be done?]

QA approach (if needed):
[How will we verify it works?]

Urgency or Due date (if needed):
[Any deadline or urgency notes]`,
  "Medium Task": `1. Context & Goal
What is the outcome we want? Why is this task needed?
[Describe the goal and current pain point]

2. Approach & Key Considerations
- What approaches/systems can we use? (make.com, native, manual, etc.)
- Selected approach and why:
- Edge cases or risks:
- What must be confirmed before/after implementation?

3. Execution Plan
Step 1: [First step]
Step 2: [Second step]
Step 3: [Continue...]

4. QA
How and who will test and confirm this works as expected?

5. Links
[Relevant documents, workflows, diagrams]`,
  "Project": `High Level Description & Opportunity
Description: [A high level description of the idea, the need, and what it is going to solve]
Impact: [Expected business impact]

Specification
1. Understand current state
2. [Define scope and channels]
3. Define documentation needs
4. Define training needs
5. Define rollout plan
6. Validate spec with client

Implementation Approach
Phases:
- Phase 1: Implementation
- Phase 2: Documentation & Q&A
- Phase 3: Training and Rollout
- Phase 4: Maintenance

Links / Assets:
[Relevant documents, diagrams, references]`,
};

const STEP_LABELS = ["Task Details", "Assignment & Timeline", "Description", "Review & Submit"];
const G = "#1a7a56", DG = "#0e6245", LG = "#f0f9f4", BR = "#c5ddd0", TX = "#1a3329", MU = "#7aaa8f";

const base = { width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${BR}`, background: "#f7fbf9", fontSize: "14px", fontFamily: "inherit", color: TX, boxSizing: "border-box", outline: "none" };

function twHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Basic ${btoa(apiKey + ":x")}`,
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
              <div style={{ width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? DG : active ? G : "#e8f4ee", border: `2px solid ${done ? DG : active ? G : BR}`, boxShadow: active ? "0 0 0 4px rgba(26,122,86,0.15)" : "none" }}>
                {done
                  ? <svg width="13" height="13" viewBox="0 0 13 13"><path d="M2 6.5l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  : <span style={{ fontSize: "11px", fontWeight: "700", color: active ? "white" : MU }}>{i + 1}</span>}
              </div>
              <span style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase", color: active ? G : done ? DG : MU, whiteSpace: "nowrap" }}>{label}</span>
            </div>
            {i < 3 && <div style={{ flex: 1, height: "2px", background: done ? G : "#dceee6", margin: "0 6px", marginBottom: "20px" }} />}
          </div>
        );
      })}
    </div>
  );
}

function F({ label, req, hint, err, children }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ fontSize: "11px", fontWeight: "700", color: "#2d5a45", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
        {label} {req && <span style={{ color: "#c04040" }}>*</span>}
      </div>
      {children}
      {err && <div style={{ color: "#c04040", fontSize: "11px", marginTop: "4px" }}>{err}</div>}
      {hint && <div style={{ color: MU, fontSize: "11px", marginTop: "4px", fontStyle: "italic" }}>{hint}</div>}
    </div>
  );
}

const sel = (err) => ({ ...base, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M1 3l4 4 4-4' stroke='%237aaa8f' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "32px", border: `1.5px solid ${err ? "#c04040" : BR}` });

export default function TaskCreator() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ taskName: "", taskType: "", priority: "", project: "", taskList: "", assignedTo: "", startDate: "", dueDate: "", estimateHours: "", estimateLow: "", estimateHigh: "", difficulty: "", department: "", description: "" });
  const [errors, setErrors] = useState({});
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [taskLists, setTaskLists] = useState([]);
  const [loadingTL, setLoadingTL] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("tw_api_key") || "");
  const [subdomain, setSubdomain] = useState(() => localStorage.getItem("tw_subdomain") || "");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({ key: "", sub: "" });

  const configured = apiKey && subdomain;
  const baseUrl = `https://${subdomain}.teamwork.com`;

  function saveSettings(key, sub) {
    const k = key.trim(), s = sub.trim();
    setApiKey(k); setSubdomain(s);
    if (k) localStorage.setItem("tw_api_key", k); else localStorage.removeItem("tw_api_key");
    if (s) localStorage.setItem("tw_subdomain", s); else localStorage.removeItem("tw_subdomain");
    setShowSettings(false);
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })); }

  useEffect(() => {
    if (!configured) return;
    setLoadingProjects(true);
    fetch(`${baseUrl}/projects.json?status=active`, { headers: twHeaders(apiKey) })
      .then(r => r.json())
      .then(d => setProjects((d.projects || []).map(p => ({ id: p.id, name: p.name })).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(e => console.error("Failed to load projects:", e))
      .finally(() => setLoadingProjects(false));
  }, [apiKey, subdomain]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onProjectChange(pid) {
    set("project", pid); set("taskList", ""); setTaskLists([]);
    if (!pid) return;
    setLoadingTL(true);
    try {
      const r = await fetch(`${baseUrl}/projects/${pid}/tasklists.json`, { headers: twHeaders(apiKey) });
      const d = await r.json();
      setTaskLists((d.tasklists || []).map(t => ({ id: t.id, name: t.name })));
    } catch (e) { console.error("Failed to load task lists:", e); }
    setLoadingTL(false);
  }

  function onTypeChange(t) {
    const tpl = DESC_TEMPLATES[t] || "";
    setForm(f => ({ ...f, taskType: t, description: Object.values(DESC_TEMPLATES).includes(f.description) || f.description === "" ? tpl : f.description }));
    setErrors(e => ({ ...e, taskType: null }));
  }

  function validate(s) {
    const e = {};
    if (s === 0) { if (!form.taskName.trim()) e.taskName = "Required"; if (!form.taskType) e.taskType = "Required"; if (!form.priority) e.priority = "Required"; }
    if (s === 1) { if (!form.project) e.project = "Required"; if (!form.taskList) e.taskList = "Required"; if (!form.assignedTo) e.assignedTo = "Required"; if (!form.startDate) e.startDate = "Required"; if (!form.dueDate) e.dueDate = "Required"; if (!form.estimateHours) e.estimateHours = "Required"; if (!form.estimateLow) e.estimateLow = "Required"; if (!form.estimateHigh) e.estimateHigh = "Required"; if (!form.difficulty) e.difficulty = "Required"; if (!form.department) e.department = "Required"; }
    if (s === 2) { if (!form.description.trim()) e.description = "Required"; }
    setErrors(e); return Object.keys(e).length === 0;
  }

  function next() { if (validate(step)) setStep(s => s + 1); }
  function back() { setStep(s => s - 1); }

  async function submit() {
    setSubmitting(true);
    try {
      const startDate = form.startDate.replace(/-/g, "");
      const dueDate = form.dueDate.replace(/-/g, "");
      const body = {
        "todo-item": {
          "content": form.taskName,
          "description": form.description,
          "responsible-party-id": String(form.assignedTo),
          "start-date": startDate,
          "due-date": dueDate,
          "priority": form.priority,
          "estimated-minutes": parseInt(form.estimateHours) || 0,
          "customFields": {
            "customField": [
              { "id": "98892", "value": form.difficulty },
              { "id": "99301", "value": form.department },
              { "id": "101290", "value": String(form.estimateLow) },
              { "id": "101291", "value": String(form.estimateHigh) },
            ]
          }
        }
      };
      const r = await fetch(`${baseUrl}/tasklists/${form.taskList}/tasks.json`, {
        method: "POST",
        headers: twHeaders(apiKey),
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const errText = await r.text();
        throw new Error(`HTTP ${r.status}: ${errText}`);
      }
      const d = await r.json();
      const taskId = d["todo-item"]?.id || d.id;
      const url = taskId ? `https://${subdomain}.teamwork.com/tasks/${taskId}` : null;
      setResult({ ok: true, url });
    } catch (e) { setResult({ ok: false, error: String(e) }); }
    setSubmitting(false);
  }

  const pName = projects.find(p => String(p.id) === String(form.project))?.name || "";
  const tlName = taskLists.find(t => String(t.id) === String(form.taskList))?.name || "";
  const uName = USERS.find(u => String(u.id) === String(form.assignedTo))?.name || "";

  const settingsBar = (
    <div style={{ marginBottom: "16px" }}>
      {!configured ? (
        <div style={{ background: "#fff8f0", border: "1.5px solid #f0c878", borderRadius: "12px", padding: "18px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#8a6020", marginBottom: "12px", textAlign: "center" }}>Connect to Teamwork</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "420px", margin: "0 auto" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: TX, whiteSpace: "nowrap", minWidth: "80px" }}>Subdomain</span>
              <div style={{ display: "flex", flex: 1, alignItems: "center", ...base, padding: "0", overflow: "hidden", border: "1.5px solid #f0c878", background: "white" }}>
                <span style={{ padding: "10px 8px 10px 12px", fontSize: "13px", color: MU, borderRight: `1px solid ${BR}`, whiteSpace: "nowrap" }}>https://</span>
                <input value={settingsDraft.sub || subdomain} onChange={e => setSettingsDraft(d => ({ ...d, sub: e.target.value }))}
                  placeholder="avero" style={{ flex: 1, border: "none", outline: "none", padding: "10px 8px", fontSize: "13px", background: "transparent", color: TX }} />
                <span style={{ padding: "10px 12px 10px 4px", fontSize: "13px", color: MU, whiteSpace: "nowrap" }}>.teamwork.com</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: TX, whiteSpace: "nowrap", minWidth: "80px" }}>API Token</span>
              <input type="password" value={settingsDraft.key || apiKey} onChange={e => setSettingsDraft(d => ({ ...d, key: e.target.value }))}
                placeholder="Your Teamwork API token" style={{ ...base, flex: 1, border: "1.5px solid #f0c878", background: "white", fontSize: "13px" }} />
            </div>
            <button onClick={() => saveSettings(settingsDraft.key || apiKey, settingsDraft.sub || subdomain)}
              style={{ marginTop: "4px", padding: "10px", background: `linear-gradient(135deg,${G},${DG})`, border: "none", borderRadius: "8px", color: "white", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
              Connect
            </button>
          </div>
          <div style={{ fontSize: "11px", color: "#b08030", marginTop: "8px", textAlign: "center" }}>
            API token: Teamwork → Settings → API → Your Token
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => { setSettingsDraft({ key: apiKey, sub: subdomain }); setShowSettings(!showSettings); }}
            style={{ padding: "5px 12px", background: LG, border: `1.5px solid ${BR}`, borderRadius: "6px", color: G, fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
            {showSettings ? "Hide" : `⚙ ${subdomain}.teamwork.com`}
          </button>
        </div>
      )}
      {showSettings && configured && (
        <div style={{ marginTop: "8px", background: "#f7fbf9", border: `1.5px solid ${BR}`, borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: TX, whiteSpace: "nowrap", minWidth: "80px" }}>Subdomain</span>
            <input value={settingsDraft.sub} onChange={e => setSettingsDraft(d => ({ ...d, sub: e.target.value }))}
              style={{ ...base, flex: 1, fontSize: "13px" }} />
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: TX, whiteSpace: "nowrap", minWidth: "80px" }}>API Token</span>
            <input type="password" value={settingsDraft.key} onChange={e => setSettingsDraft(d => ({ ...d, key: e.target.value }))}
              style={{ ...base, flex: 1, fontSize: "13px" }} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => saveSettings(settingsDraft.key, settingsDraft.sub)}
              style={{ padding: "8px 16px", background: G, border: "none", borderRadius: "8px", color: "white", fontWeight: "600", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>Save</button>
            <button onClick={() => { saveSettings("", ""); setProjects([]); setTaskLists([]); }}
              style={{ padding: "8px 16px", background: "#fff0f0", border: "1.5px solid #ffb0b0", borderRadius: "8px", color: "#c04040", fontWeight: "600", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>Disconnect</button>
          </div>
        </div>
      )}
    </div>
  );

  if (result?.ok) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f0f9f4,#e8f4ee)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: "24px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <div style={{ background: "white", borderRadius: "20px", padding: "48px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(14,98,69,0.12)" }}>
        <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: `linear-gradient(135deg,${G},${DG})`, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(14,98,69,0.3)" }}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none"><path d="M5 15L11 21L25 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: "700", color: TX, margin: "0 0 8px" }}>Task Created!</h2>
        <p style={{ color: MU, fontSize: "14px", margin: "0 0 24px" }}><strong style={{ color: TX }}>{form.taskName}</strong><br/>added to Teamwork successfully.</p>
        {result.url && <a href={result.url} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "9px 22px", background: LG, borderRadius: "8px", color: G, fontWeight: "600", fontSize: "13px", textDecoration: "none", border: `1.5px solid ${BR}`, marginBottom: "16px" }}>View in Teamwork →</a>}
        <br/>
        <button onClick={() => { setResult(null); setStep(0); setForm({ taskName:"",taskType:"",priority:"",project:"",taskList:"",assignedTo:"",startDate:"",dueDate:"",estimateHours:"",estimateLow:"",estimateHigh:"",difficulty:"",department:"",description:"" }); setTaskLists([]); }}
          style={{ marginTop: "12px", padding: "11px 28px", background: `linear-gradient(135deg,${G},${DG})`, color: "white", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}>
          + Create Another
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f0f9f4,#e8f4ee 60%,#f5faf7)", fontFamily: "'DM Sans',sans-serif", padding: "28px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box}
        input:focus,select:focus,textarea:focus{border-color:${G}!important;box-shadow:0 0 0 3px rgba(26,122,86,.12)!important;outline:none!important}
        button{transition:opacity .15s,transform .15s}
        button:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: `linear-gradient(135deg,${G},${DG})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(14,98,69,.25)", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" fill="white" opacity=".8"/><rect x="9" y="2" width="5" height="5" rx="1" fill="white"/><rect x="2" y="9" width="5" height="5" rx="1" fill="white"/><rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity=".5"/></svg>
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: TX, lineHeight: 1.2 }}>New Task</div>
            <div style={{ fontSize: "12px", color: MU }}>Create a task in Teamwork</div>
          </div>
        </div>

        {settingsBar}

        <div style={{ background: "white", borderRadius: "18px", padding: "28px", boxShadow: "0 8px 40px rgba(14,98,69,.09)", border: "1px solid rgba(197,221,208,.5)" }}>
          <StepBar current={step} />

          {step === 0 && (
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", color: TX, margin: "0 0 14px" }}>Task Details</h2>
              <a href="https://docs.google.com/document/d/1owKx8PcJcDMiEgEyLf3cvxb3ntosb7tqEQduNhLThao/edit?tab=t.0" target="_blank" rel="noreferrer"
                style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 14px", background:"linear-gradient(135deg,#f0f9f4,#e8f4ee)", border:`1.5px solid ${BR}`, borderRadius:"10px", textDecoration:"none", marginBottom:"20px" }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 10px rgba(14,98,69,.12)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                <div style={{ width:"30px", height:"30px", borderRadius:"8px", background:`linear-gradient(135deg,${G},${DG})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3h10M2 7h10M2 11h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize:"12px", fontWeight:"700", color:TX, lineHeight:1.3 }}>Avero General Playbook</div>
                  <div style={{ fontSize:"11px", color:MU, marginTop:"1px" }}>Prepare → Clarify → Specify → Approve → QA</div>
                </div>
                <div style={{ marginLeft:"auto", fontSize:"11px", color:G, fontWeight:"600" }}>View →</div>
              </a>
              <F label="Task Name" req err={errors.taskName}>
                <input value={form.taskName} onChange={e => set("taskName", e.target.value)} placeholder="e.g. Update Contact Lifecycle Stage" style={{ ...base, border: `1.5px solid ${errors.taskName ? "#c04040" : BR}` }} />
              </F>
              <F label="Task Type" req err={errors.taskType}>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[
                    ["Small Task","⚡ Small",G,"#f0f9f4","https://docs.google.com/document/d/1ATCdISqIglbTS09c_wia9o6NEmk-0FW5E1j4c2_7exs/edit?tab=t.0#heading=h.asi7eaf84wdi"],
                    ["Medium Task","📋 Medium","#c07020","#fff8f0","https://docs.google.com/document/d/1ATCdISqIglbTS09c_wia9o6NEmk-0FW5E1j4c2_7exs/edit?tab=t.0#heading=h.r5s8ycpgrtha"],
                    ["Project","🚀 Project","#4a5ab0","#f0f4ff","https://docs.google.com/document/d/1ATCdISqIglbTS09c_wia9o6NEmk-0FW5E1j4c2_7exs/edit?tab=t.0#heading=h.m5s0fkk3373b"]
                  ].map(([val,lbl,accent,bg,link]) => (
                    <div key={val} style={{ flex:1, position:"relative" }}>
                      <button onClick={() => onTypeChange(val)} style={{ width:"100%", padding:"10px 28px 10px 6px", borderRadius:"8px", cursor:"pointer", fontFamily:"inherit", fontWeight:"600", fontSize:"12px", background: form.taskType===val ? accent : bg, color: form.taskType===val ? "white" : accent, border:`1.5px solid ${form.taskType===val ? accent : BR}` }}>{lbl}</button>
                      <a href={link} target="_blank" rel="noreferrer"
                        title="Client requirements checklist"
                        onClick={e => e.stopPropagation()}
                        style={{ position:"absolute", top:"50%", right:"7px", transform:"translateY(-50%)", width:"16px", height:"16px", borderRadius:"50%", background: form.taskType===val ? "rgba(255,255,255,0.25)" : `${accent}22`, border: `1.5px solid ${form.taskType===val ? "rgba(255,255,255,0.5)" : accent}`, display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", color: form.taskType===val ? "white" : accent, fontSize:"10px", fontWeight:"700", lineHeight:1, flexShrink:0 }}>
                        i
                      </a>
                    </div>
                  ))}
                </div>
              </F>
              <F label="Priority" req err={errors.priority}>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[["low","Low",G,"#f0f9f4"],["medium","Medium","#c07020","#fff8f0"],["high","High","#c04040","#fff0f0"]].map(([val,lbl,accent,bg]) => (
                    <button key={val} onClick={() => set("priority", val)} style={{ flex:1, padding:"10px", borderRadius:"8px", cursor:"pointer", fontFamily:"inherit", fontWeight:"600", fontSize:"13px", background: form.priority===val ? accent : bg, color: form.priority===val ? "white" : accent, border:`1.5px solid ${form.priority===val ? accent : BR}` }}>{lbl}</button>
                  ))}
                </div>
              </F>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", color: TX, margin: "0 0 20px" }}>Assignment & Timeline</h2>
              <F label="Project" req err={errors.project}>
                {loadingProjects
                  ? <div style={{ ...base, color: MU, display:"flex", alignItems:"center", gap:"8px" }}><div style={{ width:"13px", height:"13px", border:`2px solid ${BR}`, borderTopColor:G, borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0 }} />Loading projects...</div>
                  : <select value={form.project} onChange={e => onProjectChange(e.target.value)} style={sel(errors.project)}>
                      <option value="">{!configured ? "Connect to Teamwork first..." : "Select project..."}</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                }
              </F>
              <F label="Task List" req err={errors.taskList}>
                {loadingTL
                  ? <div style={{ ...base, color: MU, display:"flex", alignItems:"center", gap:"8px" }}><div style={{ width:"13px", height:"13px", border:`2px solid ${BR}`, borderTopColor:G, borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0 }} />Loading task lists...</div>
                  : <select value={form.taskList} onChange={e => set("taskList", e.target.value)} disabled={!form.project} style={{ ...sel(errors.taskList), opacity: !form.project ? 0.55 : 1 }}>
                      <option value="">{!form.project ? "Select a project first..." : taskLists.length === 0 ? "No task lists found" : "Select task list..."}</option>
                      {taskLists.map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
                    </select>
                }
              </F>
              <F label="Assigned To" req err={errors.assignedTo}>
                <select value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} style={sel(errors.assignedTo)}>
                  <option value="">Select team member...</option>
                  {USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </F>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                <F label="Start Date" req err={errors.startDate}>
                  <input type="date" value={form.startDate} onChange={e => set("startDate",e.target.value)} style={{ ...base, border:`1.5px solid ${errors.startDate?"#c04040":BR}` }} />
                </F>
                <F label="Due Date" req err={errors.dueDate}>
                  <input type="date" value={form.dueDate} onChange={e => set("dueDate",e.target.value)} style={{ ...base, border:`1.5px solid ${errors.dueDate?"#c04040":BR}` }} />
                </F>
              </div>
              <F label="Estimate (min)" req err={errors.estimateHours} hint="e.g. 90 = 1h 30m">
                <input type="number" min="0" step="5" value={form.estimateHours} onChange={e => set("estimateHours",e.target.value)} placeholder="e.g. 90" style={{ ...base, maxWidth:"150px", border:`1.5px solid ${errors.estimateHours?"#c04040":BR}` }} />
              </F>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                <F label="Estimate Low (min)" req err={errors.estimateLow} hint="Optimistic estimate">
                  <input type="number" min="0" step="5" value={form.estimateLow} onChange={e => set("estimateLow",e.target.value)} placeholder="e.g. 30" style={{ ...base, border:`1.5px solid ${errors.estimateLow?"#c04040":BR}` }} />
                </F>
                <F label="Estimate High (min)" req err={errors.estimateHigh} hint="Pessimistic estimate">
                  <input type="number" min="0" step="5" value={form.estimateHigh} onChange={e => set("estimateHigh",e.target.value)} placeholder="e.g. 90" style={{ ...base, border:`1.5px solid ${errors.estimateHigh?"#c04040":BR}` }} />
                </F>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                <F label="Task Difficulty" req err={errors.difficulty}>
                  <div style={{ display:"flex", gap:"6px" }}>
                    {[["Easy","#7aaa8f","#f0f9f4"],["Medium","#c07020","#fff8f0"],["Hard","#c04040","#fff0f0"]].map(([val,accent,bg]) => (
                      <button key={val} onClick={() => set("difficulty",val)} style={{ flex:1, padding:"9px 4px", borderRadius:"8px", cursor:"pointer", fontFamily:"inherit", fontWeight:"600", fontSize:"12px", background:form.difficulty===val?accent:bg, color:form.difficulty===val?"white":accent, border:`1.5px solid ${form.difficulty===val?accent:BR}` }}>{val}</button>
                    ))}
                  </div>
                </F>
                <F label="Department" req err={errors.department}>
                  <select value={form.department} onChange={e => set("department",e.target.value)} style={sel(errors.department)}>
                    <option value="">Select...</option>
                    {["Marketing","Sales","CS","Finance","Multiple"].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </F>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", color: TX, margin: "0 0 4px" }}>Description</h2>
              <p style={{ fontSize: "12px", color: MU, fontStyle: "italic", margin: "0 0 14px" }}>
                {form.taskType === "Small Task" && "Fill in: goal, execution approach, QA approach, urgency"}
                {form.taskType === "Medium Task" && "Fill in: context & goal, approach, execution plan, QA, links"}
                {form.taskType === "Project" && "Fill in: description, spec, implementation approach, links"}
              </p>
              <div style={{ display:"flex", gap:"8px", marginBottom:"10px" }}>
                <button onClick={() => set("description", DESC_TEMPLATES[form.taskType]||"")} style={{ padding:"5px 12px", background:LG, border:`1.5px solid ${BR}`, borderRadius:"6px", color:G, fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" }}>↺ Reset Template</button>
                <button onClick={() => set("description","")} style={{ padding:"5px 12px", background:"#fff0f0", border:"1.5px solid #ffb0b0", borderRadius:"6px", color:"#c04040", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" }}>Clear</button>
              </div>
              <textarea value={form.description} onChange={e => set("description",e.target.value)} rows={16}
                style={{ ...base, resize:"vertical", lineHeight:"1.6", fontFamily:"'DM Mono',monospace", fontSize:"12.5px", border:`1.5px solid ${errors.description?"#c04040":BR}` }} />
              {errors.description && <div style={{ color:"#c04040", fontSize:"11px", marginTop:"4px" }}>Required</div>}
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", color: TX, margin: "0 0 16px" }}>Review & Submit</h2>
              <div style={{ background:"#f7fbf9", borderRadius:"12px", padding:"18px" }}>
                {[["Task Name",form.taskName],["Type",form.taskType],["Priority",form.priority?form.priority[0].toUpperCase()+form.priority.slice(1):""],["Project",pName],["Task List",tlName],["Assigned To",uName],["Start Date",form.startDate],["Due Date",form.dueDate],["Estimate",form.estimateHours?`${form.estimateHours} min`:""],["Est. Low",form.estimateLow?`${form.estimateLow} min`:""],["Est. High",form.estimateHigh?`${form.estimateHigh} min`:""],["Difficulty",form.difficulty],["Department",form.department]].map(([lbl,val]) => val?(
                  <div key={lbl} style={{ display:"flex", gap:"14px", padding:"7px 0", borderBottom:"1px solid #eaf3ee" }}>
                    <span style={{ fontSize:"10px", fontWeight:"700", color:MU, textTransform:"uppercase", letterSpacing:"0.07em", minWidth:"95px", paddingTop:"2px" }}>{lbl}</span>
                    <span style={{ fontSize:"13px", color:TX, flex:1 }}>{val}</span>
                  </div>
                ):null)}
                <div style={{ paddingTop:"8px" }}>
                  <span style={{ fontSize:"10px", fontWeight:"700", color:MU, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"6px" }}>Description</span>
                  <pre style={{ fontSize:"12px", color:TX, fontFamily:"'DM Mono',monospace", whiteSpace:"pre-wrap", margin:0, lineHeight:"1.5", maxHeight:"150px", overflowY:"auto" }}>{form.description}</pre>
                </div>
              </div>
              {result?.error && <div style={{ marginTop:"12px", padding:"10px 14px", background:"#fff0f0", border:"1.5px solid #ffb0b0", borderRadius:"8px", color:"#c04040", fontSize:"13px" }}>Error: {result.error}</div>}
            </div>
          )}

          <div style={{ display:"flex", justifyContent:"space-between", marginTop:"22px", paddingTop:"16px", borderTop:"1px solid #eaf3ee" }}>
            <button onClick={back} disabled={step===0} style={{ padding:"10px 22px", background:step===0?"#f7fbf9":"#eaf3ee", border:`1.5px solid ${BR}`, borderRadius:"9px", color:step===0?BR:G, fontWeight:"600", fontSize:"14px", cursor:step===0?"default":"pointer", fontFamily:"inherit" }}>← Back</button>
            {step < 3
              ? <button onClick={next} style={{ padding:"10px 26px", background:`linear-gradient(135deg,${G},${DG})`, border:"none", borderRadius:"9px", color:"white", fontWeight:"700", fontSize:"14px", cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(14,98,69,.22)" }}>Continue →</button>
              : <button onClick={submit} disabled={submitting || !configured} style={{ padding:"11px 28px", background:(submitting||!configured)?BR:`linear-gradient(135deg,${G},${DG})`, border:"none", borderRadius:"9px", color:"white", fontWeight:"700", fontSize:"14px", cursor:(submitting||!configured)?"default":"pointer", fontFamily:"inherit", boxShadow:(submitting||!configured)?"none":"0 4px 14px rgba(14,98,69,.22)", display:"flex", alignItems:"center", gap:"8px" }}>
                  {submitting?<><div style={{ width:"13px", height:"13px", border:"2px solid rgba(255,255,255,.4)", borderTopColor:"white", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>Creating...</>:"✓ Create in Teamwork"}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
