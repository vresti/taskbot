const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode  = require('qrcode-terminal');
const express = require('express');
const cors    = require('cors');

var API_URL = 'https://script.google.com/macros/s/AKfycbxw-68nGGiJVxzHMCCAzFX0YsUzSN58T_mtdvLsB1VSSYA-4oWPHCZ1hoV16Fxap5p_fg/exec';
var TOKEN   = 'taskbot2026victor';
var PUERTO  = 3001;

var isReady   = false;
var pollTimer = null;

function crearCliente() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', qr => {
    console.log('\n=== ESCANEÁ ESTE QR CON WHATSAPP ===\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    isReady = true;
    console.log('\n✅ TASKBOT BRIDGE CONECTADO — ' + new Date().toLocaleString());
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => enviarPendientes(client), 5000);
  });

  client.on('disconnected', reason => {
    isReady = false;
    console.log('⚠️  Bridge desconectado:', reason, '— reconectando en 10s...');
    if (pollTimer) clearInterval(pollTimer);
    setTimeout(() => {
      try { client.destroy(); } catch(e) {}
      setTimeout(crearCliente, 3000);
    }, 10000);
  });

  client.on('auth_failure', () => {
    isReady = false;
    console.log('❌ Auth failure — reconectando...');
    if (pollTimer) clearInterval(pollTimer);
    setTimeout(() => {
      try { client.destroy(); } catch(e) {}
      setTimeout(crearCliente, 3000);
    }, 5000);
  });

  client.initialize();
  return client;
}

async function enviarPendientes(client) {
  if (!isReady) return;
  try {
    var url  = API_URL + '?action=getPendienteBridge&token=' + TOKEN;
    var res  = await fetch(url);
    var data = await res.json();
    if (data.status !== 'ok') return;
    var tel      = data.telefono.replace(/\D/g, '');
    var numberId = await client.getNumberId(tel);
    if (!numberId) { console.error('❌ Número no encontrado en WA: ' + tel); return; }
    await client.sendMessage(numberId._serialized, data.mensaje);
    console.log('📤 WS enviado → ' + tel);
  } catch (err) {
    if (!err.message) return;
    if (err.message.includes('detached Frame') || err.message.includes('Target closed')) {
      console.log('⚠️  Chromium caído — marcando como no listo');
      isReady = false;
    } else if (!err.message.includes('vacio') && !err.message.includes('DOCTYPE')) {
      console.error('❌ enviarPendientes:', err.message);
    }
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/status', (req, res) => {
  res.json({ status: 'ok', ready: isReady, bridge: 'taskbot', ts: new Date().toISOString() });
});

app.listen(PUERTO, () => {
  console.log('🚀 Taskbot Bridge escuchando en puerto ' + PUERTO);
});

console.log('Iniciando WhatsApp Web...');
crearCliente();