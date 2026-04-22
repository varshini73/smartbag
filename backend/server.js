require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const path     = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(e  => console.error("❌ MongoDB error:", e.message));

// ── Schemas ──────────────────────────────────────────────────

const AlertSchema = new mongoose.Schema({
  trigger:   { type: String, default: "SOS" },
  latitude:  { type: Number, default: null },
  longitude: { type: Number, default: null },
  source:    { type: String, enum: ["hardware","web","macrodroid"], default: "hardware" },
  timestamp: { type: Date, default: Date.now }
});
const Alert = mongoose.model("Alert", AlertSchema);

const ZoneSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: "" },
  latitude:    { type: Number, required: true },
  longitude:   { type: Number, required: true },
  severity:    { type: String, enum: ["low","medium","high"], default: "medium" },
  category:    { type: String, enum: ["dark_area","harassment","theft","other"], default: "other" },
  reportedBy:  { type: String, default: "anonymous" },
  upvotes:     { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now }
});
const Zone = mongoose.model("Zone", ZoneSchema);

// ── Routes ───────────────────────────────────────────────────

app.get("/api/health", (_, res) => {
  res.json({ ok: true, time: new Date() });
});

// POST /api/alerts
app.post("/api/alerts", async (req, res) => {
  try {
    let { trigger, latitude, longitude, source } = req.body;

    // MacroDroid sends lat/lng as strings — parse them
    // Also handle "[LOCATION_LAT]" placeholder if GPS unavailable
    latitude  = parseFloat(latitude)  || null;
    longitude = parseFloat(longitude) || null;

    const alert = await Alert.create({ trigger, latitude, longitude, source });
    console.log(`🆘 Alert: ${source} | lat:${latitude} lng:${longitude} | ${new Date().toLocaleTimeString()}`);
    res.status(201).json({ success: true, data: alert });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/alerts
app.get("/api/alerts", async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, data: alerts });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/zones
app.get("/api/zones", async (req, res) => {
  try {
    const zones = await Zone.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: zones });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/zones
app.post("/api/zones", async (req, res) => {
  try {
    const { title, description, latitude, longitude, severity, category, reportedBy } = req.body;
    if (!title || !latitude || !longitude)
      return res.status(400).json({ error: "title, latitude, longitude required" });
    const zone = await Zone.create({ title, description, latitude, longitude, severity, category, reportedBy });
    res.status(201).json({ success: true, data: zone });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH /api/zones/:id/upvote
app.patch("/api/zones/:id/upvote", async (req, res) => {
  try {
    const zone = await Zone.findByIdAndUpdate(req.params.id, { $inc: { upvotes: 1 } }, { new: true });
    res.json({ success: true, data: zone });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/zones/:id
app.delete("/api/zones/:id", async (req, res) => {
  try {
    await Zone.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 SmartBag → http://localhost:${PORT}`);
});