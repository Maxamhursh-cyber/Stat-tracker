require('dotenv').config();

const express = require('express');
const path = require('path');
const { initSchema } = require('./db/pool');
const exportRoutes = require('./routes/export');
const pageRoutes = require('./routes/pages');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

app.use('/api', exportRoutes);
app.use('/api', dashboardRoutes);
app.use('/', pageRoutes);

app.get('/healthz', (req, res) => res.json({ ok: true }));

initSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Madden stat tracker listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  });
