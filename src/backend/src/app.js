require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const authRoutes = require("./routes/auth.routes");
const activitiesRoutes = require("./routes/activities.routes");
const newsRoutes = require("./routes/news.routes");
const path = require('path');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
// ensure common dev origins are allowed even if .env wasn't reloaded right away
if (!allowedOrigins.includes("http://localhost:3000")) allowedOrigins.push("http://localhost:3000");
if (!allowedOrigins.includes("http://localhost:3001")) allowedOrigins.push("http://localhost:3001");
app.use(
  cors({
    origin: function (origin, callback) {
      // allow non-browser requests or same-origin (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/admin", require("./routes/admin.dashboard.routes"));
app.use("/api/admin", require("./routes/admin.users.routes"));
app.use("/api/admin", require("./routes/admin.activities.routes"));
app.use("/api/admin", require("./routes/admin.news.routes"));
app.use("/api/admin", require("./routes/admin.documents.routes"));
app.use("/api/admin", require("./routes/admin.forms.routes"));
app.use("/api", require("./routes/forms.routes"));
app.use("/api", require("./routes/documents.routes"));


// test DB
app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: rows[0].ok === 1 });
  } catch (err) {
    res.status(500).json({ ok: false, message: "DB error", detail: String(err.message || err) });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/news", newsRoutes);

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`✅ Backend running: http://localhost:${port}`));
