export const APP_LINK = "https://work-it-daily.vercel.app";

export function buildChallengeText(streak) {
  return (
    `I challenge you! I have a ${streak} day streak on Work It Daily - can you beat me? ` +
    `One body-weight exercise per day, at your chosen level. Open the link, choose "Share" ` +
    `and "Save to Home Screen" (or Install). Text me your daily summary and the game is on! 🤝\n\n` +
    APP_LINK
  );
}
