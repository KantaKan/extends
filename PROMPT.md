อ่าน `CLAUDE.md`, `docs/GDD.md` (เน้นหัวข้อ ระบบหลัก, Art system, Tech architecture และ Roadmap) และเปิด `reference/morph-lab.html` ดูก่อนเริ่ม

งานนี้คือเฟส 0 (Prototype) ของเกม Extends ให้ทำตามลำดับนี้ และหยุดให้ผมดูหลังจบแต่ละขั้น:

1. **วางโครงโปรเจกต์** Vite + TypeScript (strict) + React + PixiJS + Monaco + Vitest แยกโฟลเดอร์ตาม CLAUDE.md หน้าจอแบ่ง editor ซ้าย แล็บขวา แถบทรัพยากรด้านบน คอนโซลของ Ref ด้านล่าง
2. **Simulation** fixed tick 10 ครั้งต่อวินาที, RNG มี seed, ห้องเดียวที่มี Essence กระจายอยู่ มี base class `Creature` (hp, energy, hunger) และคำสั่ง `move`, `eat`, `gather` พร้อม unit test
3. **Sandbox** QuickJS ใน Web Worker รับโค้ดผู้เล่น (transpile TS ก่อน) เรียก `update()` ของทุกตัวต่อ tick แล้วคืนรายการคำสั่ง มี interrupt กัน infinite loop และงบ Mana ต่อ tick
4. **Morph** port ระบบประกอบร่างจาก `reference/morph-lab.html` มาเป็น renderer ใน Pixi รองรับอย่างน้อย `body` (blob), `element`, `eyes`, `horns` และ class ที่ `extends` กันได้ (ลูกได้ชิ้นส่วนจากแม่)
5. **Hot reload** กด save (Ctrl/Cmd+S) แล้วสัตว์ทุกตัวเปลี่ยนพฤติกรรมและร่างทันที ค่าที่สะสมไม่หาย ถ้าโค้ดพัง สัตว์ทำงานต่อด้วยเวอร์ชันล่าสุดที่ใช้ได้ และ Ref อธิบาย error เป็นภาษาไทย
6. **ภารกิจทดสอบ 3 อัน** (เก็บเป็น JSON): เก็บ Essence 5 ก้อน, สร้างฝูงสไลม์ 10 ตัวด้วย class, ทำ FireSlime ด้วย extends

เริ่มจากข้อ 1 ก่อน เสนอโครงโฟลเดอร์และ dependency ให้ผมดูก่อนติดตั้ง ถ้าเจอจุดที่เอกสารไม่ชัดหรือขัดกันเอง ให้ถามแทนการเดา
