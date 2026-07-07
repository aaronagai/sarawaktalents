const CRAWLER_RE =
  /facebookexternalhit|whatsapp|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|pinterest|googlebot|bingpreview|embedly|quora link preview|vkshare|redditbot/i

export function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  return CRAWLER_RE.test(userAgent)
}