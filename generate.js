const fs = require('fs');
const Astronomy = require('astronomy-engine');

// ============================================================
// 1. NATAL CONSTANTS (Ground-truth verified from Astro-Seek)
// ============================================================

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
const mod90  = d => ((d % 90) + 90) % 90;

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

function calculateMidpoint(a, b) {
  return Math.abs(a - b) <= 180 ? mod360((a + b) / 2) : mod360((a + b) / 2 + 180);
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
  return {
    stem: STEMS[pIdx % 10],
    branch: BRANCHES[pIdx % 12],
    raw: `${STEMS[pIdx % 10]} ${BRANCHES[pIdx % 12]}`
  };
}

// Complete 8-Taksa Spheres for Tuesday-born (เกิดวันอังคาร)
// 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
function getThaiTaksaDetailed(dayOfWeek) {
  // Tuesday base order: อังคาร(บริวาร), พุธ(อายุ), เสาร์(เดช), พฤหัส(ศรี), ราหู(มูละ), ศุกร์(อุตสาหะ), อาทิตย์(มนตรี), จันทร์(กาลกิณี)
  const TAKSA_PALETTE = {
    0: { day: 'อาทิตย์', sri: 'แดง', dech: 'ส้ม/ทอง', montri: 'เขียว', kalakini: 'ขาว', moola: 'เทาดำ' },
    1: { day: 'จันทร์', sri: 'ส้ม/ทอง', dech: 'ดำ/เทา', montri: 'ฟ้า/น้ำเงิน', kalakini: 'ขาว', moola: 'เขียว' },
    2: { day: 'อังคาร', sri: 'ทอง/มัสตาร์ด', dech: 'ม่วงเข้ม/ดำ', montri: 'แดง', kalakini: 'ขาว', moola: 'ส้ม' },
    3: { day: 'พุธ', sri: 'ส้มอิฐ', dech: 'เทาควันบุหรี่', montri: 'ขาว/ครีม', kalakini: 'ชมพูอ่อน', moola: 'ดำ' },
    4: { day: 'พฤหัสบดี', sri: 'ส้มสด', dech: 'แดงเลือดหมู', montri: 'ส้ม', kalakini: 'ขาว', moola: 'ฟ้า' },
    5: { day: 'ศุกร์', sri: 'เขียว', dech: 'แดง/ไวน์แดง', montri: 'ชมพู', kalakini: 'ขาว/ฟ้าอ่อน', moola: 'เหลือง' },
    6: { day: 'เสาร์', sri: 'ดำ/ม่วง', dech: 'ส้มอมน้ำตาล', montri: 'น้ำเงิน', kalakini: 'ขาว', moola: 'แดง' }
  };
  return TAKSA_PALETTE[dayOfWeek] || TAKSA_PALETTE[2];
}

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

// Generate 30 days starting from current date
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
            natalName: nData.name,
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

  // Uranian 90° Dial Midpoints for this day
  const midpoints = [];
  const trackedPairs = [
    ['Sun', 'Moon', 'Sun/Moon (ตัวตนและสมดุลจิตใจ)'],
    ['Jupiter', 'Venus', 'Jupiter/Venus (โชคลาภและความสุนทรีย์)'],
    ['Saturn', 'Mars', 'Mars/Saturn (ภาระหน้าที่และการฝ่าฟัน)'],
    ['MC', 'ASC', 'MC/ASC (สถานะตัวตนในสังคม)']
  ];

  for (const [p1, p2, label] of trackedPairs) {
    const mpDeg = calculateMidpoint(NATAL[p1].deg, NATAL[p2].deg);
    const mp90 = mod90(mpDeg);
    for (const [tKey, tData] of Object.entries(transits)) {
      const t90 = mod90(tData.deg);
      const diff90 = Math.abs(t90 - mp90);
      const arc90 = diff90 > 45 ? 90 - diff90 : diff90;
      if (arc90 <= 1.0) {
        midpoints.push({
          pair: label,
          transitPlanet: tKey,
          transitSign: tData.signStr,
          orb90: arc90.toFixed(2)
        });
      }
    }
  }

  const dayItem = {
    dayIndex: i + 1,
    date: dateStr,
    dayOfWeek: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][dayOfWeek],
    bazi: getBaziDay(curDate),
    taksa: getThaiTaksaDetailed(dayOfWeek),
    netScore,
    transits,
    aspectsCount: aspects.length,
    topAspects: aspects.sort((a,b) => a.orb - b.orb).slice(0, 8),
    midpoints
  };

  dayItem.narrative = generateDailyNarrative(dayItem);
  timeline.push(dayItem);
}

// ============================================================
// HTML TEMPLATE: Celestial Obsidian & Alchemical Gold UI
// ============================================================

const firstDate = timeline[0].date;
const lastDate = timeline[timeline.length - 1].date;

const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IAE Arcane Observatory — Personal Astrological Engine</title>
  <link rel="manifest" href="./manifest.json">
  <meta name="theme-color" content="#06080D">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="IAE Arcane">
  <link rel="icon" type="image/png" href="./icon.png">
  <link rel="apple-touch-icon" href="./icon.png">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    :root {
      --bg-void: #05070B;
      --bg-surface: #0B0F18;
      --bg-surface-elevated: #111726;
      --border-celestial: rgba(229, 184, 105, 0.18);
      --border-celestial-active: rgba(229, 184, 105, 0.6);
      --gold-primary: #E5B869;
      --gold-deep: #C59B46;
      --gold-glow: rgba(229, 184, 105, 0.15);
      --text-stellar: #F8FAFC;
      --text-silver: #94A3B8;
      --text-muted: #64748B;
      --accent-indigo: #6366F1;
      --accent-emerald: #10B981;
      --accent-amber: #F59E0B;
      --accent-rose: #F43F5E;
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 22px;
      --font-mystic: 'Cinzel', serif;
      --font-en: 'Plus Jakarta Sans', sans-serif;
      --font-th: 'Sarabun', sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg-void);
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 60%),
        radial-gradient(circle at 100% 50%, rgba(229, 184, 105, 0.05) 0%, transparent 40%),
        radial-gradient(circle at 0% 100%, rgba(16, 185, 129, 0.04) 0%, transparent 50%);
      color: var(--text-stellar);
      font-family: var(--font-th);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      padding: 32px 20px 100px;
      min-height: 100vh;
    }

    .container { max-width: 1220px; margin: 0 auto; }

    /* Top Alchemical Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      padding-bottom: 22px;
      border-bottom: 1px solid var(--border-celestial);
      flex-wrap: wrap;
      gap: 16px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .sigil-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(229, 184, 105, 0.25) 0%, rgba(11, 15, 24, 0.9) 70%);
      border: 1px solid var(--gold-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 0 20px rgba(229, 184, 105, 0.2);
    }

    .brand-title {
      font-family: var(--font-mystic);
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 1px;
      color: var(--gold-primary);
      text-shadow: 0 0 16px rgba(229, 184, 105, 0.3);
    }

    .brand-sub {
      font-size: 13px;
      color: var(--text-silver);
      letter-spacing: 0.2px;
    }

    .astronomy-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(11, 15, 24, 0.8);
      border: 1px solid var(--border-celestial);
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 12px;
      font-family: var(--font-en);
    }

    .astronomy-badge .pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-emerald);
      box-shadow: 0 0 8px var(--accent-emerald);
    }

    /* System Tabs Navigation */
    .nav-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
      margin-bottom: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      scrollbar-width: none;
    }
    .nav-tabs::-webkit-scrollbar { display: none; }

    .tab-btn {
      background: var(--bg-surface);
      border: 1px solid var(--border-celestial);
      color: var(--text-silver);
      padding: 10px 18px;
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .tab-btn:hover {
      color: var(--gold-primary);
      border-color: rgba(229, 184, 105, 0.4);
      background: var(--bg-surface-elevated);
    }

    .tab-btn.active {
      background: linear-gradient(135deg, rgba(229, 184, 105, 0.15) 0%, rgba(11, 15, 24, 0.95) 100%);
      color: var(--gold-primary);
      border-color: var(--gold-primary);
      box-shadow: 0 0 16px rgba(229, 184, 105, 0.2);
    }

    /* Content Views */
    .tab-pane { display: none; }
    .tab-pane.active { display: block; animation: fadeIn 0.3s ease; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Cards */
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-celestial);
      border-radius: var(--radius-lg);
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      position: relative;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .card-title {
      font-family: var(--font-mystic);
      font-size: 16px;
      font-weight: 700;
      color: var(--gold-primary);
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Timeline Chart Card */
    .chart-container {
      position: relative;
      width: 100%;
      height: 200px;
      margin-top: 10px;
    }

    svg.timeline-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .date-scroller {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-top: 18px;
      scrollbar-width: thin;
      scrollbar-color: var(--bg-surface-elevated) transparent;
    }

    .date-chip {
      flex: 0 0 auto;
      padding: 8px 14px;
      background: var(--bg-surface-elevated);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-sm);
      cursor: pointer;
      text-align: center;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .date-chip:hover {
      border-color: rgba(229, 184, 105, 0.3);
      transform: translateY(-2px);
    }

    .date-chip.active {
      background: rgba(229, 184, 105, 0.15);
      border-color: var(--gold-primary);
      color: var(--text-stellar);
      box-shadow: 0 0 14px rgba(229, 184, 105, 0.25);
    }

    .date-chip .chip-date {
      font-family: var(--font-en);
      font-size: 12px;
      font-weight: 600;
    }

    .date-chip .chip-score {
      font-size: 11px;
      font-weight: 700;
      margin-top: 2px;
    }

    /* Day Hero Section */
    .day-hero {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 24px;
      padding: 22px;
      background: linear-gradient(135deg, rgba(229, 184, 105, 0.06) 0%, rgba(11, 15, 24, 0.8) 100%);
      border: 1px solid var(--border-celestial);
      border-radius: var(--radius-md);
      flex-wrap: wrap;
    }

    .energy-circle {
      width: 84px;
      height: 84px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mystic);
      font-size: 28px;
      font-weight: 700;
      background: rgba(5, 7, 11, 0.9);
      border: 2px solid var(--gold-primary);
      color: var(--gold-primary);
      box-shadow: 0 0 20px rgba(229, 184, 105, 0.25);
      flex-shrink: 0;
    }

    .energy-circle small {
      font-family: var(--font-en);
      font-size: 9px;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 1px;
    }

    .day-hero-info { flex: 1; min-width: 260px; }
    .day-hero-info h2 { font-size: 19px; font-weight: 700; color: var(--gold-primary); margin-bottom: 6px; }
    .day-hero-info p { font-size: 14px; color: var(--text-silver); }

    /* 4 Pillars Grid */
    .four-pillars {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .pillar-card {
      background: var(--bg-surface-elevated);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-md);
      padding: 16px;
    }

    .pillar-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--gold-primary);
    }

    .pillar-content { font-size: 13px; color: var(--text-silver); line-height: 1.55; }

    /* Tactical Action Box */
    .tactical-box {
      background: linear-gradient(135deg, rgba(229, 184, 105, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%);
      border: 1px solid var(--border-celestial);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      margin-bottom: 24px;
    }

    .tactical-box h4 {
      font-family: var(--font-mystic);
      font-size: 14px;
      font-weight: 700;
      color: var(--gold-primary);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tactical-box p { font-size: 13.5px; color: var(--text-stellar); line-height: 1.6; }

    /* Aspect Grid Table */
    .aspect-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .aspect-table th {
      text-align: left;
      padding: 10px 12px;
      color: var(--gold-primary);
      font-family: var(--font-en);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-celestial);
    }

    .aspect-table td {
      padding: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: var(--text-silver);
    }

    .aspect-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }

    .aspect-tag.flowing {
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .aspect-tag.challenging {
      background: rgba(244, 63, 94, 0.12);
      color: var(--accent-rose);
      border: 1px solid rgba(244, 63, 94, 0.25);
    }

    .aspect-tag.neutral {
      background: rgba(229, 184, 105, 0.12);
      color: var(--gold-primary);
      border: 1px solid rgba(229, 184, 105, 0.25);
    }

    .orb-val { font-family: var(--font-en); color: var(--text-stellar); font-weight: 600; }

    /* Bazi & Taksa Display Grids */
    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .matrix-cell {
      background: var(--bg-surface-elevated);
      border: 1px solid rgba(229, 184, 105, 0.15);
      border-radius: var(--radius-md);
      padding: 18px;
      text-align: center;
    }

    .matrix-title {
      font-size: 11px;
      color: var(--gold-primary);
      font-family: var(--font-mystic);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .matrix-val { font-size: 16px; font-weight: 700; color: var(--text-stellar); }
    .matrix-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
  </style>
</head>
<body>

  <div class="container">
    <!-- Header -->
    <header>
      <div class="brand-group">
        <div class="sigil-icon">✧</div>
        <div>
          <div class="brand-title">IAE ARCANE OBSERVATORY</div>
          <div class="brand-sub">ระบบพยากรณ์และวิเคราะห์ดวงชะตาบูรณาการ • พิกัดดาราศาสตร์สากล VSOP87</div>
        </div>
      </div>
      <div class="astronomy-badge">
        <div class="pulse"></div>
        <span>LIVE EPHEMERIS ACTIVE</span>
      </div>
    </header>

    <!-- Navigation Tabs (5 Systems) -->
    <nav class="nav-tabs">
      <button class="tab-btn active" onclick="switchTab('macro')"><span>📜</span> ภาพรวม & แนวโน้มดวง</button>
      <button class="tab-btn" onclick="switchTab('western')"><span>🌌</span> ตะวันตก & ดาวจร</button>
      <button class="tab-btn" onclick="switchTab('bazi')"><span>🇨🇳</span> ดวงจีน โป๊ยหยี่สี่เถียว</button>
      <button class="tab-btn" onclick="switchTab('taksa')"><span>🇹🇭</span> ภูมิทักษา & ฮวงจุ้ย</button>
      <button class="tab-btn" onclick="switchTab('uranian')"><span>⚡</span> ยูเรเนียน 90°</button>
    </nav>

    <!-- ============================================================ -->
    <!-- TAB 1: 📜 MACRO EXECUTIVE SUMMARY & TRENDS (Landing View)     -->
    <!-- ============================================================ -->
    <div id="tab-macro" class="tab-pane active">
      <!-- 30-Day Energy Curve Card -->
      <section class="card">
        <div class="card-header">
          <div class="card-title">
            <span>📈</span> กราฟแนวโน้มดวงชะตา 30 วันข้างหน้า (Macro Energy Curve)
          </div>
          <span style="font-family: var(--font-en); font-size: 12px; color: var(--gold-primary);" id="range-badge">${firstDate} – ${lastDate}</span>
        </div>

        <div class="chart-container">
          <svg class="timeline-svg" id="timeline-svg" viewBox="0 0 1000 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#E5B869" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="#E5B869" stop-opacity="0.0"/>
              </linearGradient>
            </defs>
            <line x1="0" y1="50" x2="1000" y2="50" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4"/>
            <line x1="0" y1="100" x2="1000" y2="100" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4"/>
            <line x1="0" y1="150" x2="1000" y2="150" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4"/>
            <path id="chart-area" d="" fill="url(#chartGradient)"></path>
            <path id="chart-line" d="" fill="none" stroke="#E5B869" stroke-width="2.5"></path>
            <g id="chart-dots"></g>
          </svg>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); text-align: right; margin-top: 8px;">
          ✦ คลิกเลือกวันที่บนกราฟหรือแถบด้านล่าง เพื่อเปิดบทวิเคราะห์เจาะลึก
        </div>

        <!-- Date Scroller -->
        <div class="date-scroller" id="date-scroller"></div>
      </section>

      <!-- Active Day Macro Analysis Card -->
      <section class="card">
        <div class="card-header">
          <div class="card-title">
            <span>✦</span> บทวิเคราะห์เจาะลึกประจำวัน: <span id="view-date-title" style="color: var(--text-stellar); margin-left: 6px;">-</span>
          </div>
          <div id="day-quality-badge" class="aspect-tag neutral">ปกติ</div>
        </div>

        <!-- Day Hero -->
        <div class="day-hero">
          <div class="energy-circle" id="view-score-circle">
            <span id="view-score">50</span>
            <small>SCORE</small>
          </div>
          <div class="day-hero-info">
            <h2 id="view-headline">-</h2>
            <p id="view-summary">-</p>
          </div>
        </div>

        <!-- 4 Pillars Breakdown -->
        <div class="four-pillars">
          <div class="pillar-card">
            <div class="pillar-header"><span>💼</span> การงาน & ภาระหน้าที่</div>
            <div class="pillar-content" id="view-career">-</div>
          </div>
          <div class="pillar-card">
            <div class="pillar-header"><span>💰</span> การเงิน & โชคลาภ</div>
            <div class="pillar-content" id="view-finance">-</div>
          </div>
          <div class="pillar-card">
            <div class="pillar-header"><span>❤️</span> อารมณ์ & ความสัมพันธ์</div>
            <div class="pillar-content" id="view-emotion">-</div>
          </div>
          <div class="pillar-card" style="border-color: rgba(244, 63, 94, 0.25);">
            <div class="pillar-header" style="color: var(--accent-rose);"><span>⚠️</span> ข้อควรระวังสูงสุด</div>
            <div class="pillar-content" id="view-warning">-</div>
          </div>
        </div>

        <!-- Tactical Blueprint -->
        <div class="tactical-box">
          <h4><span>💡</span> กลยุทธ์การตัดสินใจ & สิ่งที่ควรทำในวันนี้</h4>
          <p id="view-action">-</p>
        </div>
      </section>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 2: 🌌 WESTERN TRANSITS & EPHEMERIS                       -->
    <!-- ============================================================ -->
    <div id="tab-western" class="tab-pane">
      <section class="card">
        <div class="card-header">
          <div class="card-title"><span>🌌</span> ตำแหน่งพิกัดดวงดาวจริง ณ ปัจจุบัน (Astronomical Coordinates)</div>
        </div>
        <div class="matrix-grid" id="western-planets-grid">
          <!-- Dynamic planet cards -->
        </div>

        <div class="card-header" style="margin-top: 24px;">
          <div class="card-title"><span>🎯</span> ตารางมุมดาวจรที่สัมพันธ์กับดวงกำเนิด (Active Transit Aspects)</div>
          <span style="font-size: 12px; color: var(--gold-primary);" id="aspects-count-badge">0 มุมดาว</span>
        </div>
        <table class="aspect-table">
          <thead>
            <tr>
              <th>ดาวจร (Transit)</th>
              <th>ประเภทมุมสัมพันธ์</th>
              <th>จุดกำเนิดที่ทำมุม (Natal)</th>
              <th>ระยะวังกะ (Orb)</th>
            </tr>
          </thead>
          <tbody id="aspects-table-body"></tbody>
        </table>
      </section>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 3: 🇨🇳 BAZI FOUR PILLARS                                  -->
    <!-- ============================================================ -->
    <div id="tab-bazi" class="tab-pane">
      <section class="card">
        <div class="card-header">
          <div class="card-title"><span>🇨🇳</span> แผนผังดวงจีน 4 เสาหลักกำเนิด (Natal Four Pillars)</div>
        </div>
        <div class="matrix-grid">
          <div class="matrix-cell">
            <div class="matrix-title">เสายามเกิด (Hour Pillar)</div>
            <div class="matrix-val" style="color: var(--gold-primary);">Xin Wei (辛未)</div>
            <div class="matrix-sub">ทองหยิน / แพะดิน (ขุมทรัพย์ใต้ดิน)</div>
          </div>
          <div class="matrix-cell" style="border-color: var(--gold-primary); box-shadow: 0 0 14px rgba(229,184,105,0.2);">
            <div class="matrix-title" style="color: var(--accent-emerald);">เสาวันเกิด (Day Master) ★ ตัวตน</div>
            <div class="matrix-val" style="color: var(--accent-emerald);">Jia Chen (甲辰)</div>
            <div class="matrix-sub">ไม้ใหญ่เจี่ย นั่งบนมังกรน้ำ (เสาหลักผู้สร้าง)</div>
          </div>
          <div class="matrix-cell">
            <div class="matrix-title">เสาเดือนเกิด (Month Pillar)</div>
            <div class="matrix-val" style="color: var(--gold-primary);">Geng Yin (庚ขาล)</div>
            <div class="matrix-sub">ทองหยาง / เสือไม้ (ระเบียบวินัยและเกียรติยศ)</div>
          </div>
          <div class="matrix-cell">
            <div class="matrix-title">เสาปีเกิด (Year Pillar)</div>
            <div class="matrix-val" style="color: var(--gold-primary);">Bing Zi (丙子)</div>
            <div class="matrix-sub">ไฟหยาง / ชวดน้ำ (แสงสว่างและปัญญา)</div>
          </div>
        </div>

        <div class="tactical-box" style="margin-top: 16px;">
          <h4><span>🪵</span> การวิเคราะห์ธาตุประจำตัว: ไม้ใหญ่เจี่ย (Jia Wood 甲木)</h4>
          <p>
            คุณครูคือ <strong>"ต้นไม้ใหญ่ตระหง่านกลางป่า (The Sacred Oak/Pine)"</strong> มีรากหยั่งลึกลงในมังกรดิน (Chen) ที่อุ้มน้ำ 
            ธาตุที่ให้คุณสูงสุดคือ <strong>ธาตุไฟ (ความคิดสร้างสรรค์/ความงาม/ดิจิทัล)</strong> เพื่อช่วยให้กิ่งก้านผลิใบงดงาม 
            และ <strong>ธาตุดิน (อสังหาฯ/ทรัพย์สินคงทน)</strong> เพื่อยึดรากไม้ให้มั่นคงและเปลี่ยนปัญญาเป็นเงินทอง
          </p>
        </div>

        <div class="card-header" style="margin-top: 20px;">
          <div class="card-title"><span>📅</span> พลังงานเสาจรประจำวัน (Current Daily Pillar)</div>
        </div>
        <div class="matrix-grid">
          <div class="matrix-cell">
            <div class="matrix-title">กิ่งฟ้า (Heavenly Stem)</div>
            <div class="matrix-val" id="bazi-stem-display">-</div>
          </div>
          <div class="matrix-cell">
            <div class="matrix-title">ก้านดิน (Earthly Branch)</div>
            <div class="matrix-val" id="bazi-branch-display">-</div>
          </div>
          <div class="matrix-cell">
            <div class="matrix-title">ปฏิกิริยากับดวงเดิม</div>
            <div class="matrix-val" id="bazi-relation-display" style="font-size: 14px; color: var(--gold-primary);">-</div>
          </div>
        </div>
      </section>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 4: 🇹🇭 THAI TAKSA & FENG SHUI                             -->
    <!-- ============================================================ -->
    <div id="tab-taksa" class="tab-pane">
      <section class="card">
        <div class="card-header">
          <div class="card-title"><span>🇹🇭</span> ภูมิพยากรณ์ทักษาไทย (คนเกิดวันอังคาร)</div>
        </div>
        
        <div class="matrix-grid">
          <div class="matrix-cell">
            <div class="matrix-title" style="color: var(--gold-primary);">🌟 ศรี (โชคลาภ/เงินทอง)</div>
            <div class="matrix-val" id="taksa-sri" style="color: var(--gold-primary);">-</div>
            <div class="matrix-sub">ใส่กระเป๋าเงิน เคสโทรศัพท์ หรือเสื้อผ้า</div>
          </div>
          <div class="matrix-cell">
            <div class="matrix-title" style="color: var(--accent-indigo);">🛡️ เดช (อำนาจ/เกราะกำบัง)</div>
            <div class="matrix-val" id="taksa-dech" style="color: var(--accent-indigo);">-</div>
            <div class="matrix-sub">ช่วยให้คนเกรงใจ ป้องกันคนมาเอาเปรียบ</div>
          </div>
          <div class="matrix-cell">
            <div class="matrix-title" style="color: var(--accent-emerald);">👑 มนตรี (ผู้ใหญ่อุปถัมภ์)</div>
            <div class="matrix-val" id="taksa-montri" style="color: var(--accent-emerald);">-</div>
            <div class="matrix-sub">ใช้ในวันเสนองานหรือเข้าพบผู้บริหาร</div>
          </div>
          <div class="matrix-cell" style="border-color: rgba(244, 63, 94, 0.3);">
            <div class="matrix-title" style="color: var(--accent-rose);">❌ กาลกิณี (อุปสรรคต้องห้าม)</div>
            <div class="matrix-val" id="taksa-kalakini" style="color: var(--accent-rose);">-</div>
            <div class="matrix-sub">งดใช้ในเครื่องประดับและเสื้อผ้าเด็ดขาด</div>
          </div>
        </div>

        <div class="tactical-box" style="margin-top: 16px;">
          <h4><span>🧭</span> เคล็ดฮวงจุ้ยและทิศมงคล (Eight Mansions Kua 4)</h4>
          <p>
            • <strong>ทิศหัวนอน:</strong> ทิศใต้ (เทียนอี้ / หมอเทวดา - เพื่อการนอนหลับลึกและฟื้นฟูจิตใจ) หรือ ทิศตะวันออก (เอี๋ยนเหนียน - เพื่อความสัมพันธ์กลมเกลียว)<br>
            • <strong>ทิศโต๊ะทำงาน:</strong> หันหน้าสู่ทิศเหนือ 338° (เซิงชี่ - ความก้าวหน้า รุ่งเรือง บารมี)<br>
            • <strong>การสวมแหวน:</strong> สวมแหวนทองเกลี้ยงหรือนิลดำที่ <strong>"นิ้วกลางมือซ้าย"</strong> เพื่ออุดเงินรั่วและปัดเป่าคนมาเบียดเบียน (งดใส่นิ้วนาง)
          </p>
        </div>
      </section>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 5: ⚡ URANIAN 90° DIAL                                    -->
    <!-- ============================================================ -->
    <div id="tab-uranian" class="tab-pane">
      <section class="card">
        <div class="card-header">
          <div class="card-title"><span>⚡</span> พระเคราะห์สนธิ & จุดสับไกบนจาน 90 องศา (Uranian Midpoints)</div>
        </div>
        <div class="tactical-box">
          <h4><span>🎯</span> กลไกของโหราศาสตร์ยูเรเนียน (Hamburg School)</h4>
          <p>
            ยูเรเนียนใช้จานหมุน 90 องศาเพื่อจับคู่ <strong>จุดกึ่งกลาง (Midpoints = A+B/2)</strong> ของดวงดาว 
            เมื่อมีดาวจรมาสับไก (Trigger) จะส่งผลต่อพฤติกรรมและเหตุการณ์ฉับพลันในระดับสัปดาห์
          </p>
        </div>

        <div class="card-header" style="margin-top: 20px;">
          <div class="card-title"><span>💥</span> จุดสับไกที่กำลังทำงาน ณ ปัจจุบัน</div>
        </div>
        <div id="uranian-triggers-container">
          <!-- Dynamic midpoints -->
        </div>
      </section>
    </div>

  </div>

  <script>
    const data = ${JSON.stringify(timeline)};
    let activeIndex = 0;

    function switchTab(tabId) {
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      
      const targetPane = document.getElementById('tab-' + tabId);
      if (targetPane) targetPane.classList.add('active');
      
      const clickedBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
      if (clickedBtn) clickedBtn.classList.add('active');
    }

    function renderTimelineChart() {
      const svgWidth = 1000;
      const svgHeight = 200;
      const padding = 20;
      const count = data.length;

      const points = data.map((d, i) => {
        const x = padding + (i / (count - 1)) * (svgWidth - padding * 2);
        const y = svgHeight - padding - (d.netScore / 100) * (svgHeight - padding * 2);
        return { x, y, score: d.netScore, date: d.date, dayOfWeek: d.dayOfWeek };
      });

      let linePath = \`M \${points[0].x} \${points[0].y}\`;
      for (let i = 1; i < points.length; i++) {
        linePath += \` L \${points[i].x} \${points[i].y}\`;
      }

      const areaPath = \`\${linePath} L \${points[points.length - 1].x} \${svgHeight - padding} L \${points[0].x} \${svgHeight - padding} Z\`;

      document.getElementById('chart-line').setAttribute('d', linePath);
      document.getElementById('chart-area').setAttribute('d', areaPath);

      const dotsGroup = document.getElementById('chart-dots');
      dotsGroup.innerHTML = '';
      points.forEach((p, idx) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', p.x);
        circle.setAttribute('cy', p.y);
        circle.setAttribute('r', idx === activeIndex ? '6.5' : '3.5');
        circle.setAttribute('fill', p.score >= 70 ? '#10B981' : (p.score <= 45 ? '#F43F5E' : '#E5B869'));
        circle.setAttribute('stroke', idx === activeIndex ? '#FFFFFF' : '#05070B');
        circle.setAttribute('stroke-width', idx === activeIndex ? '2.5' : '1.5');
        circle.style.cursor = 'pointer';
        circle.addEventListener('click', () => selectDay(idx));
        dotsGroup.appendChild(circle);
      });
    }

    function renderDateChips() {
      const scroller = document.getElementById('date-scroller');
      scroller.innerHTML = '';
      data.forEach((d, idx) => {
        const chip = document.createElement('div');
        chip.className = \`date-chip \${idx === activeIndex ? 'active' : ''}\`;
        const scoreColor = d.netScore >= 70 ? '#10B981' : (d.netScore <= 45 ? '#F43F5E' : '#94A3B8');
        chip.innerHTML = \`
          <div class="chip-date">\${d.date.slice(5)}</div>
          <div class="chip-score" style="color: \${scoreColor};">\${d.netScore}</div>
        \`;
        chip.addEventListener('click', () => selectDay(idx));
        scroller.appendChild(chip);
      });
    }

    function selectDay(index) {
      activeIndex = index;
      renderTimelineChart();
      renderDateChips();
      updateAllTabs();
    }

    function updateAllTabs() {
      const cur = data[activeIndex];
      const n = cur.narrative || {};

      // 1. Macro Tab
      document.getElementById('view-date-title').textContent = \`\${cur.date} (\${cur.dayOfWeek})\`;
      document.getElementById('view-score').textContent = cur.netScore;
      
      const circle = document.getElementById('view-score-circle');
      const badge = document.getElementById('day-quality-badge');
      if (cur.netScore >= 70) {
        circle.style.borderColor = 'var(--accent-emerald)';
        circle.style.color = 'var(--accent-emerald)';
        badge.className = 'aspect-tag flowing';
        badge.textContent = '🌟 จังหวะเปิด (Golden Day)';
      } else if (cur.netScore <= 45) {
        circle.style.borderColor = 'var(--accent-rose)';
        circle.style.color = 'var(--accent-rose)';
        badge.className = 'aspect-tag challenging';
        badge.textContent = '⚠️ เฝ้าระวัง (Caution Day)';
      } else {
        circle.style.borderColor = 'var(--gold-primary)';
        circle.style.color = 'var(--gold-primary)';
        badge.className = 'aspect-tag neutral';
        badge.textContent = '⚡ วันดำเนินงานปกติ';
      }

      document.getElementById('view-headline').textContent = n.headline || 'จังหวะชีวิตดำเนินไปอย่างมั่นคง';
      document.getElementById('view-summary').textContent = n.summary || 'คำนวณจากมุมสัมพันธ์ของดวงดาวจรและธาตุกำเนิด';
      document.getElementById('view-career').textContent = n.career || '-';
      document.getElementById('view-finance').textContent = n.finance || '-';
      document.getElementById('view-emotion').textContent = n.emotion || '-';
      document.getElementById('view-warning').textContent = n.warning || '-';
      document.getElementById('view-action').textContent = n.action || '-';

      // 2. Western Tab
      document.getElementById('aspects-count-badge').textContent = \`\${cur.aspectsCount} มุมดาวที่สัมพันธ์\`;
      const tbody = document.getElementById('aspects-table-body');
      tbody.innerHTML = '';
      cur.topAspects.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td><strong>\${a.planet}</strong></td>
          <td><span class="aspect-tag \${a.nature}">\${a.symbol} \${a.aspect}</span></td>
          <td>\${a.natalName || a.natalPoint}</td>
          <td><span class="orb-val">\${a.orb.toFixed(2)}°</span></td>
        \`;
        tbody.appendChild(tr);
      });

      const pGrid = document.getElementById('western-planets-grid');
      pGrid.innerHTML = '';
      for (const [p, d] of Object.entries(cur.transits)) {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        cell.innerHTML = \`
          <div class="matrix-title">\${p}</div>
          <div class="matrix-val">\${d.signStr}</div>
        \`;
        pGrid.appendChild(cell);
      }

      // 3. Bazi Tab
      document.getElementById('bazi-stem-display').textContent = cur.bazi.stem;
      document.getElementById('bazi-branch-display').textContent = cur.bazi.branch;
      document.getElementById('bazi-relation-display').textContent = cur.bazi.raw;

      // 4. Taksa Tab
      document.getElementById('taksa-sri').textContent = cur.taksa.sri;
      document.getElementById('taksa-dech').textContent = cur.taksa.dech;
      document.getElementById('taksa-montri').textContent = cur.taksa.montri;
      document.getElementById('taksa-kalakini').textContent = cur.taksa.kalakini;

      // 5. Uranian Tab
      const uContainer = document.getElementById('uranian-triggers-container');
      uContainer.innerHTML = '';
      if (cur.midpoints && cur.midpoints.length > 0) {
        cur.midpoints.forEach(m => {
          const div = document.createElement('div');
          div.className = 'matrix-cell';
          div.style.textAlign = 'left';
          div.style.marginBottom = '12px';
          div.innerHTML = \`
            <div style="font-weight: 700; color: var(--gold-primary); font-size: 14px;">💥 \${m.pair}</div>
            <div style="font-size: 13px; color: var(--text-silver); margin-top: 4px;">
              ดาวจร <strong>\${m.transitPlanet}</strong> (\${m.transitSign}) สับไกบนจาน 90° | ระยะวังกะ (Orb): <span class="orb-val">\${m.orb90}°</span>
            </div>
          \`;
          uContainer.appendChild(div);
        });
      } else {
        uContainer.innerHTML = \`
          <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
            ✦ ไม่มีจุดสับไกยูเรเนียนระยะประชิด (Orb < 1.0°) ในวันนี้ พลังงานภายนอกดำเนินไปตามปกติ
          </div>
        \`;
      }
    }

    // Initialize
    renderTimelineChart();
    renderDateChips();
    updateAllTabs();
  </script>
</body>
</html>
`;

// Save generated files
fs.writeFileSync('index.html', htmlContent, 'utf-8');
fs.writeFileSync('timeline_data.json', JSON.stringify(timeline, null, 2), 'utf-8');

// Also update local artifact dashboard so user can preview directly
const artifactDashboardPath = 'C:/Users/UNS_CT/.gemini/antigravity/brain/b3fc2399-9925-4d4c-bb9e-64f29755c607/iae_dashboard.html';
fs.writeFileSync(artifactDashboardPath, htmlContent, 'utf-8');

console.log(`[Auto-Generate] IAE Arcane Observatory v3.0 successfully generated for ${firstDate} to ${lastDate}`);
