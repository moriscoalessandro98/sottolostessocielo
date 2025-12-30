const express = require('express');
const mongoose = require('mongoose');
const QRCode = require('qrcode');

const app = express();
app.use(express.static('public')); // left_person.png e right_person.png
app.use(express.json());

// ---------- MONGODB ----------
mongoose.connect(process.env.MONGO_URI);
mongoose.connection.on('error', err => console.error('MongoDB error:', err));
mongoose.connection.once('open', () => console.log('MongoDB connesso ✅'));

// ---------- SCHEMA ----------
const DreamSchema = new mongoose.Schema({
  dream: String,
  createdAt: { type: Date, default: Date.now }
});

const Dream = mongoose.model('Dream', DreamSchema, 'SOGNI_RICEVUTI');

// ---------- POST DREAM ----------
app.post('/api/dream', async (req, res) => {
  try {
    const { dream } = req.body;
    if (!dream) return res.status(400).send('Manca il dream');
    await Dream.create({ dream });
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// ---------- GENERA QR CODE SU POSTER ----------
app.get('/generateQR', async (req, res) => {
  const BASE_URL = process.env.BASE_URL;
  const url = `${BASE_URL}/index.html`; // URL senza ID
  try {
    const qr = await QRCode.toDataURL(url);

    res.send(`
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Sotto lo stesso cielo</title>
<style>
html,body{
  margin:0; padding:0; background:#000; height:100%; overflow:hidden;
  display:flex; justify-content:center; align-items:center;
}
canvas { display:block; }

.qr-container{
  position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%);
  text-align:center; z-index:10;
}
.qr-container img{ width:250px; height:250px; }
.qr-container h3{
  color:white; margin-top:10px; font-size:18px; line-height:1.3;
}
</style>
</head>
<body>

<canvas id="poster" width="800" height="1200"></canvas>

<div class="qr-container">
  <img src="${qr}" alt="QR Code">
  <h3>Siamo sotto lo stesso cielo,<br>guardiamo le stesse stelle,<br>eppure in pochi sanno vederle</h3>
</div>

<script>
// qui va lo stesso codice di animazione del cielo/stelle/persone
</script>

</body>
</html>
    `);

  } catch(err) {
    res.status(500).send(err);
  }
});

// ---------- SERVER ----------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌙 Server attivo sulla porta ${PORT}`);
});
