require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const express = require("express");
const fs = require("fs");
const path = require("path");

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 10000;

// ====== Настройки ======
const allowedNumbers = new Set([
  "380666004217",
  "380932480426",
  "380991294876",
  "380996200915",
  "380501426662",
  "380509883211",
  "380951040003",
  "380508435192",
  "380983311412",
  "380992951015"
]);

const groupChatId = -1002962297388; // твой chat_id
const groupInviteLink = "https://t.me/+s8WYdCNs-EgxM2Qy"; // ссылка на группу

// ====== JSON для хранения подтверждённых пользователей ======
const dataFile = path.join(__dirname, "verifiedUsers.json");
let verifiedUsers = new Set();
if (fs.existsSync(dataFile)) {
  const raw = fs.readFileSync(dataFile);
  try {
    const arr = JSON.parse(raw);
    verifiedUsers = new Set(arr);
  } catch (e) {
    console.error("Ошибка чтения verifiedUsers.json:", e);
  }
}

function saveVerifiedUsers() {
  fs.writeFileSync(dataFile, JSON.stringify([...verifiedUsers]));
}

// ====== Команды бота ======

// /start — просит отправить контакт
bot.start((ctx) => {
  ctx.reply(
    "Привет! Чтобы получить доступ к группе, поделись своим контактом:",
    Markup.keyboard([[Markup.button.contactRequest("Поделиться контактом 📲")]]).oneTime().resize()
  );
});

// Обработка контакта
bot.on("contact", async (ctx) => {
  const c = ctx.message.contact;
  if (!c || !c.phone_number) return ctx.reply("Не удалось получить контакт, попробуй снова.");

  if (typeof c.user_id === "undefined" || c.user_id !== ctx.from.id) {
    return ctx.reply("Невозможно подтвердить, что контакт твой. Нажми кнопку и отправь свой контакт.");
  }

  const normalized = c.phone_number.replace(/\D/g, "");
  if (allowedNumbers.has(normalized)) {
    verifiedUsers.add(ctx.from.id);
    saveVerifiedUsers();
    await ctx.reply(`Номер подтверждён ✅ Вот ссылка на группу: ${groupInviteLink}`);
  } else {
    await ctx.reply("Твой номер не найден в списке разрешённых.");
  }
});

// Обработка новых участников группы
bot.on("chat_member", async (ctx) => {
  const member = ctx.chatMember?.new_chat_member?.user;
  if (!member) return;

  if (!verifiedUsers.has(member.id)) {
    try {
      await ctx.telegram.kickChatMember(ctx.chat.id, member.id);
      console.log(`User ${member.username || member.id} кикнут, не подтвердил номер.`);
    } catch (err) {
      console.error("Ошибка при кике:", err);
    }
  }
});

// Обработка кнопки "Отмена"
bot.hears("Отмена", (ctx) => ctx.reply("Отмена. Если нужно — используй /start снова."));

// ====== Webhook для Render ======
app.use(bot.webhookCallback(`/webhook/${process.env.BOT_TOKEN}`));

app.get("/", (req, res) => {
  res.send("Бот работает 🚀");
});

// выставляем webhook у Telegram
bot.telegram.setWebhook(
  `https://tgbot-9786.onrender.com/webhook/${process.env.BOT_TOKEN}`
);

app.listen(PORT, () => {
  console.log(`Web server запущен на порту ${PORT}`);
});
