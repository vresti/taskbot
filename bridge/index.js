// ============================================================
//  TASKBOT BRIDGE — WhatsApp personal
//  Puerto 3001 · PM2 name: taskbot-bridge
//  Victor · tasks-on.com · 2026
// ============================================================

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode  = require('qrcode-terminal');
const express = require('express');
const cors    = require('cors');

// ── CONFIG ────────────────────────────────────────────────────
var API_URL = 'https://script.google.com/macros/s/AKfycbxw-68nGGiJVxzHMCCAzFX0YsUzSN58T_mtdvLsB1VSSYA-4oWPHCZ1hoV16Fxap5p_fg/exec';
var TOKEN   = 'taskbot2026victor';
var PUERTO  = 3001;

// ── WhatsApp client ──────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'taskbot' }),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', qr => {
  console.log('\n📱 Escanear con WhatsApp → Dispositivos vinculados:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ TASKBOT BRIDGE CONECTADO — ' + new Date().toLocaleString());
  setInterval(enviarPendientes, 5000);
});

client.on('disconnected', reason => {
  console.log('⚠️  Bridge desconectado:', reason);
});

client.initialize();

// ── Poll y envío de pendientes ────────────────────────────────
async function enviarPendientes() {
  try {
    var url = API_URL + '?action=getPendienteBridge&token=' + TOKEN;
    var res  = await fetch(url);
    var data = await res.json();

    if (data.status !== 'ok') return;

    var tel     = data.telefono.replace(/\D/g, '');
    var chatId  = tel + '@c.us';
    var mensaje = data.mensaje;

    await client.sendMessage(chatId, mensaje);
    console.log('📤 WS enviado → ' + tel + ' | ' + mensaje.substring(0, 60));
  } catch (err) {
    // silencioso — logs solo errores reales
    if (err.message && !err.message.includes('vacio')) {
      console.error('❌ enviarPendientes:', err.message);
    }
  }
}

// ── Express — health check ────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

app.get('/status', (req, res) => {
  res.json({ status: 'ok', bridge: 'taskbot', ts: new Date().toISOString() });
});

app.listen(PUERTO, () => {
  console.log('🚀 Taskbot Bridge escuchando en puerto ' + PUERTO);
});