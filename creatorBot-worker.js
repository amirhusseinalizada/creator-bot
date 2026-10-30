// Creator Bot - JavaScript for Cloudflare Workers
// Original PHP features preserved
// Required:
// Secret: BOT_TOKEN
// Variable: ADMIN_ID
// Variable: BOT_USERNAME
// KV Binding: DB

const HISTORY_TTL = 7 * 24 * 60 * 60;

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Creator Bot is Running!");
    }

    try {
      const update = await request.json();

      if (update.message) {
        await handleMessage(update.message, env);
      }

      if (update.callback_query) {
        await handleCallback(update.callback_query, env);
      }

      return new Response("OK");
    } catch (error) {
      console.error("Worker Error:", error);
      return new Response("OK");
    }
  }
};

// ===============================
// TELEGRAM API
// ===============================

async function bot(method, data, env) {
  const response = await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }
  );

  const result = await response.json();

  if (!result.ok) {
    console.error("Telegram API Error:", method, result);
  }

  return result;
}

// ===============================
// DATABASE SYSTEM (CLOUDFLARE KV)
// ===============================

async function getUsers(env) {
  return (await env.DB.get("users", "json")) || {};
}

async function getHistory(env) {
  return (await env.DB.get("history", "json")) || {};
}

async function saveUsers(users, env) {
  await env.DB.put("users", JSON.stringify(users));
}

async function saveHistory(history, env) {
  await env.DB.put("history", JSON.stringify(history));
}

// ===============================
// HISTORY AUTO CLEANER
// ===============================

async function cleanHistory(history, env) {
  const currentTime = Math.floor(Date.now() / 1000);
  let cleaned = false;

  for (const chatId in history) {
    const oldLength = history[chatId].length;

    history[chatId] = history[chatId].filter(item =>
      currentTime - item.time <= HISTORY_TTL
    );

    if (history[chatId].length !== oldLength) {
      cleaned = true;
    }
  }

  if (cleaned) {
    await saveHistory(history, env);
  }

  return history;
}

// ===============================
// MAIN KEYBOARD
// ===============================

const mainKeyboard = {
  keyboard: [
    [
      { text: "🎨 ساخت تصویر جدید" },
      { text: "🧪 حالت جادویی" }
    ],
    [
      { text: "⚙️ تنظیمات سبک و حالت" },
      { text: "📁 تاریخچه من" }
    ],
    [
      { text: "🎁 سکه رایگان" },
      { text: "❓ راهنما" }
    ]
  ],
  resize_keyboard: true
};

// ===============================
// HTML ESCAPE
// ===============================

function escapeHTML(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ===============================
// MESSAGE HANDLER
// ===============================

async function handleMessage(msg, env) {

  const users = await getUsers(env);
  let history = await getHistory(env);

  history = await cleanHistory(history, env);

  const chatId = String(msg.chat.id);
  const text = msg.text || "";
  const firstName = msg.chat.first_name || "کاربر";

  // ===============================
  // REGISTER USER
  // ===============================

  if (!users[chatId]) {

    users[chatId] = {
      coins: 5.0,
      invited: 0,
      state: "none",

      style: "Cinematic, masterpiece, 8k",
      style_fa: "سینمایی 🎬",

      mood: "Epic, dramatic",
      mood_fa: "حماسی 🔥"
    };

    // REFERRAL SYSTEM

    const referral = text.match(/^\/start\s+(\d+)$/);

    if (referral) {

      const inviter = referral[1];

      if (
        inviter !== chatId &&
        users[inviter]
      ) {

        users[inviter].coins += 2.0;
        users[inviter].invited += 1;

        await bot("sendMessage", {
          chat_id: inviter,
          text:
            `🎉 <b>تبریک!</b>\n` +
            `یک کاربر با لینک اختصاصی شما وارد ربات شد و <code>2</code> سکه پاداش گرفتید!\n` +
            `💰 موجودی فعلی شما: ${users[inviter].coins} سکه`,
          parse_mode: "HTML"
        }, env);
      }
    }

    await saveUsers(users, env);
  }

  const user = users[chatId];

  // ===============================
  // START COMMAND
  // ===============================

  if (text === "/start" || text.startsWith("/start ")) {

    user.state = "none";

    await saveUsers(users, env);

    const welcomeText =
      `سلام ${escapeHTML(firstName)} عزیز! 👋\n\n` +
      "به پیشرفته‌ترین ربات تصویرساز با موتور هوش مصنوعی انحصاری نانو بنانا ۲ پرو (Nano Banana 2 Pro) خوش اومدی! 🎨🔥\n\n" +
      "🎁 به محض ورود ۵ سکه رایگان دریافت کردی!\n\n" +
      "کافیه به فارسی یا انگلیسی بگی چی تو ذهنت هست تا من به خفن‌ترین شکل ممکن برات بسازمش.\n\n" +
      "👇 از منوی زیر شروع کن:";

    await bot("sendMessage", {
      chat_id: chatId,
      text: welcomeText,
      reply_markup: mainKeyboard
    }, env);

    return;
  }

  // ===============================
  // HELP & FAQ
  // ===============================

  if (text === "❓ راهنما") {

    user.state = "none";
    await saveUsers(users, env);

    const helpText =
      "📚 <b>راهنمای جامع نانو بنانا ۲ پرو</b> 🍌\n\n" +

      "🔹 <b>معرفی بخش‌ها:</b>\n" +
      "🎨 <b>ساخت تصویر:</b> توصیف خود را می‌دهید تا با بالاترین گرافیک تبدیل به عکس شود.\n" +
      "🧪 <b>حالت جادویی:</b> بدون نیاز به توصیف، ربات خودش یک ایده خفن و تصادفی می‌سازد.\n" +
      "⚙️ <b>تنظیمات:</b> تعیین سبک (انیمه، رئال...) و حال‌وهوا (تاریک، شاد...).\n" +
      "📁 <b>تاریخچه:</b> عکس‌های اخیر خود را مشاهده می‌کنید.\n\n" +

      "❓ <b>سوالات متداول (FAQ):</b>\n\n" +

      "🔸 <b>چرا عکس‌ها اینقدر باکیفیت و گرافیکی هستند؟</b>\n" +
      "چون ما از موتور نانو بنانا 2 پرو استفاده می‌کنیم که به طور خودکار پرامپت‌های مخفی مثل 8k و Masterpiece را به درخواست شما اضافه می‌کند.\n\n" +

      "🔸 <b>چطور سکه بیشتری بگیرم؟</b>\n" +
      "با زدن دکمه «🎁 سکه رایگان» لینک خود را بگیرید. برای هر دعوت ۲ سکه پاداش می‌گیرید!\n\n" +

      "🔸 <b>هزینه هر عکس چقدر است؟</b>\n" +
      "فقط <code>0.5</code> سکه!\n\n" +

      "🔸 <b>تاریخچه عکس‌هایم تا چه زمانی می‌ماند؟</b>\n" +
      "برای افزایش سرعت ربات و جلوگیری از پر شدن حافظه، عکس‌های قدیمی‌تر از ۷ روز به طور خودکار توسط ربات پاکسازی می‌شوند.";

    await bot("sendMessage", {
      chat_id: chatId,
      text: helpText,
      parse_mode: "HTML",
      reply_markup: mainKeyboard
    }, env);

    return;
  }

  // ===============================
  // FREE COINS / REFERRAL
  // ===============================

  if (text === "🎁 سکه رایگان") {

    user.state = "none";
    await saveUsers(users, env);

    const username = String(env.BOT_USERNAME || "").replace(/^@/, "");
    const link = `https://t.me/${username}?start=${chatId}`;

    const shareLink =
      "https://t.me/share/url?url=" +
      encodeURIComponent(link) +
      "&text=" +
      encodeURIComponent(
        "سلام! 👋\nبیا تو این ربات خفن با هوش مصنوعی هر عکسی تو ذهنت هست رو بساز! همون اول هم ۵ سکه رایگان میده 😍"
      );

    const inviteText =
      "🎁 <b>دریافت سکه رایگان!</b>\n\n" +
      "برای اینکه بتونی بی‌نهایت عکس بسازی، کافیه لینک زیر رو برای دوستات یا توی گروه‌ها بفرستی.\n" +
      "به ازای هر نفری که با لینک تو وارد ربات بشه، <b>2 سکه</b> کامل میگیری! 💰\n\n" +
      `🔗 لینک اختصاصی شما:\n<code>${link}</code>\n\n` +
      "👇 از دکمه‌های شیشه‌ای زیر استفاده کن:";

    await bot("sendMessage", {
      chat_id: chatId,
      text: inviteText,
      parse_mode: "HTML",

      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📤 ارسال لینک به دوستان (فوروارد)",
              url: shareLink
            }
          ],
          [
            {
              text: "📊 آمار دعوت‌های من",
              callback_data: "invite_stats"
            }
          ]
        ]
      }
    }, env);

    return;
  }

  // ===============================
  // SETTINGS MENU
  // ===============================

  if (text === "⚙️ تنظیمات سبک و حالت") {

    user.state = "none";
    await saveUsers(users, env);

    const settingsKeyboard = {
      keyboard: [
        [
          { text: "🎭 تغییر سبک" },
          { text: "🌈 تغییر حال‌و‌هوا" }
        ],
        [
          { text: "🔙 بازگشت به منوی اصلی" }
        ]
      ],
      resize_keyboard: true
    };

    await bot("sendMessage", {
      chat_id: chatId,

      text:
        "⚙️ <b>تنظیمات تصویرسازی</b>\n\n" +
        `🎨 <b>سبک فعلی:</b> ${escapeHTML(user.style_fa)}\n` +
        `🌈 <b>حالت فعلی:</b> ${escapeHTML(user.mood_fa)}\n\n` +
        "از منوی زیر برای تغییرات استفاده کن:",

      parse_mode: "HTML",
      reply_markup: settingsKeyboard
    }, env);

    return;
  }

  // ===============================
  // BACK TO MAIN MENU
  // ===============================

  if (text === "🔙 بازگشت به منوی اصلی") {

    user.state = "none";
    await saveUsers(users, env);

    await bot("sendMessage", {
      chat_id: chatId,
      text: "🏠 به منوی اصلی برگشتیم:",
      reply_markup: mainKeyboard
    }, env);

    return;
  }

  // ===============================
  // CHANGE STYLE MENU
  // ===============================

  if (text === "🎭 تغییر سبک") {

    const styleKeyboard = {
      keyboard: [
        [
          { text: "سبک: رئال 📷" },
          { text: "سبک: انیمه 🎌" }
        ],
        [
          { text: "سبک: سینمایی 🎬" },
          { text: "سبک: کارتونی 🧸" }
        ],
        [
          { text: "سبک: سایبرپانک 🌃" },
          { text: "سبک: فانتزی 🐉" }
        ],
        [
          { text: "🔙 بازگشت به منوی اصلی" }
        ]
      ],
      resize_keyboard: true
    };

    await bot("sendMessage", {
      chat_id: chatId,
      text: "🎨 یک سبک برای تصاویر خود انتخاب کنید:",
      reply_markup: styleKeyboard
    }, env);

    return;
  }

  // ===============================
  // CHANGE MOOD MENU
  // ===============================

  if (text === "🌈 تغییر حال‌و‌هوا") {

    const moodKeyboard = {
      keyboard: [
        [
          { text: "حالت: شاد 😊" },
          { text: "حالت: تاریک 🌑" }
        ],
        [
          { text: "حالت: حماسی 🔥" },
          { text: "حالت: ترسناک 😈" }
        ],
        [
          { text: "حالت: عاشقانه ❤️" },
          { text: "حالت: رویایی ✨" }
        ],
        [
          { text: "🔙 بازگشت به منوی اصلی" }
        ]
      ],
      resize_keyboard: true
    };

    await bot("sendMessage", {
      chat_id: chatId,
      text: "🌈 حال و هوای تصاویر چگونه باشد؟",
      reply_markup: moodKeyboard
    }, env);

    return;
  }

  // ===============================
  // STYLES MAP
  // ===============================

  const stylesMap = {

    "سبک: رئال 📷": [
      "Real Photography, highly detailed, 8k, photorealistic",
      "رئال 📷"
    ],

    "سبک: انیمه 🎌": [
      "Anime style, Studio Ghibli, masterpiece, vibrant colors",
      "انیمه 🎌"
    ],

    "سبک: سینمایی 🎬": [
      "Cinematic lighting, movie scene, epic composition, 8k",
      "سینمایی 🎬"
    ],

    "سبک: کارتونی 🧸": [
      "3D cartoon, Pixar style, cute, unreal engine 5 render",
      "کارتونی 🧸"
    ],

    "سبک: سایبرپانک 🌃": [
      "Cyberpunk, neon lights, futuristic, highly detailed city",
      "سایبرپانک 🌃"
    ],

    "سبک: فانتزی 🐉": [
      "Fantasy art, magical, ethereal, highly detailed landscape",
      "فانتزی 🐉"
    ]

  };

  if (stylesMap[text]) {

    user.style = stylesMap[text][0];
    user.style_fa = stylesMap[text][1];

    await saveUsers(users, env);

    await bot("sendMessage", {
      chat_id: chatId,

      text:
        `✅ سبک تصاویر شما با موفقیت به <b>${user.style_fa}</b> تغییر یافت.`,

      parse_mode: "HTML",
      reply_markup: mainKeyboard
    }, env);

    return;
  }

  // ===============================
  // MOODS MAP
  // ===============================

  const moodsMap = {

    "حالت: شاد 😊": [
      "Happy, bright colors, joyful, sunny atmosphere",
      "شاد 😊"
    ],

    "حالت: تاریک 🌑": [
      "Dark, gloomy, mysterious, shadows, low key lighting",
      "تاریک 🌑"
    ],

    "حالت: حماسی 🔥": [
      "Epic, dynamic action, dramatic lighting, intense",
      "حماسی 🔥"
    ],

    "حالت: ترسناک 😈": [
      "Horror, creepy, nightmare, eerie atmosphere",
      "ترسناک 😈"
    ],

    "حالت: عاشقانه ❤️": [
      "Romantic, soft lighting, lovely, warm colors",
      "عاشقانه ❤️"
    ],

    "حالت: رویایی ✨": [
      "Dreamy, surreal, magical atmosphere, glowing",
      "رویایی ✨"
    ]

  };

  if (moodsMap[text]) {

    user.mood = moodsMap[text][0];
    user.mood_fa = moodsMap[text][1];

    await saveUsers(users, env);

    await bot("sendMessage", {
      chat_id: chatId,

      text:
        `✅ حال‌وهوای تصاویر شما به <b>${user.mood_fa}</b> تغییر یافت.`,

      parse_mode: "HTML",
      reply_markup: mainKeyboard
    }, env);

    return;
  }

  // ===============================
  // HISTORY MENU
  // ===============================

  if (text === "📁 تاریخچه من") {

    user.state = "none";
    await saveUsers(users, env);

    if (!history[chatId] || history[chatId].length === 0) {

      await bot("sendMessage", {
        chat_id: chatId,

        text:
          "📭 شما هنوز هیچ تصویری نساخته‌اید یا تاریخچه شما (بیشتر از ۷ روز) پاک شده است.",

        reply_markup: mainKeyboard
      }, env);

      return;
    }

    const historyKeyboard = {
      inline_keyboard: []
    };

    let count = 0;

    for (const item of [...history[chatId]].reverse()) {

      if (count >= 15) break;

      const shortPrompt =
        item.fa.length > 20
          ? item.fa.substring(0, 20) + "..."
          : item.fa;

      historyKeyboard.inline_keyboard.push([
        {
          text: `🖼️ ${shortPrompt}`,
          callback_data: `hist_${item.id}`
        }
      ]);

      count++;
    }

    await bot("sendMessage", {
      chat_id: chatId,

      text:
        "📁 <b>گالری تاریخچه شما</b>\n\n" +
        "در اینجا لیست تصاویری که در ۷ روز اخیر ساخته‌اید قرار دارد. با کلیک روی هر کدام، عکس و جزئیات آن به شما نمایش داده می‌شود 👇",

      parse_mode: "HTML",
      reply_markup: historyKeyboard
    }, env);

    return;
  }

  // ===============================
  // NEW IMAGE
  // ===============================

  if (text === "🎨 ساخت تصویر جدید") {

    user.state = "waiting_for_prompt";

    await saveUsers(users, env);

    await bot("sendMessage", {
      chat_id: chatId,

      text:
        "✍️ <b>چه چیزی تو ذهنت هست؟</b>\n\n" +
        "توصیف کن تا برات بسازمش (فارسی یا انگلیسی فرقی نداره).",

      parse_mode: "HTML",

      reply_markup: {
        keyboard: [
          [
            { text: "🔙 بازگشت به منوی اصلی" }
          ]
        ],
        resize_keyboard: true
      }
    }, env);

    return;
  }

  // ===============================
  // MAGIC MODE OR USER PROMPT
  // ===============================

  if (
    text === "🧪 حالت جادویی" ||
    user.state === "waiting_for_prompt"
  ) {

    if (Number(user.coins) < 0.5) {

      user.state = "none";
      await saveUsers(users, env);

      await bot("sendMessage", {
        chat_id: chatId,

        text:
          "❌ سکه کافی نداری!\n" +
          "برای ساخت عکس به `0.5` سکه نیاز داری.\n" +
          `💰 موجودی شما: ${user.coins}\n\n` +
          "از بخش «🎁 سکه رایگان» دوستانت رو دعوت کن.",

        parse_mode: "Markdown",
        reply_markup: mainKeyboard
      }, env);

      return;
    }

    let faPrompt = text;

    // ===============================
    // RANDOM MAGIC PROMPTS
    // ===============================

    if (text === "🧪 حالت جادویی") {

      const magicSubjects = [

        "یک شهر نئونی با ماشین‌های پرنده در شب بارانی",

        "پرتره یک شوالیه فضایی با زره درخشان",

        "یک کلبه جنگلی جادویی که از آن نور بنفش می‌تابد",

        "اژدهای کریستالی بر فراز کوهستان یخی",

        "رستورانی زیر اقیانوس با ماهی‌های درخشان",

        "دختری با موهای آتشین در حال نواختن ویولن",

        "یک سفینه فضایی عظیم در حال عبور از نزدیک حلقه‌های زحل"

      ];

      faPrompt =
        magicSubjects[
          Math.floor(Math.random() * magicSubjects.length)
        ];
    }

    // ===============================
    // PROCESSING MESSAGE
    // ===============================

    const processMsg = await bot("sendMessage", {
      chat_id: chatId,

      text:
        "⏳ <b>در حال ساخت تصویر...</b>\n\n" +
        "🪙 <code>0.5</code> سکه از حساب شما کسر شد.\n" +
        "لطفا چند ثانیه صبر کنید 🔥",

      parse_mode: "HTML"
    }, env);

    user.coins = Number(user.coins) - 0.5;
    user.state = "none";

    await saveUsers(users, env);

    // ===============================
    // GOOGLE TRANSLATE FA TO EN
    // ===============================

    async function translateFaToEn(query) {

      if (!/[ا-ی]/.test(query)) {
        return query;
      }

      try {

        const url =
          "https://translate.googleapis.com/translate_a/single" +
          "?client=gtx&sl=fa&tl=en&dt=t&q=" +
          encodeURIComponent(query);

        const response = await fetch(url);

        const data = await response.json();

        return data?.[0]?.map(part => part[0]).join("") || query;

      } catch (error) {

        console.error("Translation Error:", error);

        return query;
      }
    }

    const enPrompt = await translateFaToEn(faPrompt);

    // ===============================
    // COMBINE PROMPT
    // ===============================

    const fullPrompt =
      enPrompt +
      ", " +
      user.style +
      ", " +
      user.mood +
      ", highly detailed, masterpiece, 8k resolution, best quality";

    // ===============================
    // POLLINATIONS AI IMAGE URL
    // ===============================

    const seed =
      Math.floor(Math.random() * 99999999) + 1;

    const time = Math.floor(Date.now() / 1000);

    const imageUrl =
      "https://image.pollinations.ai/prompt/" +
      encodeURIComponent(fullPrompt) +
      `?seed=${seed}&nologo=true&enhance=true&t=${time}`;

    // ===============================
    // SAVE HISTORY
    // ===============================

    const itemId =
      Date.now().toString(36) +
      Math.random().toString(36).substring(2, 10);

    if (!history[chatId]) {
      history[chatId] = [];
    }

    history[chatId].push({

      id: itemId,

      fa: faPrompt,

      en: enPrompt,

      style_fa: user.style_fa,

      mood_fa: user.mood_fa,

      url: imageUrl,

      time: time

    });

    await saveHistory(history, env);

    // ===============================
    // IMAGE CAPTION
    // ===============================

    const caption =
      "✅ <b>تصویر با موفقیت ساخته شد!</b> 🎨\n\n" +

      "📝 <b>پرامپت فارسی:</b>\n" +
      `<code>${escapeHTML(faPrompt)}</code>\n\n` +

      "🔤 <b>پرامپت انگلیسی:</b>\n" +
      `<code>${escapeHTML(enPrompt)}</code>\n\n` +

      `🎭 <b>سبک تصویر:</b> ${escapeHTML(user.style_fa)}\n` +

      `🌈 <b>حال و هوا:</b> ${escapeHTML(user.mood_fa)}\n\n` +

      `💰 <b>سکه باقی‌مانده:</b> ${user.coins} سکه\n` +

      "🤖 پردازش شده توسط: <b>Pollinations AI</b>";

    // ===============================
    // DELETE PROCESSING MESSAGE
    // ===============================

    if (processMsg?.result?.message_id) {

      await bot("deleteMessage", {
        chat_id: chatId,
        message_id: processMsg.result.message_id
      }, env);

    }

    // ===============================
    // SEND IMAGE
    // ===============================

    const photoResult = await bot("sendPhoto", {

      chat_id: chatId,

      photo: imageUrl,

      caption: caption,

      parse_mode: "HTML",

      reply_markup: mainKeyboard

    }, env);

    if (!photoResult.ok) {

      await bot("sendMessage", {
        chat_id: chatId,

        text:
         "❌ در ارسال تصویر مشکلی به وجود آمد.\n" +
          "سکه کسرشده به حساب شما بازگردانده می‌شود.",

        reply_markup: mainKeyboard

      }, env);

      user.coins = Number(user.coins) + 0.5;

      await saveUsers(users, env);
    }

    return;
  }
}

// ===============================
// CALLBACK QUERY HANDLER
// ===============================

async function handleCallback(cb, env) {

  const users = await getUsers(env);
  const history = await getHistory(env);

  const chatId = String(cb.message?.chat?.id || "");
  const data = cb.data || "";
  const callbackId = cb.id;

  if (!chatId) return;

  // ===============================
  // INVITE STATISTICS
  // ===============================

  if (data === "invite_stats") {

    const user = users[chatId];

    if (!user) {

      await bot("answerCallbackQuery", {

        callback_query_id: callbackId,

        text: "اطلاعات کاربر پیدا نشد.",

        show_alert: true

      }, env);

      return;
    }

    await bot("answerCallbackQuery", {

      callback_query_id: callbackId,

      text:
        "📊 آمار شما:\n\n" +
        `👥 تعداد دعوت شده: ${user.invited} نفر\n` +
        `💰 موجودی فعلی: ${user.coins} سکه`,

      show_alert: true

    }, env);

    return;
  }

  // ===============================
  // HISTORY CLICK
  // ===============================

  if (data.startsWith("hist_")) {

    const historyId = data.substring(5);

    let found = null;

    if (history[chatId]) {

      found = history[chatId].find(
        item => String(item.id) === historyId
      );

    }

    if (found) {

      await bot("answerCallbackQuery", {

        callback_query_id: callbackId,

        text: "⏳ در حال بارگذاری تصویر از تاریخچه..."

      }, env);

      const date = new Date(found.time * 1000)
        .toISOString()
        .slice(0, 16)
        .replace("T", " ");

      const caption =
        "🕒 <b>بازخوانی از تاریخچه</b>\n\n" +

        "📝 <b>پرامپت فارسی:</b>\n" +
        `<code>${escapeHTML(found.fa)}</code>\n\n` +

        "🔤 <b>پرامپت انگلیسی:</b>\n" +
        `<code>${escapeHTML(found.en)}</code>\n\n` +

        `🎭 <b>سبک اعمال شده:</b> ${escapeHTML(found.style_fa)}\n` +

        `🌈 <b>حالت اعمال شده:</b> ${escapeHTML(found.mood_fa)}\n\n` +

        `📅 <b>زمان ساخت:</b> ${date}`;

      await bot("sendPhoto", {

        chat_id: chatId,

        photo: found.url,

        caption: caption,

        parse_mode: "HTML"

      }, env);

    } else {

      await bot("answerCallbackQuery", {

        callback_query_id: callbackId,

        text: "❌ این مورد از تاریخچه پیدا نشد",

        show_alert: true

      }, env);

    }

    return;
  }
}