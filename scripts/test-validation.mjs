// npm run test:validation — портит копию контента по каждому пункту раздела 6 ТЗ
// и проверяет, что валидация (та же, что перед сборкой) останавливается с понятным сообщением.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const src = path.resolve('content');
const edit = (dir, file, fn) => { const p = path.join(dir, file); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };
const cases = [
  ['1а. нет недели', d => fs.rmSync(path.join(d, 'weeks/week-07.yaml')), /нет недели 7/],
  ['1б. номер недели повторяется', d => edit(d, 'weeks/week-08.yaml', s => s.replace('week: 8', 'week: 7')), /повторяется/],
  ['2. больше трёх тренировок', d => edit(d, 'weeks/week-05.yaml', s => {
    const block = s.slice(s.indexOf('  - day: "вс"'));
    return s + block.replace('"вс"', '"сб"');
  }), /4 тренировки, допускается не больше трёх/],
  ['3. тип не из списка', d => edit(d, 'weeks/week-03.yaml', s => s.replace('type: "повторная"', 'type: "фартлек"')), /тип "фартлек" не из списка/],
  ['4а. отрицательные км', d => edit(d, 'weeks/week-02.yaml', s => s.replace('warmup_km: 2', 'warmup_km: -2')), /отрицательное значение/],
  ['4б. км не число', d => edit(d, 'weeks/week-02.yaml', s => s.replace('rep_km: 18', 'rep_km: "восемнадцать"')), /должно быть числом/],
  ['4в. reps не целое', d => edit(d, 'weeks/week-02.yaml', s => s.replace('reps: 12', 'reps: 12.5')), /reps должно быть целым/],
  ['5. темп не по шаблону', d => edit(d, 'weeks/week-04.yaml', s => s.replace('pace: "T21+15"', 'pace: "T30"')), /темп "T30" не по шаблону/],
  ['6а. пустой why', d => edit(d, 'weeks/week-06.yaml', s => s.replace(/why: ".*"/, 'why: ""')), /пустое поле why/],
  ['6б. пустой why_now', d => edit(d, 'weeks/week-06.yaml', s => s.replace(/why_now: ".*"/, 'why_now: "  "')), /пустое поле why_now/],
  ['7а. price_ladder не отсортирован', d => edit(d, 'config.yaml', s => s.replace('"2026-11-30", price: 2250', '"2026-11-09", price: 2250')), /не отсортирован/],
  ['7б. дата ступени не понедельник', d => edit(d, 'config.yaml', s => s.replace('"2026-12-07"', '"2026-12-08"')), /не понедельник/],
  ['8а. кейсов больше трёх', d => edit(d, 'cases.yaml', s => s + s.slice(s.indexOf('- name'), s.indexOf('- name', s.indexOf('- name') + 1))), /4 записей, нужно 2 или 3/],
  ['8б. кейсов меньше двух', d => edit(d, 'cases.yaml', s => s.slice(0, s.indexOf('- name', s.indexOf('- name') + 1))), /1 записей, нужно 2 или 3/],
];
let failed = 0;
for (const [name, mutate, expect] of cases) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kzn-content-'));
  fs.cpSync(src, dir, { recursive: true });
  mutate(dir);
  const r = spawnSync(process.execPath, ['scripts/validate.mjs'], { env: { ...process.env, CONTENT_DIR: dir }, encoding: 'utf8' });
  const ok = r.status !== 0 && expect.test(r.stderr);
  if (!ok) failed++;
  const msg = (r.stderr.match(/ {2}1\. .*/) || [''])[0].trim();
  console.log(`${ok ? '✓' : '✗'} ${name} → ${ok ? msg : `код ${r.status}, вывод: ${r.stderr || r.stdout}`}`);
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} проверок не сработали` : `\nВсе ${cases.length} нарушений останавливают сборку.`);
process.exit(failed ? 1 : 0);
