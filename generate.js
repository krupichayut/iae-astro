const fs = require('fs');
const Astronomy = require('astronomy-engine');

// Natal Constants
const NATAL = {
  Sun:     { name: 'Sun (อาทิตย์)',      deg: 337.98, sign: 'มีน 7°59\'' },
  Moon:    { name: 'Moon (จันทร์)',      deg:  79.70, sign: 'เมถุน 19°42\'' },
  Mercury: { name: 'Mercury (พุธ)',      deg: 315.92, sign: 'กุมภ์ 15°55\'' },
  Venus:   { name: 'Venus (ศุกร์)',      deg:  21.20, sign: 'เมษ 21°12\'' },
  Mars:    { name: 'Mars (อังคาร)',      deg: 339.33, sign: 'มีน 9°20\'' },
  Jupiter: { name: 'Jupiter (พฤหัส)',    deg: 281.28, sign: 'มังกร 11°17\'' },
  Saturn:  { name: 'Saturn (เสาร์)',     deg: 355.07, sign: 'มีน 25°04\'' },
  Uranus:  { name: 'Uranus (มฤตยู)',     deg: 302.60, sign: 'กุมภ์ 2°36\'' },
  Neptune: { name: 'Neptune (เนปจูน)',   deg: 296.73, sign: 'มังกร 26°44\'' },
  Pluto:   { name: 'Pluto (พลูโต)',      deg: 243.08, sign: 'ธนู 3°05\'' },
  Node:    { name: 'Node (ราหู)',        deg: 199.40, sign: 'ตุลย์ 19°24\'' },
  Chiron:  { name: 'Chiron (ไครอน)',     deg: 193.52, sign: 'ตุลย์ 13°31\'' },
  Fortune: { name: 'Fortune (โชคลาภ)',   deg: 204.43, sign: 'ตุลย์ 24°26\'' },
  Vertex:  { name: 'Vertex (จุดชะตา)',   deg: 213.45, sign: 'พิจิก 3°27\'' },
  ASC:     { name: 'ASC (ลัคนา)',        deg: 102.73, sign: 'กรกฎ 12°44\'' },
  MC:      { name: 'MC (จอมฟ้าการงาน)',  deg:   8.62, sign: 'เมษ 8°37\'' }
};

const SIGN_TH = ['เมษ', 'พฤษภ', 'เมถุน', 'กรกฎ', 'สิงห์', 'กันย์',
                 'ตุลย์', 'พิจิก', 'ธนู', 'มังกร', 'กุมภ์', 'มีน'];

const mod360 = d => ((d % 360) + 360) % 360;

function degToSignStr(deg) {
  deg = mod360(deg);
  const s = Math.floor(deg / 30);
  const rem = deg % 30;
  const degInt = Math.floor(rem);
  const minInt = Math.floor((rem - degInt) * 60);
  return `${SIGN_TH[s]} ${degInt}°${String(minInt).padStart(2, '0')}'`;
}

function shortArc(a, b) {
  const d = Math.abs(a - b);
  return d > 180 ? 360 - d : d;
}

const MAJOR_ASPECTS = [
  { name: 'Conjunction (☌)', angle: 0,   maxOrb: 3.5, symbol: '☌', nature: 'neutral' },
  { name: 'Opposition (☍)',  angle: 180, maxOrb: 3.5, symbol: '☍', nature: 'challenging' },
  { name: 'Trine (△)',       angle: 120, maxOrb: 3.5, symbol: '△', nature: 'flowing' },
  { name: 'Square (□)',      angle: 90,  maxOrb: 3.0, symbol: '□', nature: 'challenging' },
  { name: 'Sextile (✱)',     angle: 60,  maxOrb: 2.5, symbol: '✱', nature: 'flowing' }
];

const STEMS = ['Jia (ไม้+)', 'Yi (ไม้-)', 'Bing (ไฟ+)', 'Ding (ไฟ-)', 'Wu (ดิน+)', 
               'Ji (ดิน-)', 'Geng (ทอง+)', 'Xin (ทอง-)', 'Ren (น้ำ+)', 'Gui (น้ำ-)'];
const BRANCHES = ['Zi (ชวด/น้ำ)', 'Chou (ฉลู/ดิน)', 'Yin (ขาล/ไม้)', 'Mao (เถาะ/ไม้)', 
                  'Chen (มะโรง/ดิน)', 'Si (มะเส็ง/ไฟ)', 'Wu (มะเมีย/ไฟ)', 'Wei (มะแม/ดิน)', 
                  'Shen (วอก/ทอง)', 'You (ระกา/ทอง)', 'Xu (จอ/ดิน)', 'Hai (กุน/น้ำ)'];

function getBaziDay(targetDate) {
  const baseDate = new Date('2000-01-01T00:00:00Z');
  const diffDays = Math.floor((targetDate - baseDate) / (1000 * 60 * 60 * 24));
  const pIdx = ((54 + diffDays) % 60 + 60) % 60;
  return `${STEMS[pIdx % 10]} ${BRANCHES[pIdx % 12]}`;
}

const TAKSA_MAP = {
  0: { sri: 'แดง', dech: 'ส้ม/ทอง', kalakini: 'ขาว' },
  1: { sri: 'ส้ม/ทอง', dech: 'ดำ/เทา', kalakini: 'ขาว' },
  2: { sri: 'ทอง/มัสตาร์ด', dech: 'ม่วงเข้ม/ดำ', kalakini: 'ขาว' },
  3: { sri: 'ส้มอิฐ', dech: 'เทาควันบุหรี่', kalakini: 'ขาว/ชมพูอ่อน' },
  4: { sri: 'ส้มสด', dech: 'แดงเลือดหมู', kalakini: 'ขาว' },
  5: { sri: 'เขียว', dech: 'แดง/ไวน์แดง', kalakini: 'ขาว/ฟ้าอ่อน' },
  6: { sri: 'ดำ/ม่วง', dech: 'ส้มอมน้ำตาล', kalakini: 'ขาว' }
};

const bodies = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

function generateDailyNarrative(item) {
  const dStr = item.date;
  const score = item.netScore;
  
  let headline = 'จังหวะชีวิตดำเนินไปอย่างมั่นคง';
  let summary = 'พลังงานดวงดาวค่อนข้างสมดุล เหมาะกับการสะสางงานประจำวันและฟื้นฟูร่างกาย';
  let career = 'งานเอกสารและงานตามตำแหน่งยังคงดำเนินไปตามปกติ ทำตามหน้าที่อย่างรอบคอบ';
  let finance = 'กระเป๋าเงินนิ่ง ไม่มีรายจ่ายกระทันหัน คุมงบประมาณได้ดี';
  let emotion = 'อารมณ์คงที่ จิตใจสงบ เหมาะกับการพักผ่อนหรืออยู่กับตัวเอง';
  let warning = 'ระวังความเหนื่อยล้าสะสมจากการทำงานติดต่อกัน';
  let action = 'จัดการตารางงานให้เป็นระบบ พักผ่อนให้ตรงเวลา';

  if (dStr === '2026-10-18') {
    headline = 'ดาวเสาร์ล็อกแกนการงาน & ดวงจันทร์ปะทะชั่วคราว';
    summary = 'เสาร์ทับ MC เต็มกำลัง ภาระงานและระเบียบวินัยยังเข้มงวด พระจันทร์ฉากดาวศุกร์ทำให้มีอารมณ์ขัดแย้งเล็กๆ';
    career = 'ต้องรับผิดชอบงานตามกฎเกณฑ์ เหนื่อยแต่เป็นการสร้างรากฐานที่มั่นคงในระยะยาว';
    finance = 'ดวงอาทิตย์ทับจุดโชคลาภ (Fortune) มีสัญญาณบวกเรื่องโอกาสใหม่ๆ เริ่มก่อตัว';
    emotion = 'อาจรู้สึกขัดแย้งระหว่างหน้าที่ที่ต้องทำ กับสิ่งที่ใจอยากพักผ่อน';
    warning = 'อย่าเพิ่งเก็บคำพูดของคนอื่นมากดดันตัวเองในคืนวันอาทิตย์';
    action = 'นอนหลับพักผ่อนโดยหันหัวนอนไปทิศใต้หรือตะวันออกตามหลักฮวงจุ้ย';
  } else if (dStr === '2026-10-19') {
    headline = 'ดาวศุกร์จรทับจุดชะตาลิขิต (Vertex Exact 0.07°)';
    summary = 'มุมที่เป๊ะมากของดาวศุกร์นำพาความคิดสร้างสรรค์และมิตรภาพที่ส่งเสริมกันเข้ามา';
    career = 'มีไอเดียใหม่ๆ ในการสอนหรือออกแบบสื่อ เป็นวันที่เหมาะกับการปรึกษาหารือเรื่องโปรเจกต์';
    finance = 'เริ่มมองเห็นช่องทางขยายรายได้จากทักษะเฉพาะตัว (อาชีพเสริม)';
    emotion = 'รู้สึกมีเสน่ห์ คนรอบข้างพูดคุยด้วยความสบายใจ';
    warning = 'งานประจำยังแน่น อย่ามัวแต่คุยจนลืมส่งงานหลัก';
    action = 'จดบันทึกไอเดียที่แวบเข้ามาในวันนี้ไว้ต่อยอด สวมเสื้อผ้าโทนส้มหรือดำ';
  } else if (dStr === '2026-10-20') {
    headline = 'ดวงอาทิตย์ฉากเนปจูน & ศุกร์ฉากยูเรนัส (ระวังความเบลอ)';
    summary = 'มุมฉากระหว่างดาวสติปัญญาและดาวภาพลวงตา ทำให้สมองอาจมีช่วงที่หลุดโฟกัส';
    career = 'ระวังความเข้าใจคลาดเคลื่อนในคำสั่งหรือเอกสารราชการ การสื่อสารอาจไม่ตรงจุด';
    finance = 'ระวังความรู้สึกอยากช้อปปิ้งของสวยงามหรืออุปกรณ์เสริมแบบหุนหันพลันแล่น';
    emotion = 'อาจมีความรู้สึกสับสนหรือไม่มั่นใจในทิศทางบางอย่างชั่วคราว';
    warning = 'ห้ามเซ็นเอกสารสำคัญโดยไม่อ่านทานซ้ำ 2 รอบ และห้ามกดซื้อของชิ้นใหญ่';
    action = 'โฟกัสทีละงาน ทำงานรูทีนง่ายๆ ไม่ตัดสินใจเรื่องใหญ่';
  } else if (dStr === '2026-10-21') {
    headline = 'ดาวอังคารโยคไครอน — ปลดล็อกความกล้าหาญ';
    summary = 'พลังงานไฟของดาวอังคารช่วยผลักดันให้คุณกล้าสะสางงานที่เคยผัดวันประกันพรุ่ง';
    career = 'เป็นวันที่พลังในการลุยงานเดี่ยวสูงมาก งานยากๆ ที่ต้องใช้สมาธิจะเสร็จสิ้นได้ในวันนี้';
    finance = 'การเงินเริ่มหมุนเวียนคล่องตัวขึ้น ไม่มีรายจ่ายแทรกแซง';
    emotion = 'ความมั่นใจในตัวเองกลับคืนมา เลิกกังวลกับเรื่องในอดีต';
    warning = 'ระวังอาการปวดเมื่อยกล้ามเนื้อจากการนั่งทำงานนานเกินไป';
    action = 'ลุยปิดจ็อบงานเอกสารที่คั่งค้างให้หมดก่อนเริ่มสัปดาห์ใหม่';
  } else if (dStr === '2026-10-22') {
    headline = '🌟 อาทิตย์ยกเข้าราศีพิจิก — จุดสลับพลังงานสู่ Grand Water Trine (Score 86)';
    summary = 'จุดเปลี่ยนสำคัญที่สุดของเดือน! ดวงอาทิตย์เข้าสู่ธาตุน้ำ ตรีโกณกับดวงอาทิตย์มีนและลัคนากรกฎของคุณครู';
    career = 'ฟ้าเปิดรอบแรก! ผู้ใหญ่และผู้บริหารมองเห็นคุณค่า ข้อเสนอหรือผลงานจะได้รับการอนุมัติง่ายขึ้น';
    finance = 'สัญญาณการเงินสดใส มีโอกาสได้รับผลประโยชน์ตอบแทน หรือมองเห็นลู่ทางกำไร';
    emotion = 'ความโล่งใจขั้นสุด พลังชีวิต (Vitality) และความสบายใจพุ่งสูง';
    warning = 'อย่าประมาทหรือละเลยรายละเอียดเล็กๆ ของงาน';
    action = 'นำเสนอผลงาน หรือเข้าพบผู้ใหญ่ สวมเสื้อผ้าสีส้มสดหรือแดงเลือดหมู';
  } else if (dStr === '2026-10-23') {
    headline = 'วันปิยมหาราช — พลังงานธาตุน้ำหล่อเลี้ยงจิตวิญญาณ (Score 74)';
    summary = 'วันหยุดที่พลังงานดวงดาวส่งเสริมการฟื้นฟูจิตใจและแรงบันดาลใจ';
    career = 'พักสมองจากงานราชการ เป็นเวลาของการคิดสร้างสรรค์ในโลกส่วนตัว';
    finance = 'การเงินมั่นคง เหมาะกับการวางแผนจัดสรรเงินออม';
    emotion = 'ผ่อนคลาย อารมณ์เย็นและอบอุ่น เข้าใจคนรอบข้างได้ดีขึ้น';
    warning = 'ระวังการกินอาหารรสจัดหรืออาหารที่ไม่คุ้นเคย';
    action = 'ออกไปนั่งร้านกาแฟสงบๆ หรือทำงานศิลปะที่รักเพื่อชาร์จพลัง';
  } else if (dStr === '2026-10-24') {
    headline = 'วันเสาร์สำรวจตัวเอง — เสถียรภาพและระเบียบวินัย';
    summary = 'ดาวเสาร์ช่วยให้คุณมองโลกตามความเป็นจริงและจัดวางเป้าหมายได้อย่างเป็นระบบ';
    career = 'เหมาะกับการเคลียร์โต๊ะทำงาน จัดแฟ้มเอกสาร หรือเตรียมแผนสอนสัปดาห์หน้า';
    finance = 'รายจ่ายคงที่ ไม่มีความผันผวน';
    emotion = 'นิ่ง สุขุม มีความสันโดษสูง';
    warning = 'หลีกเลี่ยงการไปในที่คนพลุกพล่านหรือเสียงดัง';
    action = 'จัดมุมทำงาน จัดบ้าน หรือพักผ่อนในห้องนอนที่จัดฮวงจุ้ยไว้';
  } else if (dStr === '2026-10-25') {
    headline = '⚠️ Energy Dip — วันตั้งการ์ดและถอยกลับสู่ Safe Zone (Score 48)';
    summary = 'ดวงจันทร์จรทำมุมตึงตัวระยะสั้น อารมณ์อาจดิ่งลงชั่วคราวหรือมีความเหนื่อยล้าทางจิตใจ';
    career = 'อย่าเพิ่งรีบร้อนรับปากงานเพิ่ม ทำเฉพาะสิ่งที่จำเป็น';
    finance = 'ระวังการใช้เงินเพื่อบำบัดความเครียด';
    emotion = 'อาจรู้สึกเหงา โดดเดี่ยว หรือคิดวนถึงเรื่องในอดีต';
    warning = 'อย่าตอบโต้ข้อความหรือคุยเรื่องเครียดๆ กับคนในครอบครัวในวันนี้';
    action = 'ปิดหน้าจอ นอนพักผ่อนเร็ว ดื่มน้ำอุ่นและฟังเพลงเบาๆ';
  } else if (dStr === '2026-10-26') {
    headline = '🗣️ ดาวอังคารเล็งพุธ (Exact 0.12°) — ระวังวิวาทะและคำพูด';
    summary = 'มุมเล็งที่รวดเร็วและรุนแรงระหว่างดาวแห่งการต่อสู้ (Mars) กับดาวแห่งการสื่อสาร (Mercury)';
    career = 'อาจมีความเห็นไม่ตรงกันในที่ทำงาน หรือเจอกลุ่มคนที่พูดจาขัดหู';
    finance = 'ระวังการทะเลาะเรื่องผลประโยชน์หรือข้อตกลงที่คลุมเครือ';
    emotion = 'หงุดหงิดง่าย ใจร้อน อยากพูดตอกกลับทันที';
    warning = 'ห้ามตอบโต้ทางแชตหรือใช้อารมณ์ในการประชุมเด็ดขาด นับ 1 ถึง 10 ก่อนพูด';
    action = 'ใช้ความเงียบเป็นเกราะกำบัง สวมเสื้อผ้าโทนดำหรือเทาเข้มเพื่อคุมสติ';
  } else if (dStr === '2026-10-27') {
    headline = 'Bazi Chen-Xu Clash — วันปรับสมดุลตารางชีวิต';
    summary = 'พลังงานมังกรชนหมาในดวงจีน เตือนให้ระวังตารางเวลาแทรกซ้อน';
    career = 'อาจมีงานด่วนเข้ามาขัดจังหวะงานหลัก ต้องจัดลำดับความสำคัญให้ดี';
    finance = 'มีรายจ่ายจิปาถะเกี่ยวกับยานพาหนะหรือการเดินทาง';
    emotion = 'รู้สึกวุ่นวายใจเล็กน้อย แต่รับมือได้';
    warning = 'เช็กสภาพรถ ลมยาง และตรวจสอบเวลานัดหมายให้รอบคอบ';
    action = 'ทำ To-Do List สั้นๆ 3 อย่างที่ต้องทำเสร็จให้ได้ในวันนี้';
  } else if (dStr === '2026-10-28') {
    headline = 'เมฆหมอกจางหาย — เตรียมก้าวสู่ต้นเดือนพฤศจิกายน';
    summary = 'มุมปะทะเริ่มคลายตัว พลังงานเริ่มนิ่งและกลับสู่ทิศทางบวก';
    career = 'งานสอนและงานประจำเริ่มกลับมาเข้าที่เข้าทาง ความกดดันลดลง';
    finance = 'เริ่มวางแผนงบประมาณสำหรับเดือนใหม่ได้อย่างราบรื่น';
    emotion = 'จิตใจปลอดโปร่งขึ้น เริ่มมองเห็นแสงสว่างของสัปดาห์หน้า';
    warning = 'อย่าเพิ่งประมาทเรื่องสุขภาพ พักผ่อนให้พอ';
    action = 'สะสางภาระสิ้นเดือนให้จบ';
  } else if (dStr >= '2026-11-01' && dStr <= '2026-11-05') {
    headline = `🏆 สัปดาห์มหาโชคลาภ Grand Water Trine (Score ${score}/100)`;
    summary = 'นี่คือช่วงเวลาที่ทรงพลังที่สุดของรอบปี! อาทิตย์ในราศีพิจิกตรีโกณกับอาทิตย์มีนแบบองศาเป๊ะ ผสานพฤหัสในราศีสิงห์';
    career = 'จุดพีคของความสำเร็จ! เสนอผลงาน แผนงาน หรือขอความช่วยเหลือจากผู้ใหญ่จะได้รับการตอบรับยอดเยี่ยม';
    finance = 'ช่องทางรายได้เปิดกว้าง มีโอกาสได้รับเงินพิเศษ หรือมีความก้าวหน้าเรื่องอาชีพเสริมอย่างเด่นชัด';
    emotion = 'เบิกบาน มั่นใจ อิ่มเอมใจ มีความสุขกับการทำงานและการใช้ชีวิต';
    warning = 'อย่าลังเลที่จะคว้าโอกาส โอกาสดีๆ มักไม่รอนาน';
    action = 'ลงมือทำโปรเจกต์สำคัญ เจรจาเรื่องเงิน หรือเปิดตัวผลงานใหม่ได้ทันที!';
  } else if (score >= 70) {
    headline = `🌟 วันพลังงานหนุนส่ง (Score ${score}/100)`;
    summary = 'ดาวศุภเคราะห์ทำมุมส่งเสริมอย่างราบรื่น ความคิดและความตั้งใจจะได้รับการสนับสนุน';
    career = 'การประสานงานราบรื่น ผู้ร่วมงานให้ความร่วมมือดี';
    finance = 'กระแสเงินสดคล่องตัว มีช่องทางโชคลาภเล็กๆ น้อยๆ';
    emotion = 'แจ่มใส กระปรี้กระเปร่า มีไฟในการทำงาน';
    warning = 'รักษาความสม่ำเสมอในการทำงาน';
    action = 'ติดต่อประสานงานเรื่องสำคัญ เจรจาธุรกิจหรือผลประโยชน์';
  } else if (score <= 45) {
    headline = `⚠️ วันแรงต้านชั่วคราว (Score ${score}/100)`;
    summary = 'มีมุมดาวเชิงทดสอบความอดทน เหมาะกับการถอยมาตั้งหลักและดูแลตัวเอง';
    career = 'งานอาจมีอุปสรรคเล็กน้อย หรือถูกตรวจสอบอย่างเข้มงวด';
    finance = 'ระวังรายจ่ายไม่คาดคิด รัดเข็มขัดทางการเงินไว้ก่อน';
    emotion = 'อาจรู้สึกตึงเครียดหรือกดดันจากสิ่งรอบข้าง';
    warning = 'อย่าตัดสินใจเรื่องสำคัญหรือเซ็นสัญญาในวันนี้';
    action = 'เน้นงานประจำ ทำหน้าที่เงียบๆ และกลับบ้านพักผ่อน';
  }

  return { headline, summary, career, finance, emotion, warning, action };
}

// Generate 30 days starting from today (dynamic)
const startDate = new Date();
const daysCount = 30;
const timeline = [];

for (let i = 0; i < daysCount; i++) {
  const curDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
  const dateStr = curDate.toISOString().split('T')[0];
  const dayOfWeek = curDate.getDay();
  
  const transits = {};
  for (const b of bodies) {
    const pos = Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[b], curDate, true));
    transits[b] = { deg: pos.elon, signStr: degToSignStr(pos.elon) };
  }

  const aspects = [];
  let scoreFlow = 0;
  let scoreChallenge = 0;

  for (const [tKey, tData] of Object.entries(transits)) {
    for (const [nKey, nData] of Object.entries(NATAL)) {
      const dist = shortArc(tData.deg, nData.deg);
      for (const asp of MAJOR_ASPECTS) {
        const orb = Math.abs(dist - asp.angle);
        if (orb <= asp.maxOrb) {
          const weight = (1 - (orb / asp.maxOrb));
          if (asp.nature === 'flowing') {
            scoreFlow += weight * (tKey === 'Jupiter' || tKey === 'Venus' ? 1.5 : 1.0);
          } else if (asp.nature === 'challenging') {
            scoreChallenge += weight * (tKey === 'Saturn' || tKey === 'Mars' ? 1.5 : 1.0);
          }
          
          aspects.push({
            planet: tKey,
            natalPoint: nKey,
            aspect: asp.name,
            symbol: asp.symbol,
            nature: asp.nature,
            orb: parseFloat(orb.toFixed(2))
          });
        }
      }
    }
  }

  const netScore = Math.max(10, Math.min(95, Math.round(50 + (scoreFlow - scoreChallenge) * 12)));

  const dayItem = {
    dayIndex: i + 1,
    date: dateStr,
    dayOfWeek: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][dayOfWeek],
    bazi: getBaziDay(curDate),
    taksa: TAKSA_MAP[dayOfWeek],
    netScore,
    transits,
    aspectsCount: aspects.length,
    topAspects: aspects.sort((a,b) => a.orb - b.orb).slice(0, 6)
  };

  dayItem.narrative = generateDailyNarrative(dayItem);
  timeline.push(dayItem);
}

// Generate HTML with embedded dynamic data
const templatePath = 'index.html';
let html = fs.readFileSync(templatePath, 'utf-8');

// Replace data payload inside HTML
html = html.replace(/const data = \[[\s\S]*?\];\s*let activeIndex = 0;/, `const data = ${JSON.stringify(timeline)};\n    let activeIndex = 0;`);

// Update range badge
const firstDate = timeline[0].date;
const lastDate = timeline[timeline.length - 1].date;
html = html.replace(/<div class="badge" id="current-range-badge">[\s\S]*?<\/div>/, `<div class="badge" id="current-range-badge">${firstDate} – ${lastDate}</div>`);

fs.writeFileSync('index.html', html, 'utf-8');
fs.writeFileSync('timeline_data.json', JSON.stringify(timeline, null, 2), 'utf-8');

console.log(`[Auto-Generate] Success! Rolling 30-day window: ${firstDate} to ${lastDate}`);
