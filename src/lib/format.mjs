// Форматирование для сборки (даты, числа, ссылки). Та же логика повторена в клиентском скрипте.
import { dayNum } from '../../lib/content.mjs';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const parts = s => ({ y: +s.slice(0, 4), m: +s.slice(5, 7) - 1, d: +s.slice(8, 10) });

export const dateLong = s => { const { y, m, d } = parts(s); return `${d} ${MONTHS[m]} ${y}`; };

/** «16–22 ноября 2026», «30 ноября – 6 декабря 2026», «28 декабря 2026 – 3 января 2027» */
export function dateRange(a, b) {
  const A = parts(a), B = parts(b);
  if (A.y !== B.y) return `${A.d} ${MONTHS[A.m]} ${A.y} – ${B.d} ${MONTHS[B.m]} ${B.y}`;
  if (A.m !== B.m) return `${A.d} ${MONTHS[A.m]} – ${B.d} ${MONTHS[B.m]} ${B.y}`;
  return `${A.d}–${B.d} ${MONTHS[A.m]} ${A.y}`;
}

export const km = v => String(v).replace('.', ',');
export const money = v => v.toLocaleString('ru-RU').replace(/ | | /g, ' ');

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

/** Ссылка на S10.run с UTM по умолчанию (на клиенте заменяются входящими utm_*). */
export function withUtm(url, utm) {
  try {
    const u = new URL(url);
    for (const [k, v] of Object.entries(utm || {})) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    return u.toString();
  } catch { return url; }
}

/** День по МСК (номер дня от 1970-01-01) для момента ms. */
export const mskDay = ms => Math.floor((ms + 3 * 36e5) / 864e5);
export { dayNum };
