'use strict';

const express = require('express');
const client = require('prom-client');

// Application HTTP : ingestion des rapports clients + consultation des parties en cours.
function createApp({ fleet, log }) {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  const register = new client.Registry();
  const httpDuration = new client.Histogram({ name: 'http_request_duration_seconds', help: 'HTTP request duration', labelNames: ['method', 'path', 'status'], registers: [register] });
  const reports = new client.Counter({ name: 'perf_reports_total', help: 'Performance reports', labelNames: ['reason', 'build'], registers: [register] });
  new client.Gauge({ name: 'games_in_progress', help: 'Games in progress', registers: [register], collect() { this.set(fleet ? fleet.games.size : 0); } });
  fleet?.on('log', (l) => { if (l.event === 'perf_spike') reports.labels(l.report.reason, l.report.build).inc(); });

  app.use((req, res, next) => {
    const t0 = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6;
      log({ ts: new Date().toISOString(), level: 'info', event: 'http_request', method: req.method, path: req.route?.path ?? req.path, status: res.statusCode, durationMs: Math.round(durationMs * 100) / 100 });
      httpDuration.labels(req.method, req.route?.path ?? req.path, res.statusCode).observe(durationMs / 1000);
    });
    next();
  });

  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

  app.get('/metrics', async (req, res) => res.type(register.contentType).send(await register.metrics()));

  app.get('/api/games', (req, res) => res.json(fleet ? fleet.liveGames() : []));

  app.post('/api/reports', (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || !body.report || !body.server) {
      return res.status(400).json({ error: 'expected { report, server }' });
    }
    const { report } = body;
    if (typeof report.id !== 'string' || !/^P-[0-9a-f]{8}-\d+$/.test(report.id)) {
      return res.status(422).json({ error: 'invalid report id' });
    }
    // Simule un traitement plus lent quand le rapport est gros (analyse, enrichissement)
    const size = JSON.stringify(body).length;
    const busy = Date.now() + Math.min(40, size / 400);
    while (Date.now() < busy) { /* travail synchrone volontaire */ }
    log({ ts: new Date().toISOString(), level: 'warn', event: 'perf_spike', source: 'ingest', report, server: body.server });
    reports.labels(report.reason, report.build).inc();
    return res.status(202).json({ accepted: report.id });
  });

  app.use((err, req, res, _next) => {
    log({ ts: new Date().toISOString(), level: 'error', event: 'http_error', message: err.message, path: req.path });
    res.status(err.status ?? 500).json({ error: 'internal' });
  });

  return app;
}

module.exports = { createApp };