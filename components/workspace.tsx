"use client";

import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bot, Check, ChevronDown, CloudSun,
  Droplets, FileImage, LayoutDashboard, Leaf, LogOut, Menu, Map as MapIcon, Search,
  Settings, Sprout, Tractor, TrendingUp, X,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/components/providers";
import { alertsApi } from "@/lib/api/alerts";
import { assistantApi } from "@/lib/api/assistant";
import { aiApi } from "@/lib/api/ai";
import { cropsApi } from "@/lib/api/crops";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import { financeApi } from "@/lib/api/finance";
import { gisApi } from "@/lib/api/gis";
import { irrigationApi } from "@/lib/api/irrigation";
import { predictionsApi } from "@/lib/api/predictions";
import { weatherApi } from "@/lib/api/weather";
import type { Alert, Farm, FarmDashboard, FarmField, GeoFeatureCollection } from "@/types";
import { ApiError } from "@/lib/api/client";

const FarmMap = dynamic(() => import("@/components/farm-map").then((module) => module.FarmMap), {
  ssr: false,
  loading: () => <div className="map-empty">Loading interactive map…</div>,
});

const navigation: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Farms", href: "/farms", icon: Tractor },
  { label: "Crop Health", href: "/crop-health", icon: Leaf },
  { label: "AI Farm Assistant", href: "/ai-assistant", icon: Bot },
  { label: "Disease Detection", href: "/disease-detection", icon: FileImage },
  { label: "Satellite Intelligence", href: "/satellite", icon: MapIcon },
  { label: "Smart Irrigation", href: "/irrigation", icon: Droplets },
  { label: "Yield Prediction", href: "/yield-prediction", icon: TrendingUp },
  { label: "Weather", href: "/weather", icon: CloudSun },
  { label: "Alerts", href: "/alerts", icon: AlertTriangle },
  { label: "Farm Finance", href: "/finance", icon: Activity },
  { label: "Settings", href: "/settings", icon: Settings },
];

function display(value: unknown, suffix = "") {
  if (value === null || value === undefined || value === "") return "—";
  const parsed = typeof value === "number" ? value : Number(value);
  return `${Number.isFinite(parsed) ? parsed.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : String(value)}${suffix}`;
}

function valueOf(record: unknown, key: string) {
  if (!record || typeof record !== "object") return undefined;
  return (record as Record<string, unknown>)[key];
}

function dateText(value: unknown) {
  if (typeof value !== "string" || !value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function StateBlock({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <div className="state-block"><strong>{title}</strong>{detail && <span>{detail}</span>}{retry && <button className="button-quiet" onClick={retry}>Retry</button>}</div>;
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="page-title">{title}</h1>{detail && <p className="page-description">{detail}</p>}</div>{action}</div>;
}

function Metric({ label, value, suffix, icon: Icon, tone = "green", note }: { label: string; value: unknown; suffix?: string; icon: LucideIcon; tone?: string; note?: string }) {
  return <article className="panel metric-card"><div className={`metric-icon tone-${tone}`}><Icon size={18} strokeWidth={1.8} /></div><p>{label}</p><strong>{display(value, suffix)}</strong><span>{note ?? "Latest available reading"}</span></article>;
}

function QueryState({ loading, error, retry, children }: { loading: boolean; error: Error | null; retry: () => void; children: React.ReactNode }) {
  if (loading) return <div className="panel loading-panel"><div className="skeleton loading-line" /><div className="skeleton loading-line short" /><div className="skeleton loading-line" /></div>;
  if (error) return <div className="panel"><StateBlock title="Unable to load this data" detail={error.message} retry={retry} /></div>;
  return <>{children}</>;
}

function FarmMapPanel({ farm, farmId }: { farm?: Farm; farmId: string }) {
  const map = useQuery({ queryKey: ["farm-map", farmId], queryFn: () => farmsApi.healthMap(farmId), enabled: Boolean(farmId) });
  return <QueryState loading={map.isLoading} error={map.error} retry={() => void map.refetch()}>
    {map.data ? <FarmMap farm={farm} data={map.data} /> : <StateBlock title="No map data available" detail="The GIS service returned no field boundaries." />}
  </QueryState>;
}

function DashboardView({ farm, dashboard, farmId, finance, onNavigate }: { farm?: Farm; dashboard?: FarmDashboard; farmId: string; finance?: { profit: number; currency: string }; onNavigate: (href: string) => void }) {
  const health = dashboard?.health;
  const soil = dashboard?.soil;
  const weather = dashboard?.weather;
  const yieldData = dashboard?.yield;
  const disease = dashboard?.disease_risk;
  const insight = dashboard?.ai_insights?.[0];
  return <>
    <PageHeading eyebrow="FARM COMMAND CENTER" title="Good morning" detail={farm ? `${farm.name} · ${display(farm.area_acres, " acres")}` : "Your connected farms, at a glance."} action={farm && <span className="sync-stamp"><span className="status-dot" />Live farm data</span>} />
    {!farmId ? <div className="panel"><StateBlock title="No farm selected" detail="Add a farm to begin connecting your field data." /></div> : <>
      <div className="metric-grid">
        <Metric label="Vegetation index · NDVI" value={health?.ndvi} icon={Leaf} note={health?.observed_at ? `Observed ${dateText(health.observed_at)}` : "No satellite observation"} />
        <Metric label="Soil moisture" value={valueOf(soil, "moisture")} suffix="%" icon={Droplets} tone="blue" note={soil ? `Reading ${dateText(valueOf(soil, "recorded_at"))}` : "No soil reading"} />
        <Metric label="Temperature" value={valueOf(weather, "temperature")} suffix="°C" icon={CloudSun} tone="amber" note={weather ? `Recorded ${dateText(valueOf(weather, "recorded_at"))}` : "No weather reading"} />
        <Metric label="Predicted yield" value={valueOf(yieldData, "predicted_yield")} suffix=" tons" icon={TrendingUp} note={yieldData ? `Confidence ${display(valueOf(yieldData, "confidence"), "%")}` : "No prediction available"} />
        <Metric label="Disease risk" value={valueOf(disease, "risk_level")} icon={AlertTriangle} tone="red" note={disease ? `Confidence ${display(valueOf(disease, "confidence") != null ? Number(valueOf(disease, "confidence")) * 100 : undefined, "%")}` : "No disease assessment"} />
        <Metric label="Estimated profit" value={finance?.profit} suffix={finance ? ` ${finance.currency}` : ""} icon={Sprout} note={finance ? "Farm finance summary" : "No finance summary"} />
      </div>
      <div className="dashboard-lower">
        <section className="panel insight-panel">
          <div className="section-heading"><div className="section-title-icon"><Bot size={17} /></div><div><span className="eyebrow">AGRI NEXA INTELLIGENCE</span><h2>AI insights</h2></div><span className="live-label">API DATA</span></div>
          {insight ? <div className="insight-content"><span className={`severity-pill severity-${String(insight.severity ?? "info").toLowerCase()}`}>{String(insight.severity ?? "Insight")}</span><h3>{String(insight.title ?? "Farm recommendation")}</h3><p>{String(insight.description ?? insight.reason ?? "")}</p><div className="insight-actions"><button className="button-primary" onClick={() => onNavigate("/irrigation")}>View details</button><button className="button-secondary" onClick={() => onNavigate("/irrigation")}>Review recommendation</button></div></div> : <StateBlock title="No active recommendations" detail="Recommendations will appear here when available from the farm intelligence API." />}
          {dashboard?.ai_insights && dashboard.ai_insights.length > 1 && <div className="more-insights">{dashboard.ai_insights.length - 1} more active recommendations</div>}
        </section>
        <section className="panel map-panel"><div className="section-heading"><div><span className="eyebrow">FIELD OVERVIEW</span><h2>Farm health map</h2></div><button className="icon-button" title="Open satellite intelligence" onClick={() => onNavigate("/satellite")}><MapIcon size={17} /></button></div><FarmMapPanel farm={farm} farmId={farmId} /><div className="map-legend"><span><i className="legend-green" />Healthy</span><span><i className="legend-amber" />Moderate stress</span><span><i className="legend-red" />High stress</span></div></section>
      </div>
      <section className="panel alerts-strip"><div className="section-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Farm alerts</h2></div><button className="text-link" onClick={() => onNavigate("/alerts")}>View all <ArrowUpRight size={14} /></button></div>
        {dashboard?.alerts?.length ? <div className="alert-list compact">{dashboard.alerts.slice(0, 3).map((alert, index) => <AlertRow key={String(alert.id ?? index)} alert={alert as unknown as Alert} />)}</div> : <StateBlock title="No recent alerts" detail="There are no farm alerts to display." />}
      </section>
    </>}
  </>;
}

function AlertRow({ alert, onRead }: { alert: Alert; onRead?: () => void }) {
  const severity = String(alert.severity ?? "info").toLowerCase();
  return <div className="alert-row"><span className={`severity-dot severity-dot-${severity}`} /><div className="alert-copy"><strong>{alert.title ?? alert.category ?? "Farm alert"}</strong><span>{alert.message ?? ""}</span><small>{dateText(alert.created_at)}</small></div>{!alert.is_read && onRead && <button className="icon-button" title="Mark as read" onClick={onRead}><Check size={16} /></button>}</div>;
}

function FarmsView({ farms, selectedFarmId, onSelect }: { farms: Farm[]; selectedFarmId: string; onSelect: (id: string) => void }) {
  const client = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const createFarm = useMutation({ mutationFn: farmsApi.create, onSuccess: () => { void client.invalidateQueries({ queryKey: ["farms"] }); setFormOpen(false); } });
  const updateFarm = useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => farmsApi.update(id, { name }), onSuccess: () => void client.invalidateQueries({ queryKey: ["farms"] }) });
  const deleteFarm = useMutation({ mutationFn: farmsApi.remove, onSuccess: () => { void client.invalidateQueries({ queryKey: ["farms"] }); if (selectedFarmId) onSelect(""); } });
  const submitFarm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    createFarm.mutate({ name: String(values.get("name") ?? ""), area_acres: Number(values.get("area_acres")), location_name: String(values.get("location_name") ?? "") || undefined });
  };
  return <>
    <PageHeading eyebrow="LAND & OPERATIONS" title="My farms" detail="Manage your registered farm properties and their field data." action={<button className="button-primary" onClick={() => setFormOpen((value) => !value)}>{formOpen ? <X size={16} /> : <Sprout size={16} />}{formOpen ? "Close" : "Add farm"}</button>} />
    {formOpen && <form className="panel farm-form" onSubmit={submitFarm}><h2>Register a farm</h2><div className="form-grid"><label>Farm name<input name="name" required maxLength={160} placeholder="e.g. North field" /></label><label>Area in acres<input name="area_acres" type="number" min="0.001" step="0.001" required /></label><label>Location<input name="location_name" maxLength={240} placeholder="Village, district" /></label></div>{createFarm.error && <p className="inline-error">{createFarm.error.message}</p>}<button className="button-primary" disabled={createFarm.isPending}>{createFarm.isPending ? "Saving…" : "Save farm"}</button></form>}
    {!farms.length ? <section className="panel"><StateBlock title="No farms registered" detail="Add a farm to begin viewing its data and field boundaries." /></section> : <div className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Farm</th><th>Location</th><th>Area</th><th>Fields</th><th>Actions</th></tr></thead><tbody>{farms.map((farm) => <tr key={farm.id}><td><strong>{farm.name}</strong>{farm.description && <small className="table-secondary">{farm.description}</small>}</td><td>{farm.location_name || "—"}</td><td>{display(farm.area_acres, " ac")}</td><td>—</td><td className="table-actions"><Link className="text-link" href={`/farms/${farm.id}`}>View farm</Link><button className="button-quiet" onClick={() => { const name = window.prompt("Farm name", farm.name); if (name?.trim()) updateFarm.mutate({ id: farm.id, name: name.trim() }); }}>Edit</button><button className="button-quiet danger-text" onClick={() => { if (window.confirm(`Delete ${farm.name}? This action cannot be undone.`)) deleteFarm.mutate(farm.id); }}>Delete</button></td></tr>)}</tbody></table></div></div>}
  </>;
}

function FarmDetailView({ farmId }: { farmId: string }) {
  const farm = useQuery({ queryKey: ["farm", farmId], queryFn: () => farmsApi.get(farmId), enabled: Boolean(farmId) });
  const dashboard = useQuery({ queryKey: ["dashboard", farmId], queryFn: () => farmsApi.dashboard(farmId), enabled: Boolean(farmId) });
  const fields = useQuery({ queryKey: ["fields", farmId], queryFn: () => fieldsApi.list(farmId), enabled: Boolean(farmId) });
  return <>
    <PageHeading eyebrow="FARM PROFILE" title={farm.data?.name ?? "Farm details"} detail={farm.data?.location_name ?? "Farm location not recorded"} />
    <div className="detail-grid"><section className="panel map-panel"><div className="section-heading"><div><span className="eyebrow">SPATIAL DATA</span><h2>Farm boundaries</h2></div></div><FarmMapPanel farm={farm.data} farmId={farmId} /></section><section className="panel detail-summary"><span className="eyebrow">PROPERTY SUMMARY</span><h2>{display(farm.data?.area_acres, " acres")}</h2><p>Total registered area</p><div className="summary-row"><span>Fields</span><strong>{fields.data?.length ?? (fields.isLoading ? "Loading…" : "—")}</strong></div><div className="summary-row"><span>Current NDVI</span><strong>{display(dashboard.data?.health.ndvi)}</strong></div><div className="summary-row"><span>Soil moisture</span><strong>{display(valueOf(dashboard.data?.soil, "moisture"), "%")}</strong></div><div className="summary-row"><span>Temperature</span><strong>{display(valueOf(dashboard.data?.weather, "temperature"), " °C")}</strong></div></section></div>
    <section className="panel table-panel"><div className="section-heading"><div><span className="eyebrow">REGISTERED LAND</span><h2>Fields</h2></div></div>{fields.isLoading ? <StateBlock title="Loading fields…" /> : fields.error ? <StateBlock title="Unable to load fields" detail={fields.error.message} retry={() => void fields.refetch()} /> : fields.data?.length ? <div className="table-scroll"><table><thead><tr><th>Field</th><th>Area</th><th>Soil type</th><th>Status</th></tr></thead><tbody>{fields.data.map((field) => <tr key={field.id}><td>{field.name}</td><td>{display(field.area_acres, " ac")}</td><td>{field.soil_type ?? "—"}</td><td>{field.status ?? "—"}</td></tr>)}</tbody></table></div> : <StateBlock title="No fields registered" detail="Field records will appear when they are added to this farm." />}</section>
  </>;
}

function CropHealthView({ farmId, fields, dashboard, mapData }: { farmId: string; fields: FarmField[]; dashboard?: FarmDashboard; mapData?: GeoFeatureCollection }) {
  const cycles = useQuery({ queryKey: ["crop-cycles", farmId], queryFn: () => cropsApi.cycles(), enabled: Boolean(farmId) });
  const features = mapData?.features ?? [];
  const chartData = features.map((feature) => ({ name: String(feature.properties.name ?? "Field"), ndvi: Number(feature.properties.ndvi) })).filter((feature) => Number.isFinite(feature.ndvi));
  const cyclesByField = new Map((cycles.data ?? []).map((cycle) => [cycle.field_id, cycle]));
  return <>
    <PageHeading eyebrow="CROP MONITORING" title="Crop health" detail="Latest available field observations from your connected farm." />
    <div className="metric-grid three"><Metric label="Farm NDVI" value={dashboard?.health.ndvi} icon={Leaf} note={dashboard?.health.observed_at ? dateText(dashboard.health.observed_at) : "No satellite observation"} /><Metric label="Soil moisture" value={valueOf(dashboard?.soil, "moisture")} suffix="%" icon={Droplets} tone="blue" /><Metric label="Disease assessment" value={valueOf(dashboard?.disease_risk, "risk_level")} icon={AlertTriangle} tone="amber" /></div>
    <div className="detail-grid"><section className="panel chart-panel"><div className="section-heading"><div><span className="eyebrow">LATEST SATELLITE OBSERVATIONS</span><h2>Field NDVI comparison</h2></div></div>{chartData.length ? <div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}><CartesianGrid stroke="#e8ece7" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis domain={[0, 1]} tickLine={false} axisLine={false} width={35} /><Tooltip /><Bar dataKey="ndvi" fill="#347b56" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div> : <StateBlock title="No field index observations" detail="Satellite comparison requires NDVI records from the GIS API." />}</section><section className="panel chart-panel"><span className="eyebrow">HISTORY</span><h2>Trend history</h2><StateBlock title="No historical trend endpoint" detail="The current API exposes the latest satellite observation, but not a time series." /></section></div>
    <section className="panel table-panel"><div className="section-heading"><div><span className="eyebrow">FIELD COMPARISON</span><h2>Current field readings</h2></div></div><div className="table-scroll"><table><thead><tr><th>Field</th><th>Active crop</th><th>NDVI</th><th>Soil moisture</th><th>Observation</th></tr></thead><tbody>{fields.map((field) => { const feature = features.find((item) => item.properties.field_id === field.id); const cycle = cyclesByField.get(field.id); return <tr key={field.id}><td>{field.name}</td><td>{cycle?.crop_name ?? "—"}</td><td>{display(feature?.properties.ndvi)}</td><td>{field.id === valueOf(dashboard?.soil, "field_id") ? display(valueOf(dashboard?.soil, "moisture"), "%") : "—"}</td><td>{dateText(feature?.properties.observed_at)}</td></tr>; })}</tbody></table>{!fields.length && <StateBlock title="No fields available" />}</div></section>
  </>;
}

function AssistantView({ farmId }: { farmId: string }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: (text: string) => assistantApi.chat(farmId, text) });
  const suggestions = ["Should I irrigate today?", "Why are my tomato leaves turning yellow?", "What fertilizer should I use?", "When should I harvest?", "What is my expected yield?", "What are my biggest farm risks?"];
  const ask = async (text: string) => {
    if (!farmId || !text.trim() || mutation.isPending) return;
    setError(""); setMessages((items) => [...items, { role: "user", text }]); setQuestion("");
    try { const result = await mutation.mutateAsync(text.trim()); setMessages((items) => [...items, { role: "assistant", text: result.answer }]); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : "The assistant could not respond."); }
  };
  return <>
    <PageHeading eyebrow="CONTEXT-AWARE FARM SUPPORT" title="AI farm assistant" detail="Answers are grounded in readings and farm records available to your account." />
    <section className="panel chat-panel"><div className="chat-topline"><div className="assistant-avatar"><Bot size={19} /></div><div><strong>AgriNexa Assistant</strong><span>Farm context connected</span></div><span className="context-badge">API CONNECTED</span></div>
      <div className="chat-messages">{!messages.length && <div className="chat-welcome"><Bot size={28} /><h2>What would you like to know?</h2><p>Questions are answered from available farm records. The current backend does not connect to a generative AI service.</p><div className="suggestion-list">{suggestions.map((item) => <button key={item} className="suggestion-chip" onClick={() => void ask(item)}>{item}<ArrowUpRight size={13} /></button>)}</div></div>}{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}><span>{message.role === "assistant" ? "AGRI NEXA" : "YOU"}</span><p>{message.text}</p></div>)}{mutation.isPending && <div className="chat-message assistant"><span>AGRI NEXA</span><p>Checking farm records…</p></div>}{error && <div className="inline-error" role="alert">{error}<button className="button-quiet" onClick={() => setError("")}>Dismiss</button></div>}</div>
      <form className="chat-input-row" onSubmit={(event) => { event.preventDefault(); void ask(question); }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your farm data…" aria-label="Your question" /><button className="button-primary" disabled={!question.trim() || mutation.isPending || !farmId}>Send</button></form>
    </section>
  </>;
}

function DiseaseView({ fields }: { fields: FarmField[] }) {
  const [fieldId, setFieldId] = useState("");
  const [crop, setCrop] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: () => aiApi.disease(fieldId, crop, image!) });
  const chooseImage = (file?: File) => { setError(""); setResult(null); if (!file) { setImage(null); setPreview(""); return; } if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError("Choose a JPG, PNG, or WebP image."); return; } if (file.size > 10 * 1024 * 1024) { setError("Image must be 10 MB or smaller."); return; } setImage(file); const reader = new FileReader(); reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : ""); reader.readAsDataURL(file); };
  const analyze = async () => { if (!image || !fieldId || !crop) return; setError(""); try { setResult(await mutation.mutateAsync()); } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : "Disease analysis failed."); } };
  return <>
    <PageHeading eyebrow="IMAGE-BASED CROP ASSESSMENT" title="Disease detection" detail="Upload a field image for analysis by the configured vision model." />
    <div className="disease-layout"><section className="panel upload-panel"><div className="section-heading"><div><span className="eyebrow">IMAGE INPUT</span><h2>Upload crop image</h2></div></div><label>Field<select value={fieldId} onChange={(event) => setFieldId(event.target.value)}><option value="">Select field</option>{fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label><label>Crop name<input value={crop} onChange={(event) => setCrop(event.target.value)} placeholder="e.g. Tomato" maxLength={100} /></label><label className="upload-drop">{preview ? <Image src={preview} alt="Selected crop for disease analysis" width={640} height={420} unoptimized /> : <><FileImage size={26} /><strong>Choose an image</strong><span>JPG, PNG, WebP · Maximum 10 MB</span></>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} /></label>{image && <div className="file-row"><span>{image.name} · {(image.size / 1024 / 1024).toFixed(2)} MB</span><button className="icon-button" title="Remove image" onClick={() => chooseImage()}><X size={16} /></button></div>}{error && <p className="inline-error" role="alert">{error}</p>}{mutation.isPending && <div className="upload-progress"><span>Uploading image for analysis…</span><div><i /></div></div>}<button className="button-primary" onClick={() => void analyze()} disabled={!fieldId || !crop.trim() || !image || mutation.isPending}>{mutation.isPending ? "Analyzing…" : result ? "Analyze again" : "Analyze image"}</button></section>
      <section className="panel result-panel"><span className="eyebrow">MODEL OUTPUT</span><h2>Analysis result</h2>{result ? <><div className="result-banner"><span>{String(result.crop ?? crop)}</span><strong>{String(result.disease ?? "Result")}</strong><span className={`severity-pill severity-${String(result.risk_level ?? "info").toLowerCase()}`}>{String(result.risk_level ?? "Risk not classified")}</span></div><div className="summary-row"><span>Confidence</span><strong>{display(Number(result.confidence ?? 0) * 100, "%")}</strong></div><div className="summary-row"><span>Affected area</span><strong>{display(result.affected_area, "%")}</strong></div><h3>Recommendations</h3><pre className="response-json">{JSON.stringify(result.recommendations ?? {}, null, 2)}</pre></> : <StateBlock title="No analysis yet" detail="Results appear only after a successful response from the configured disease model." />}</section></div>
  </>;
}

function IrrigationView({ fields }: { fields: FarmField[] }) {
  const [fieldId, setFieldId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recommendation, setRecommendation] = useState<Record<string, unknown> | null>(null);
  const history = useQuery({ queryKey: ["irrigation", fieldId], queryFn: () => irrigationApi.history(fieldId), enabled: Boolean(fieldId) });
  const recommend = useMutation({ mutationFn: () => aiApi.irrigation(fieldId) });
  const schedule = useMutation({ mutationFn: () => irrigationApi.schedule({ field_id: fieldId, scheduled_at: new Date(scheduledAt).toISOString(), recommended_duration: Number(recommendation?.recommended_duration), estimated_water: Number(recommendation?.estimated_water) }) });
  const requestRecommendation = async () => { setError(""); setNotice(""); try { setRecommendation(await recommend.mutateAsync()); } catch (issue) { setError(issue instanceof ApiError ? issue.message : "Unable to calculate a recommendation."); } };
  const scheduleAction = async () => { if (!scheduledAt || !recommendation) return; try { await schedule.mutateAsync(); setNotice("Irrigation schedule created."); void history.refetch(); } catch (issue) { setError(issue instanceof ApiError ? issue.message : "Unable to schedule irrigation."); } };
  return <>
    <PageHeading eyebrow="WATER MANAGEMENT" title="Smart irrigation" detail="Recommendations use the latest recorded soil and weather readings for a field." />
    <section className="panel irrigation-panel"><div className="section-heading"><div><span className="eyebrow">DECISION SUPPORT</span><h2>Generate recommendation</h2></div><Droplets className="large-green-icon" size={25} /></div><div className="irrigation-controls"><label>Field<select value={fieldId} onChange={(event) => { setFieldId(event.target.value); setRecommendation(null); }}><option value="">Select field</option>{fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label><button className="button-primary" onClick={() => void requestRecommendation()} disabled={!fieldId || recommend.isPending}>{recommend.isPending ? "Calculating…" : "Get recommendation"}</button></div>
      {error && <p className="inline-error" role="alert">{error}<button className="button-quiet" onClick={() => void requestRecommendation()}>Retry</button></p>}{notice && <p className="success-message">{notice}</p>}
      {recommendation && <div className="recommendation-result"><span className="eyebrow">AI RECOMMENDATION</span><h3>{String(recommendation.decision ?? "Recommendation")}{fieldId ? ` · ${fields.find((field) => field.id === fieldId)?.name ?? ""}` : ""}</h3><p>{String(recommendation.reason ?? "")}</p><div className="recommendation-metrics"><div><small>Duration</small><strong>{display(recommendation.recommended_duration, " min")}</strong></div><div><small>Estimated water</small><strong>{display(recommendation.estimated_water, " L")}</strong></div><div><small>Confidence</small><strong>{display(Number(recommendation.confidence ?? 0) * 100, "%")}</strong></div><div><small>Severity</small><strong>{String(recommendation.severity ?? "—")}</strong></div></div><div className="schedule-row"><label>Schedule for<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label><button className="button-secondary" onClick={() => void scheduleAction()} disabled={!scheduledAt || schedule.isPending}>{schedule.isPending ? "Scheduling…" : "Schedule irrigation"}</button></div></div>}
    </section>
    <section className="panel table-panel"><div className="section-heading"><div><span className="eyebrow">FIELD RECORDS</span><h2>Irrigation history</h2></div></div>{!fieldId ? <StateBlock title="Select a field" detail="Choose a field to load its irrigation records." /> : history.isLoading ? <StateBlock title="Loading irrigation history…" /> : history.error ? <StateBlock title="Unable to load history" detail={history.error.message} retry={() => void history.refetch()} /> : history.data?.length ? <div className="table-scroll"><table><thead><tr><th>Status</th><th>Duration</th><th>Estimated water</th><th>Scheduled</th></tr></thead><tbody>{history.data.map((record, index) => <tr key={String(record.id ?? index)}><td>{String(record.status ?? "—")}</td><td>{display(record.recommended_duration, " min")}</td><td>{display(record.estimated_water, " L")}</td><td>{dateText(record.scheduled_at)}</td></tr>)}</tbody></table></div> : <StateBlock title="No irrigation records" detail="Records appear here after recommendations or schedules are created." />}</section>
  </>;
}

function YieldView({ farmId, fields }: { farmId: string; fields: FarmField[] }) {
  const cycles = useQuery({ queryKey: ["crop-cycles", farmId], queryFn: () => cropsApi.cycles(), enabled: Boolean(farmId) });
  const [cycleId, setCycleId] = useState("");
  const [features, setFeatures] = useState([{ key: "", value: "" }]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const mutation = useMutation({ mutationFn: aiApi.yieldPrediction });
  const history = useQuery({ queryKey: ["yield-history", cycleId], queryFn: () => predictionsApi.yieldHistory(cycleId), enabled: Boolean(cycleId) });
  const availableCycles = (cycles.data ?? []).filter((cycle) => fields.some((field) => field.id === cycle.field_id));
  const historyData = (history.data ?? []).map((item) => ({
    date: typeof item.created_at === "string" ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Prediction",
    yield: Number(item.predicted_yield),
    confidence: Number(item.confidence) * 100,
  })).filter((item) => Number.isFinite(item.yield));
  const runPrediction = async () => {
    const inputs = Object.fromEntries(features.filter((item) => item.key.trim() && item.value !== "").map((item) => [item.key.trim(), Number(item.value)]));
    if (!cycleId || !Object.keys(inputs).length) { setError("Select a crop cycle and enter at least one model feature."); return; }
    setError("");
    try { setResult(await mutation.mutateAsync({ crop_cycle_id: cycleId, features: inputs })); }
    catch (issue) { setError(issue instanceof ApiError ? issue.message : "Prediction could not be completed."); }
  };
  return <>
    <PageHeading eyebrow="MODEL-BASED FORECAST" title="Yield prediction" detail="Run a prediction using the configured model's feature names and an active crop cycle." />
    <div className="detail-grid"><section className="panel prediction-form"><span className="eyebrow">PREDICTION INPUT</span><h2>Crop cycle and features</h2><label>Crop cycle<select value={cycleId} onChange={(event) => setCycleId(event.target.value)}><option value="">Select crop cycle</option>{availableCycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.crop_name} · {fields.find((field) => field.id === cycle.field_id)?.name} · {cycle.status}</option>)}</select></label><p className="field-note">Feature names must match the deployed yield model. This API does not publish a feature schema.</p>{features.map((feature, index) => <div className="feature-input" key={index}><input aria-label="Feature name" placeholder="Model feature name" value={feature.key} onChange={(event) => setFeatures((items) => items.map((item, i) => i === index ? { ...item, key: event.target.value } : item))} /><input aria-label="Feature value" type="number" step="any" placeholder="Numeric value" value={feature.value} onChange={(event) => setFeatures((items) => items.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} /></div>)}<button className="button-quiet" onClick={() => setFeatures((items) => [...items, { key: "", value: "" }])}>Add feature</button>{error && <p className="inline-error">{error}</p>}<button className="button-primary" onClick={() => void runPrediction()} disabled={mutation.isPending || cycles.isLoading}>{mutation.isPending ? "Predicting…" : "Generate prediction"}</button></section><section className="panel result-panel"><span className="eyebrow">PREDICTION RESULT</span><h2>{display(result?.predicted_yield, " tons")}</h2>{result ? <><div className="summary-row"><span>Confidence</span><strong>{display(Number(result.confidence ?? 0) * 100, "%")}</strong></div><div className="summary-row"><span>Expected harvest</span><strong>{dateText(result.expected_harvest)}</strong></div><div className="summary-row"><span>Model version</span><strong>{String(result.model_version ?? "—")}</strong></div></> : <StateBlock title="No prediction generated" detail="Results require a configured backend model and valid feature inputs." />}</section></div>
    <section className="panel chart-panel"><span className="eyebrow">HISTORY</span><h2>Prediction history</h2>{!cycleId ? <StateBlock title="Choose a crop cycle" detail="Select a cycle above to load its prediction history." /> : history.isLoading ? <StateBlock title="Loading prediction history…" /> : history.error ? <StateBlock title="Unable to load prediction history" detail={history.error.message} retry={() => void history.refetch()} /> : historyData.length ? <><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><LineChart data={[...historyData].reverse()}><CartesianGrid stroke="#e8ece7" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} /><YAxis yAxisId="yield" tickLine={false} axisLine={false} /><YAxis yAxisId="confidence" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} width={35} /><Tooltip /><Line yAxisId="yield" type="monotone" dataKey="yield" name="Predicted yield (tons)" stroke="#347b56" strokeWidth={2} dot={{ r: 3 }} /><Line yAxisId="confidence" type="monotone" dataKey="confidence" name="Confidence (%)" stroke="#397a9b" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div><div className="field-note">This endpoint contains model predictions, not recorded harvest yields.</div></> : <StateBlock title="No prediction history" detail="No saved prediction records were returned for this crop cycle." />}</section>
  </>;
}

function SatelliteView({ farm, farmId }: { farm?: Farm; farmId: string }) {
  const [index, setIndex] = useState<"ndvi" | "evi" | "ndwi" | "stress-zones">("ndvi");
  const observations = useQuery({ queryKey: ["satellite-index", farmId, index], queryFn: () => gisApi.index(farmId, index), enabled: Boolean(farmId) });
  const map = useQuery({ queryKey: ["farm-map", farmId], queryFn: () => farmsApi.healthMap(farmId), enabled: Boolean(farmId) });
  const metric = index.toUpperCase();
  const chartData = (observations.data ?? []).map((item, position) => ({ name: String(item.field_id ?? `Field ${position + 1}`).slice(0, 10), value: Number(item[index === "stress-zones" ? "ndvi" : index]) })).filter((item) => Number.isFinite(item.value));
  return <>
    <PageHeading eyebrow="REMOTE SENSING" title="Satellite intelligence" detail="Browse latest field indices and stress zones returned by the GIS service." />
    <div className="satellite-controls">{(["ndvi", "evi", "ndwi", "stress-zones"] as const).map((item) => <button key={item} className={index === item ? "segment active" : "segment"} onClick={() => setIndex(item)}>{item === "stress-zones" ? "Water stress" : item.toUpperCase()}</button>)}</div>
    <div className="satellite-grid"><section className="panel map-panel"><div className="section-heading"><div><span className="eyebrow">LATEST FIELD LAYERS</span><h2>{metric} overview</h2></div></div>{map.isLoading ? <StateBlock title="Loading map…" /> : map.error ? <StateBlock title="Unable to load map" detail={map.error.message} retry={() => void map.refetch()} /> : map.data ? <FarmMap data={map.data} farm={farm} /> : <StateBlock title="No GIS data available" />}</section><aside className="panel satellite-summary"><span className="eyebrow">SCAN SUMMARY</span><h2>{farm?.name ?? "Selected farm"}</h2><div className="summary-row"><span>Last observation</span><strong>{dateText(map.data?.features.find((item) => item.properties.observed_at)?.properties.observed_at)}</strong></div><div className="summary-row"><span>Mapped fields</span><strong>{map.data?.features.length ?? "—"}</strong></div><div className="summary-row"><span>Latest {metric}</span><strong>{chartData.length ? display(chartData.reduce((total, item) => total + item.value, 0) / chartData.length) : "—"}</strong></div><div className="summary-row"><span>Stress zones</span><strong>{index === "stress-zones" ? observations.data?.length ?? "—" : "Select layer"}</strong></div></aside></div>
    <section className="panel chart-panel"><div className="section-heading"><div><span className="eyebrow">FIELD MEASUREMENTS</span><h2>{metric} by field</h2></div></div>{observations.isLoading ? <StateBlock title="Loading satellite measurements…" /> : observations.error ? <StateBlock title="Satellite layer unavailable" detail={observations.error.message} retry={() => void observations.refetch()} /> : chartData.length ? <div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid stroke="#e8ece7" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="value" fill="#397a9b" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div> : <StateBlock title="No satellite observations" detail="No measurements are currently available for this layer." />}</section>
  </>;
}

function WeatherView({ farmId }: { farmId: string }) {
  const current = useQuery({ queryKey: ["weather", farmId], queryFn: () => weatherApi.current(farmId), enabled: Boolean(farmId) });
  const forecast = useQuery({ queryKey: ["forecast", farmId], queryFn: () => weatherApi.forecast(farmId), enabled: Boolean(farmId) });
  return <>
    <PageHeading eyebrow="LOCAL CONDITIONS" title="Weather" detail="Current conditions and forecast from the farm weather integration." />
    {current.isLoading ? <div className="panel"><StateBlock title="Loading weather…" /></div> : current.error ? <div className="panel"><StateBlock title="Unable to load current weather" detail={current.error.message} retry={() => void current.refetch()} /></div> : <div className="metric-grid four"><Metric label="Temperature" value={current.data?.temperature} suffix="°C" icon={CloudSun} tone="amber" /><Metric label="Humidity" value={current.data?.humidity} suffix="%" icon={Droplets} tone="blue" /><Metric label="Rain probability" value={current.data?.rain_probability} suffix="%" icon={ArrowDownRight} /><Metric label="Wind speed" value={current.data?.wind_speed} suffix=" km/h" icon={Activity} tone="blue" /></div>}
    <section className="panel table-panel"><div className="section-heading"><div><span className="eyebrow">OUTLOOK</span><h2>Forecast</h2></div></div>{forecast.isLoading ? <StateBlock title="Loading forecast…" /> : forecast.error ? <StateBlock title="Forecast unavailable" detail={forecast.error.message} retry={() => void forecast.refetch()} /> : forecast.data?.length ? <div className="table-scroll"><table><thead><tr><th>Forecast for</th><th>Condition</th><th>Temperature</th><th>Rain chance</th><th>Wind</th></tr></thead><tbody>{forecast.data.map((item, index) => <tr key={String(item.id ?? index)}><td>{dateText(item.forecast_for)}</td><td>{String(item.weather_condition ?? "—")}</td><td>{display(item.temperature, " °C")}</td><td>{display(item.rain_probability, "%")}</td><td>{display(item.wind_speed)}</td></tr>)}</tbody></table></div> : <StateBlock title="No forecast available" detail="Forecast data has not been returned for this farm." />}</section>
  </>;
}

function AlertsView() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["alerts"], queryFn: alertsApi.list });
  const read = useMutation({ mutationFn: alertsApi.markRead, onSuccess: () => void client.invalidateQueries({ queryKey: ["alerts"] }) });
  const alerts = query.data ?? [];
  return <>
    <PageHeading eyebrow="FARM EVENTS" title="Alerts" detail={`${alerts.filter((alert) => !alert.is_read).length} unread alerts`} />
    <section className="panel alerts-page">{query.isLoading ? <StateBlock title="Loading alerts…" /> : query.error ? <StateBlock title="Unable to load alerts" detail={query.error.message} retry={() => void query.refetch()} /> : alerts.length ? <div className="alert-list">{alerts.map((alert) => <AlertRow key={alert.id} alert={alert} onRead={!alert.is_read ? () => read.mutate(alert.id) : undefined} />)}</div> : <StateBlock title="You are all caught up" detail="No alerts have been returned by the API." />}</section>
  </>;
}

function FinanceView({ farmId }: { farmId: string }) {
  const query = useQuery({ queryKey: ["finance", farmId], queryFn: () => financeApi.summary(farmId), enabled: Boolean(farmId) });
  const currency = query.data?.currency ?? "INR";
  const chartData = query.data ? [{ name: "Revenue", amount: query.data.revenue }, { name: "Expenses", amount: query.data.expenses }, { name: "Profit", amount: query.data.profit }] : [];
  return <>
    <PageHeading eyebrow="FARM PERFORMANCE" title="Farm finance" detail="Aggregated totals from recorded revenue and expenses." />
    {query.isLoading ? <div className="panel"><StateBlock title="Loading finance summary…" /></div> : query.error ? <div className="panel"><StateBlock title="Unable to load farm finance" detail={query.error.message} retry={() => void query.refetch()} /></div> : query.data ? <div className="metric-grid three"><Metric label="Revenue" value={query.data.revenue} suffix={` ${currency}`} icon={ArrowUpRight} /><Metric label="Expenses" value={query.data.expenses} suffix={` ${currency}`} icon={ArrowDownRight} tone="amber" /><Metric label="Estimated profit" value={query.data.profit} suffix={` ${currency}`} icon={TrendingUp} /></div> : <div className="panel"><StateBlock title="Select a farm" detail="Choose a farm to load its finance summary." /></div>}
    <section className="panel chart-panel"><div className="section-heading"><div><span className="eyebrow">ALL-TIME TOTALS</span><h2>Revenue and expense comparison</h2></div></div>{chartData.length ? <div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid stroke="#e8ece7" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip formatter={(value) => [`${currency} ${Number(value).toLocaleString("en-IN")}`, "Amount"]} /><Bar dataKey="amount" radius={[3, 3, 0, 0]}>{chartData.map((item) => <Cell key={item.name} fill={item.name === "Expenses" ? "#c58b35" : item.name === "Profit" ? "#397a9b" : "#347b56"} />)}</Bar></BarChart></ResponsiveContainer></div> : <StateBlock title="No finance totals" detail="No finance data is available for this farm." />}<p className="field-note">The backend currently provides aggregate totals only; transaction history and category breakdowns are not available here.</p></section>
  </>;
}

function SettingsView({ user, logout }: { user: { name: string; email: string; role: string }; logout: () => Promise<void> }) {
  return <>
    <PageHeading eyebrow="ACCOUNT & ACCESS" title="Settings" detail="Account information and session controls." />
    <section className="panel settings-panel"><div className="profile-monogram">{user.name.slice(0, 1).toUpperCase()}</div><div><span className="eyebrow">SIGNED IN AS</span><h2>{user.name}</h2><p>{user.email}</p></div><span className="role-badge">{user.role}</span></section>
    <section className="panel settings-panel"><div><h2>Authentication</h2><p>Session tokens are held in this browser session and rotated through the backend.</p></div><button className="button-secondary" onClick={() => void logout()}><LogOut size={16} />Sign out</button></section>
    <section className="panel settings-panel"><div><h2>Connected API</h2><p>API base URL</p></div><code className="api-url">{process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1"}</code></section>
  </>;
}

export function Workspace() {
  const pathname = usePathname();
  const router = useRouter();
  const client = useQueryClient();
  const { user, ready, logout } = useAuth();
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const pathParts = pathname.split("/").filter(Boolean);
  const section = pathParts[0] ?? "dashboard";
  const detailFarmId = section === "farms" && pathParts.length > 1 ? pathParts[1] : "";
  const currentLink = navigation.find((item) => item.href === `/${section}`);
  const pageTitle = currentLink?.label ?? (detailFarmId ? "Farm details" : "Dashboard");
  const farms = useQuery({ queryKey: ["farms"], queryFn: farmsApi.list, enabled: ready && Boolean(user) });
  const activeFarmId = selectedFarmId || farms.data?.[0]?.id || "";
  const routeFarmId = detailFarmId || activeFarmId;
  const farm = farms.data?.find((item) => item.id === activeFarmId);
  const dashboard = useQuery({ queryKey: ["dashboard", routeFarmId], queryFn: () => farmsApi.dashboard(routeFarmId), enabled: ready && Boolean(user) && Boolean(routeFarmId) && ["dashboard", "crop-health", "farms"].includes(section) });
  const fields = useQuery({ queryKey: ["fields", activeFarmId], queryFn: () => fieldsApi.list(activeFarmId), enabled: ready && Boolean(user) && Boolean(activeFarmId) && ["farms", "crop-health", "disease-detection", "irrigation", "yield-prediction"].includes(section) });
  const mapData = useQuery({ queryKey: ["farm-map", activeFarmId], queryFn: () => farmsApi.healthMap(activeFarmId), enabled: ready && Boolean(user) && Boolean(activeFarmId) && ["dashboard", "crop-health"].includes(section) });
  const finance = useQuery({ queryKey: ["finance", activeFarmId], queryFn: () => financeApi.summary(activeFarmId), enabled: ready && Boolean(user) && Boolean(activeFarmId) && section === "dashboard" });

  useEffect(() => { if (ready && !user && pathname !== "/login") window.location.replace("/login"); }, [ready, user, pathname]);

  const navigateTo = (href: string) => { setMobileNav(false); router.push(href); };
  const selectFarm = (id: string) => setSelectedFarmId(id);
  const matchingLinks = useMemo(() => navigation.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())), [search]);
  const signOut = async () => { await logout(); client.clear(); router.replace("/login"); };

  if (!ready || !user) return <main className="auth-loading"><div className="loading-brand"><span className="brand-mark">A</span> AgriNexa</div><div className="skeleton auth-loading-bar" /></main>;

  let content: React.ReactNode;
  if (section === "farms" && detailFarmId) content = <FarmDetailView farmId={detailFarmId} />;
  else if (section === "farms") content = farms.isLoading ? <div className="panel"><StateBlock title="Loading farms…" /></div> : farms.error ? <div className="panel"><StateBlock title="Unable to load farms" detail={farms.error.message} retry={() => void farms.refetch()} /></div> : <FarmsView farms={farms.data ?? []} selectedFarmId={selectedFarmId} onSelect={selectFarm} />;
  else if (section === "dashboard") content = <QueryState loading={Boolean(routeFarmId && dashboard.isLoading)} error={dashboard.error} retry={() => void dashboard.refetch()}><DashboardView farm={farm} dashboard={dashboard.data} farmId={routeFarmId} finance={finance.data} onNavigate={navigateTo} /></QueryState>;
  else if (section === "crop-health") content = <CropHealthView farmId={activeFarmId} fields={fields.data ?? []} dashboard={dashboard.data} mapData={mapData.data} />;
  else if (section === "ai-assistant") content = <AssistantView farmId={activeFarmId} />;
  else if (section === "disease-detection") content = <DiseaseView fields={fields.data ?? []} />;
  else if (section === "irrigation") content = <IrrigationView fields={fields.data ?? []} />;
  else if (section === "yield-prediction") content = <YieldView farmId={selectedFarmId} fields={fields.data ?? []} />;
  else if (section === "satellite") content = <SatelliteView farm={farm} farmId={activeFarmId} />;
  else if (section === "weather") content = <WeatherView farmId={activeFarmId} />;
  else if (section === "alerts") content = <AlertsView />;
  else if (section === "finance") content = <FinanceView farmId={activeFarmId} />;
  else if (section === "settings") content = <SettingsView user={user} logout={signOut} />;
  else content = <div className="panel"><StateBlock title="Page not found" detail="Choose a workspace section from the navigation." /></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <Link href="/dashboard" className="brand-lockup" onClick={() => setMobileNav(false)}><span className="brand-mark">A</span><span>AgriNexa<small>FARM INTELLIGENCE</small></span></Link>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="side-navigation">{navigation.map((item) => { const Icon = item.icon; const active = section === item.href.slice(1) || (item.href === "/farms" && detailFarmId); return <Link key={item.href} href={item.href} onClick={() => setMobileNav(false)} className={`nav-link ${active ? "nav-active" : ""}`}><Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{item.href === "/alerts" && <span className="nav-indicator" />}</Link>; })}</nav>
      <div className="sidebar-bottom"><div className="connection-status"><span className="status-dot" /><span>API session active</span></div><button className="side-signout" onClick={() => void signOut()}><LogOut size={15} />Sign out</button></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <div className="main-column"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" title="Open navigation" onClick={() => setMobileNav(true)}><Menu size={19} /></button><div className="global-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && matchingLinks[0]) { navigateTo(matchingLinks[0].href); setSearch(""); } }} placeholder="Search workspace" aria-label="Search workspace" />{search && <div className="search-results">{matchingLinks.length ? matchingLinks.map((item) => <button key={item.href} onClick={() => { navigateTo(item.href); setSearch(""); }}>{item.label}</button>) : <span>No matching section</span>}</div>}</div></div><div className="topbar-actions"><label className="farm-selector"><Sprout size={16} /><select value={activeFarmId} onChange={(event) => selectFarm(event.target.value)} aria-label="Select farm"><option value="">Select a farm</option>{(farms.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {display(item.area_acres, " ac")}</option>)}</select><ChevronDown size={13} /></label><Link className="header-alerts" href="/alerts" aria-label="View alerts"><AlertTriangle size={17} /></Link><button className="profile-button" title="Open settings" onClick={() => navigateTo("/settings")}><span>{user.name.slice(0, 1).toUpperCase()}</span><strong>{user.name}</strong><ChevronDown size={13} /></button></div></header>
      <main className="workspace-content"><div className="content-route-heading"><span>{pageTitle}</span><span>{farm?.location_name ?? "AgriNexa workspace"}</span></div>{farms.isError && section !== "farms" && <div className="global-error" role="alert">Farm list unavailable: {farms.error.message}<button className="button-quiet" onClick={() => void farms.refetch()}>Retry</button></div>}{content}</main>
      <footer className="workspace-footer"><span>AGRINEXA FIELD INTELLIGENCE</span><span>Farm data <i /> AI analysis <i /> Farmer action</span></footer>
    </div>
  </div>;
}