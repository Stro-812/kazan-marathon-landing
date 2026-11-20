// npm run validate — проверка контента (раздел 6 ТЗ). Запускается и перед каждой сборкой (prebuild).
import { loadContent, ContentError } from '../lib/content.mjs';
try {
  const { weeks, cases, faq, draft, config } = loadContent();
  console.log(`Контент в порядке: ${weeks.length} недель, ${cases.length} кейса, ${faq.length} вопросов.`);
  const warn = [];
  if (draft) warn.push('недели помечены draft: true — план черновой, сверить с S10.run');
  if (cases.some(c => c.placeholder)) warn.push('в cases.yaml заглушки (placeholder: true)');
  if (faq.some(q => q.placeholder)) warn.push('в faq.yaml заглушки ответов (placeholder: true)');
  for (const k of ['s10_buy_url', 'telegram_url', 's10_offer_url', 's10_privacy_url']) if (config[k].includes('...')) warn.push(`config.yaml: ${k} — ссылка-заглушка`);
  if (!config.metrika_id) warn.push('config.yaml: metrika_id пуст — Яндекс Метрика не подключена');
  for (const w of warn) console.warn('Внимание: ' + w);
} catch (e) {
  if (e instanceof ContentError) { console.error('\n✗ Сборка остановлена. ' + e.message + '\n'); process.exit(1); }
  throw e;
}
