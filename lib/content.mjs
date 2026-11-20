// Загрузка и проверка контента лендинга (content/*.yaml).
// Используется сборкой Astro, `npm run validate` и `npm run report`.
// Папку контента можно подменить переменной окружения CONTENT_DIR (так работают тесты валидации).
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

export const WORKOUT_TYPES = ['развивающая', 'интервальная', 'повторная', 'длительная', 'соревнование'];
export const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
export const PACE_RE = /^T(5|10|21|42)([+-]\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class ContentError extends Error {
  constructor(errors) {
    super('Ошибки в контенте:\n' + errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n'));
    this.name = 'ContentError';
    this.errors = errors;
  }
}

export function contentDir() {
  return path.resolve(process.env.CONTENT_DIR || path.join(process.cwd(), 'content'));
}

function readYaml(file, errors) {
  try {
    return yaml.load(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${path.basename(file)}: не читается как YAML (${e.message.split('\n')[0]})`);
    return undefined;
  }
}

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const round = v => Math.round(v * 100) / 100;

// "2027-05-02" → число дней от 1970-01-01 (UTC), чтобы считать даты без часовых поясов
export const dayNum = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
export const dayStr = n => new Date(n * 864e5).toISOString().slice(0, 10);
const isMonday = s => new Date(dayNum(s) * 864e5).getUTCDay() === 1;
const validDate = s => typeof s === 'string' && DATE_RE.test(s) && dayStr(dayNum(s)) === s;

/** Понедельник недели N (номер дня) от даты старта. */
export function weekMonday(raceDate, planWeeks, n) {
  const race = dayNum(raceDate);
  const dow = (new Date(race * 864e5).getUTCDay() + 6) % 7; // 0 = пн
  return race - dow - (planWeeks - n) * 7;
}

/** Вычисляемые км тренировки (раздел 4.5 ТЗ). */
export function workoutKm(w) {
  let work = 0, recovery = 0;
  w.sets.forEach((s, i) => {
    work += s.reps * s.rep_km;
    recovery += (s.reps - 1) * s.recovery_km;
    if (i > 0) recovery += w.sets[i - 1].set_recovery_km || 0; // между наборами
  });
  const total = w.warmup_km + work + recovery + w.cooldown_km;
  return { warmup: round(w.warmup_km), work: round(work), recovery: round(recovery), cooldown: round(w.cooldown_km), total: round(total) };
}

function checkKm(v, where, errors) {
  if (!isNum(v)) errors.push(`${where}: должно быть числом, сейчас ${JSON.stringify(v)}`);
  else if (v < 0) errors.push(`${where}: отрицательное значение ${v}`);
}

function validateConfig(c, errors) {
  if (!c || typeof c !== 'object') { errors.push('config.yaml: пустой или не объект'); return; }
  for (const k of ['race_name', 'race_date', 's10_buy_url', 'telegram_url', 's10_offer_url', 's10_privacy_url', 'title', 'description', 'currency']) {
    if (typeof c[k] !== 'string' || !c[k].trim()) errors.push(`config.yaml: не заполнено поле ${k}`);
  }
  if (c.race_date && !validDate(c.race_date)) errors.push(`config.yaml: race_date "${c.race_date}" — нужна дата вида ГГГГ-ММ-ДД`);
  if (!Number.isInteger(c.plan_weeks) || c.plan_weeks < 1) errors.push('config.yaml: plan_weeks должно быть целым числом больше 0');
  const ladder = c.price_ladder;
  if (!Array.isArray(ladder) || !ladder.length) { errors.push('config.yaml: price_ladder пустой'); return; }
  ladder.forEach((st, i) => {
    const where = `config.yaml: price_ladder[${i + 1}]`;
    if (!validDate(st?.from)) { errors.push(`${where}: from "${st?.from}" — нужна дата вида ГГГГ-ММ-ДД`); return; }
    if (!isMonday(st.from)) errors.push(`${where}: ${st.from} — не понедельник`);
    if (!isNum(st.price) || st.price <= 0) errors.push(`${where}: price должен быть положительным числом`);
    const prev = ladder[i - 1];
    if (prev && validDate(prev.from) && dayNum(st.from) <= dayNum(prev.from)) errors.push(`${where}: ${st.from} не позже предыдущей ступени ${prev.from} — price_ladder не отсортирован по дате`);
  });
}

function validateWeek(w, file, errors) {
  const where = file;
  if (!w || typeof w !== 'object') { errors.push(`${where}: пустой файл`); return; }
  if (typeof w.phase !== 'string' || !w.phase.trim()) errors.push(`${where}: не заполнена фаза (phase)`);
  checkKm(w.easy_km, `${where}: easy_km`, errors);
  if (!Array.isArray(w.workouts) || !w.workouts.length) { errors.push(`${where}: нет тренировок (workouts)`); return; }
  if (w.workouts.length > 3) errors.push(`${where}: ${w.workouts.length} тренировки, допускается не больше трёх`);
  w.workouts.forEach((t, i) => {
    const at = `${where}, тренировка ${i + 1}`;
    if (!DAYS.includes(t?.day)) errors.push(`${at}: день "${t?.day}" — нужен один из ${DAYS.join(', ')}`);
    if (!WORKOUT_TYPES.includes(t?.type)) errors.push(`${at}: тип "${t?.type}" не из списка (${WORKOUT_TYPES.join(', ')})`);
    checkKm(t?.warmup_km, `${at}: warmup_km`, errors);
    checkKm(t?.cooldown_km, `${at}: cooldown_km`, errors);
    if (!Array.isArray(t?.sets) || !t.sets.length) errors.push(`${at}: нет отрезков (sets)`);
    else t.sets.forEach((s, j) => {
      const st = `${at}, набор ${j + 1}`;
      if (!Number.isInteger(s?.reps) || s.reps < 1) errors.push(`${st}: reps должно быть целым числом от 1, сейчас ${JSON.stringify(s?.reps)}`);
      checkKm(s?.rep_km, `${st}: rep_km`, errors);
      checkKm(s?.recovery_km, `${st}: recovery_km`, errors);
      if (s?.set_recovery_km !== undefined) checkKm(s.set_recovery_km, `${st}: set_recovery_km`, errors);
      if (typeof s?.pace !== 'string' || !PACE_RE.test(s.pace)) errors.push(`${st}: темп "${s?.pace}" не по шаблону T5/T10/T21/T42 со смещением (например T10+5)`);
    });
    for (const k of ['why', 'why_now']) if (typeof t?.[k] !== 'string' || !t[k].trim()) errors.push(`${at}: пустое поле ${k}`);
  });
}

function validateCases(cases, errors) {
  if (!Array.isArray(cases)) { errors.push('cases.yaml: должен быть списком'); return; }
  if (cases.length < 2 || cases.length > 3) errors.push(`cases.yaml: ${cases.length} записей, нужно 2 или 3`);
  cases.forEach((c, i) => {
    for (const k of ['name', 'result_before', 'result_after']) if (!c?.[k] || !String(c[k]).trim()) errors.push(`cases.yaml, запись ${i + 1}: не заполнено поле ${k}`);
  });
}

function validateFaq(faq, errors) {
  if (!Array.isArray(faq) || !faq.length) { errors.push('faq.yaml: должен быть непустым списком'); return; }
  faq.forEach((q, i) => {
    if (!q?.question?.trim?.() || !q?.answer?.trim?.()) errors.push(`faq.yaml, запись ${i + 1}: нужны question и answer`);
  });
}

/** Читает весь контент, проверяет (раздел 6 ТЗ) и считает производные поля. Бросает ContentError. */
export function loadContent(dir = contentDir()) {
  const errors = [];
  const config = readYaml(path.join(dir, 'config.yaml'), errors);
  const cases = readYaml(path.join(dir, 'cases.yaml'), errors);
  const faq = readYaml(path.join(dir, 'faq.yaml'), errors);
  validateConfig(config, errors);
  validateCases(cases, errors);
  validateFaq(faq, errors);

  const planWeeks = Number.isInteger(config?.plan_weeks) ? config.plan_weeks : 24;
  const weeksDir = path.join(dir, 'weeks');
  const files = fs.existsSync(weeksDir) ? fs.readdirSync(weeksDir).filter(f => /\.ya?ml$/.test(f)).sort() : [];
  const byNum = new Map();
  for (const f of files) {
    const w = readYaml(path.join(weeksDir, f), errors);
    if (w === undefined) continue;
    const where = `weeks/${f}`;
    if (!Number.isInteger(w?.week)) { errors.push(`${where}: поле week должно быть целым числом`); continue; }
    if (w.week < 1 || w.week > planWeeks) errors.push(`${where}: неделя ${w.week} вне диапазона 1…${planWeeks}`);
    if (byNum.has(w.week)) errors.push(`${where}: номер недели ${w.week} повторяется (уже есть в weeks/${byNum.get(w.week).file})`);
    else byNum.set(w.week, { file: f, data: w });
    validateWeek(w, where, errors);
  }
  for (let n = 1; n <= planWeeks; n++) if (!byNum.has(n)) errors.push(`weeks: нет недели ${n} (ожидается файл week-${String(n).padStart(2, '0')}.yaml)`);

  if (errors.length) throw new ContentError(errors);

  const weeks = [];
  for (let n = 1; n <= planWeeks; n++) {
    const w = byNum.get(n).data;
    const monday = weekMonday(config.race_date, planWeeks, n);
    const workouts = w.workouts.map(t => ({ ...t, km: workoutKm(t) }));
    const volume = round(workouts.reduce((a, t) => a + t.km.total, 0) + w.easy_km);
    weeks.push({ ...w, workouts, volume, start: dayStr(monday), end: dayStr(monday + 6) });
  }
  const draft = weeks.some(w => w.draft);
  return { config, cases, faq, weeks, draft };
}
