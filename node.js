require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");

const bot = new Telegraf(process.env.BOT_TOKEN);

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

const groupChatId = -1001234567890; // ID твоей группы
const groupInviteLink = "https://t.me/joinchat/AAAAAAAAAAAAAAA"; // ссылка на группу

// ====== JSON для хранения подтверждённых пользователей ======
const dataFile = path.join(__dirname, "verifiedUsers.json");

// Загрузить подтверждённых пользователей при старте
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

// Сохранить verifiedUsers в JSON
function saveVerifiedUsers() {
  fs.writeFileSync(dataFile, JSON.stringify([...verifiedUsers]));
}

// =======================

// Команда /start — просит отправить контакт
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
    saveVerifiedUsers(); // сохраняем в JSON
    await ctx.reply(`Номер подтверждён ✅ Вот ссылка на группу: ${groupInviteLink}`);
  } else {
    await ctx.reply("Твой номер не найден в списке разрешённых.");
  }
});

// Обработка новых участников группы
bot.on("chat_member", async (ctx) => {
  const member = ctx.chatMember?.new_chat_member?.user;
  if (!member) return;

  // Кикаем, если пользователь не подтверждён
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

bot.launch().then(() => console.log("Bot started"));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
