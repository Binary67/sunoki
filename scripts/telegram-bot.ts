import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Telegraf, type Context } from "telegraf";
import {
  buildTodayBookingsTelegramSummary,
  buildUpcomingBookingsTelegramSummary,
} from "../src/lib/telegram/upcoming-bookings-summary";

type TelegramBotConfig = {
  token: string;
  allowedChatIds: Set<string>;
};

loadEnvFile();

const config = readTelegramBotConfig();
const bot = new Telegraf(config.token);

bot.command("upcoming_bookings", (ctx) => handleUpcomingBookings(ctx, config));
bot.command("today_bookings", (ctx) => handleTodayBookings(ctx, config));
bot.command("chat_id", (ctx) => {
  if (!ctx.chat) return;
  return ctx.reply(`This chat ID is ${ctx.chat.id}.`);
});
bot.hears(/^\/UpcomingBookings(?:@[A-Za-z0-9_]+)?(?:\s|$)/, (ctx) =>
  handleUpcomingBookings(ctx, config),
);
bot.hears(/^\/TodayBookings(?:@[A-Za-z0-9_]+)?(?:\s|$)/, (ctx) =>
  handleTodayBookings(ctx, config),
);

bot.catch((error) => {
  console.error("Telegram bot error:", error);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

main().catch((error) => {
  console.error("Failed to start Telegram bot:", error);
  process.exitCode = 1;
});

async function main() {
  await bot.launch();
  console.log("Telegram bot polling for /upcoming_bookings and /today_bookings.");
  console.log(
    `Authorized Telegram chat IDs: ${Array.from(config.allowedChatIds).join(", ")}`,
  );
}

async function handleUpcomingBookings(
  ctx: Context,
  config: TelegramBotConfig,
) {
  await handleBookingSummary(
    ctx,
    config,
    buildUpcomingBookingsTelegramSummary,
    "upcoming bookings",
  );
}

async function handleTodayBookings(ctx: Context, config: TelegramBotConfig) {
  await handleBookingSummary(
    ctx,
    config,
    buildTodayBookingsTelegramSummary,
    "today's bookings",
  );
}

async function handleBookingSummary(
  ctx: Context,
  { allowedChatIds }: TelegramBotConfig,
  buildSummary: () => string,
  summaryName: string,
) {
  if (!ctx.chat || !allowedChatIds.has(String(ctx.chat.id))) {
    if (ctx.chat) {
      await ctx.reply(
        [
          "This chat is not authorized for Sunoki booking summaries.",
          `Add this chat ID to TELEGRAM_ALLOWED_CHAT_IDS: ${ctx.chat.id}`,
        ].join("\n"),
      );
    }
    return;
  }

  try {
    await ctx.reply(buildSummary());
  } catch (error) {
    console.error(`Failed to build Telegram ${summaryName} summary:`, error);
    await ctx.reply(`Unable to build the ${summaryName} summary.`);
  }
}

function readTelegramBotConfig(): TelegramBotConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || token === "dummy-token") {
    throw new Error("Set TELEGRAM_BOT_TOKEN in .env before running the bot.");
  }

  const allowedChatIds = new Set(
    (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
      .split(",")
      .map((chatId) => chatId.trim())
      .filter(Boolean),
  );
  if (allowedChatIds.size === 0) {
    throw new Error("Set TELEGRAM_ALLOWED_CHAT_IDS in .env before running the bot.");
  }

  return { token, allowedChatIds };
}

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = unquoteEnvValue(
      trimmedLine.slice(separatorIndex + 1).trim(),
    );

    process.env[key] = value;
  }
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
