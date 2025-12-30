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
  const BASE_URL = process.env.BASE_URL || `http://localhost:3000`;
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
const canvas = document.getElementById('poster');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
let time = 0;

// ---------- IMMAGINI PERSONE ----------
const leftPerson = new Image();
leftPerson.src = '/left_person.png';
const rightPerson = new Image();
rightPerson.src = '/right_person.png';

let imagesReady = false;
let loadedCount = 0;
[leftPerson,rightPerson].forEach(img=>{
  img.onload = ()=>{
    loadedCount++;
    if(loadedCount===2) imagesReady=true;
  }
});

// ---------- STELLE ----------
const stars = Array.from({length:520},() => ({
  x:Math.random()*W,
  y:Math.random()*H,
  r:Math.random()*1.2+0.3,
  a:Math.random()*0.6+0.3
}));

// ---------- STELLA CADENTE ----------
const shootingStar = { x:Math.random()*W, y:Math.random()*H*0.4, active:false, wait:400 };

// ---------- FUNZIONI DI DISEGNO ----------
function drawSky(){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#000'); g.addColorStop(0.4,'#020015'); g.addColorStop(1,'#070030');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}

function drawNebula(x,y,color){
  const r=360;
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);
  g.addColorStop(0.6,'rgba(0,0,0,0.05)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
}

function drawStars(){
  stars.forEach(s=>{
    const flicker=0.03*Math.sin(time*0.5+s.x);
    ctx.fillStyle = \`rgba(255,255,255,\${s.a+flicker})\`;
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
  });
}

function drawShootingStar(){
  if(!shootingStar.active){
    shootingStar.wait--;
    if(shootingStar.wait<=0){
      shootingStar.active=true;
      shootingStar.x=Math.random()*W;
      shootingStar.y=Math.random()*H*0.4;
    }
    return;
  }
  ctx.strokeStyle='rgba(255,255,255,0.8)';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(shootingStar.x,shootingStar.y);
  ctx.lineTo(shootingStar.x-120,shootingStar.y+60);
  ctx.stroke();
  shootingStar.x-=6; shootingStar.y+=3;
  if(shootingStar.x<-200 || shootingStar.y>H+200){
    shootingStar.active=false;
    shootingStar.wait=500+Math.random()*500;
  }
}

function drawPeople(){
  if(!imagesReady) return;
  const groundY = H/2 + 120;
  const pw = 100, ph = 240;

  // ---------- Persona sinistra con glow bianco ----------
  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,0.6)'; // bianco luminoso
  ctx.shadowBlur = 25;                        // sfumatura
  ctx.drawImage(leftPerson, 80, groundY-ph, pw, ph);
  ctx.restore();

  // ---------- Persona destra girata ----------
  ctx.save();
  ctx.translate(W-80, groundY-ph);
  ctx.scale(-1,1);
  ctx.shadowColor = 'rgba(255,255,255,0.8)';
  ctx.shadowBlur = 20;
  ctx.drawImage(rightPerson, 0, 0, pw, ph);
  ctx.restore();
}

// ---------- ANIMAZIONE ----------
function animate(){
  ctx.clearRect(0,0,W,H);
  drawSky();
  drawNebula(W*0.35,H*0.35,'rgba(120,80,255,0.12)');
  drawNebula(W*0.7,H*0.45,'rgba(80,200,255,0.08)');
  drawStars();
  drawShootingStar();
  drawPeople();
  time+=0.01;
  requestAnimationFrame(animate);
}

animate();
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
app.listen(PORT, () => console.log(`🌙 Server attivo sulla porta ${PORT}`));
