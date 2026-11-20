// npm run report — таблица плана для сверки с S10.run: неделя, фаза, тренировки с разбивкой км, недельный объём.
import { loadContent, ContentError } from '../lib/content.mjs';
let data;
try { data = loadContent(); } catch (e) {
  if (e instanceof ContentError) { console.error(e.message); process.exit(1); }
  throw e;
}
const { weeks, config, draft } = data;
const n = v => String(v).replace('.', ',');
const d = s => `${s.slice(8, 10)}.${s.slice(5, 7)}`;
const cols = ['Нед', 'Даты', 'Фаза', 'День', 'Тип', 'Отрезки', 'Разм', 'Работа', 'Восст', 'Зам', 'Итого', 'Лёгкие', 'Объём'];
const rows = [];
for (const w of weeks) {
  w.workouts.forEach((t, i) => {
    const sets = t.sets.map(s => `${s.reps}×${n(s.rep_km)} ${s.pace}${s.reps > 1 ? ` /${n(s.recovery_km)}` : ''}`).join(' + ');
    rows.push([i ? '' : w.week, i ? '' : `${d(w.start)}–${d(w.end)}`, i ? '' : w.phase, t.day, t.type, sets,
      n(t.km.warmup), n(t.km.work), n(t.km.recovery), n(t.km.cooldown), n(t.km.total),
      i ? '' : n(w.easy_km), i ? '' : n(w.volume)]);
  });
  rows.push(null);
}
const width = cols.map((c, i) => Math.max(c.length, ...rows.filter(Boolean).map(r => String(r[i]).length)));
const numeric = new Set([0, 6, 7, 8, 9, 10, 11, 12]);
const line = r => r.map((v, i) => numeric.has(i) ? String(v).padStart(width[i]) : String(v).padEnd(width[i])).join(' │ ');
const sep = width.map(w => '─'.repeat(w)).join('─┼─');
console.log(`${config.race_name}, старт ${config.race_date}. Км; «/x» — восстановление после каждого отрезка, кроме последнего.`);
if (draft) console.log('ЧЕРНОВИК: недели помечены draft: true — сверить с планом в S10.run.');
console.log(line(cols));
console.log(sep);
for (const r of rows) console.log(r ? line(r) : sep);
const total = weeks.reduce((a, w) => a + w.volume, 0);
console.log(`Всего за ${weeks.length} недель: ${n(Math.round(total * 10) / 10)} км`);
