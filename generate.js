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
  { name: 'Conjunction (☌)', angle: 0,   maxOrb: 3.5, symbol: '☌', nature: 'neutral', desc: 'รวมพลังเข้มข้น ผสานอิทธิพลเป็นหนึ่งเดียว' },
  { name: 'Opposition (☍)',  angle: 180, maxOrb: 3.5, symbol: '☍', nature: 'challenging', desc: 'การปะทะ เผชิญหน้า ดึงดูดพลังขั้วตรงข้าม' },
  { name: 'Trine (△)',       angle: 120, maxOrb: 3.5, symbol: '△', nature: 'flowing', desc: 'กระแสน้ำไหลลื่น ส่งเสริมราบรื่น ไร้แรงต้าน' },
  { name: 'Square (□)',      angle: 90,  maxOrb: 3.0, symbol: '□', nature: 'challenging', desc: 'มุมฉากแห่งแรงกดดัน บททดสอบเพื่อการเติบโต' },
  { name: 'Sextile (✱)',     angle: 60,  maxOrb: 2.5, symbol: '✱', nature: 'flowing', desc: 'โอกาสเปิดทาง เกื้อหนุนอย่างกลมกลืน' }
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

function getThaiTaksaDetailed(dayOfWeek) {
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
            desc: asp.desc,
            orb: parseFloat(orb.toFixed(2))
          });
        }
      }
    }
  }

  const netScore = Math.max(10, Math.min(95, Math.round(50 + (scoreFlow - scoreChallenge) * 12)));

  const midpoints = [];
  const trackedPairs = [
    ['Sun', 'Moon', 'Sun/Moon (สมดุลตัวตนและความสุขภายใน)', 'สะท้อนความกลมกลืนระหว่างชีวิตส่วนตัวและหน้าที่'],
    ['Jupiter', 'Venus', 'Jupiter/Venus (โชคลาภ ศิลปะ และความมั่งคั่ง)', 'จุดเหนี่ยวนำความสำเร็จทางการเงินและความคิดสร้างสรรค์'],
    ['Saturn', 'Mars', 'Mars/Saturn (การฟันฝ่าภาระหน้าที่และความทรหด)', 'จุดทดสอบความอดทน การเอาชนะอุปสรรค และภาระงานหนัก'],
    ['MC', 'ASC', 'MC/ASC (สถานะตัวตนและการยอมรับในสังคม)', 'จุดสร้างชื่อเสียง บารมี และการยอมรับจากผู้ใหญ่']
  ];

  for (const [p1, p2, label, desc] of trackedPairs) {
    const mpDeg = calculateMidpoint(NATAL[p1].deg, NATAL[p2].deg);
    const mp90 = mod90(mpDeg);
    for (const [tKey, tData] of Object.entries(transits)) {
      const t90 = mod90(tData.deg);
      const diff90 = Math.abs(t90 - mp90);
      const arc90 = diff90 > 45 ? 90 - diff90 : diff90;
      if (arc90 <= 1.0) {
        midpoints.push({
          pair: label,
          desc: desc,
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

const firstDate = timeline[0].date;
const lastDate = timeline[timeline.length - 1].date;

// ============================================================
// HTML TEMPLATE: Arcane Observatory with Deep Meaning Guides
// ============================================================

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
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✧</text></svg>">
  <link rel="shortcut icon" href="./favicon.ico">
  <link rel="icon" type="image/png" href="./icon.png">
  <link rel="apple-touch-icon" href="./icon.png">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- HTML to Image CDN for High-DPI Social Card Export -->
  <script src="https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js"></script>

  <style>
    :root {
      --bg-void: #05070B;
      --bg-surface: #0B0F18;
      --bg-surface-elevated: #111726;
      --border-celestial: rgba(229, 184, 105, 0.18);
      --border-celestial-active: rgba(229, 184, 105, 0.6);
      --gold-primary: #E5B869;
      --gold-deep: #C59B46;
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

    .brand-group { display: flex; align-items: center; gap: 14px; }

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

    .brand-sub { font-size: 13px; color: var(--text-silver); }

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

    /* Tabs Navigation */
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

    .tab-pane { display: none; }
    .tab-pane.active { display: block; animation: fadeIn 0.3s ease; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* System Charter Banner (Meaning of each system) */
    .system-charter {
      background: linear-gradient(135deg, rgba(229, 184, 105, 0.12) 0%, rgba(99, 102, 241, 0.05) 50%, rgba(5, 7, 11, 0.9) 100%);
      border: 1px solid var(--border-celestial);
      border-left: 4px solid var(--gold-primary);
      border-radius: var(--radius-md);
      padding: 18px 22px;
      margin-bottom: 24px;
    }

    .system-charter h3 {
      font-family: var(--font-mystic);
      font-size: 15px;
      font-weight: 700;
      color: var(--gold-primary);
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .system-charter p {
      font-size: 13.5px;
      color: var(--text-silver);
      line-height: 1.6;
    }

    /* Cards */
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-celestial);
      border-radius: var(--radius-lg);
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 10px;
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

    .date-chip .chip-date { font-family: var(--font-en); font-size: 12px; font-weight: 600; }
    .date-chip .chip-score { font-size: 11px; font-weight: 700; margin-top: 2px; }

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

    .energy-circle small { font-family: var(--font-en); font-size: 9px; font-weight: 600; color: var(--text-muted); }

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

    /* Tactical Box */
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

    /* Deep Interpretation Cards */
    .interpretation-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .interpretation-card {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-celestial);
      border-radius: var(--radius-md);
      padding: 18px;
    }

    .interpretation-card h5 {
      font-size: 14px;
      font-weight: 700;
      color: var(--gold-primary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .interpretation-card p {
      font-size: 13px;
      color: var(--text-silver);
      line-height: 1.55;
    }

    /* Aspect Grid Table */
    .aspect-table { width: 100%; border-collapse: collapse; font-size: 13px; }

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

    /* Matrix Grids */
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

    /* Header Action Group & Export Button */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .export-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, rgba(229, 184, 105, 0.22) 0%, rgba(99, 102, 241, 0.18) 100%);
      border: 1px solid var(--gold-primary);
      color: var(--gold-primary);
      padding: 8px 18px;
      border-radius: 999px;
      font-family: var(--font-th);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 0 16px rgba(229, 184, 105, 0.15);
    }

    .export-btn:hover {
      background: linear-gradient(135deg, rgba(229, 184, 105, 0.4) 0%, rgba(99, 102, 241, 0.3) 100%);
      box-shadow: 0 0 24px rgba(229, 184, 105, 0.35);
      transform: translateY(-1px);
    }

    /* Modal Overlay & Box */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(5, 7, 11, 0.88);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
    }

    .modal-overlay.active {
      display: flex;
    }

    .modal-box {
      background: #0B0F1A;
      border: 1px solid var(--gold-primary);
      border-radius: var(--radius-lg);
      max-width: 560px;
      width: 100%;
      padding: 30px 26px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(229, 184, 105, 0.25);
      animation: modalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border-celestial);
      padding-bottom: 14px;
    }

    .modal-header h3 {
      font-family: var(--font-mystic);
      font-size: 19px;
      color: var(--gold-primary);
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .modal-header p {
      font-size: 13px;
      color: var(--text-silver);
    }

    .modal-section {
      margin-bottom: 16px;
    }

    .modal-section-title {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--gold-primary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mystic);
      letter-spacing: 0.5px;
    }

    .option-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .option-card {
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
    }

    .option-card:hover {
      border-color: rgba(229, 184, 105, 0.5);
      background: rgba(229, 184, 105, 0.05);
    }

    .option-card.selected {
      border-color: var(--gold-primary);
      background: rgba(229, 184, 105, 0.12);
      box-shadow: 0 0 16px rgba(229, 184, 105, 0.15);
    }

    .option-card h4 {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-stellar);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .option-card p {
      font-size: 11px;
      color: var(--text-silver);
      line-height: 1.4;
    }

    .modal-actions {
      display: flex;
      gap: 10px;
      margin-top: 22px;
    }

    .modal-btn-confirm {
      flex: 2;
      background: linear-gradient(135deg, #E5B869 0%, #B8860B 100%);
      color: #05070B;
      border: none;
      border-radius: var(--radius-md);
      padding: 12px 18px;
      font-family: var(--font-th);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 0 20px rgba(229, 184, 105, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .modal-btn-confirm:hover {
      background: linear-gradient(135deg, #F3D291 0%, #D4AF37 100%);
      transform: translateY(-1px);
    }

    .modal-btn-cancel {
      flex: 1;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-celestial);
      color: var(--text-silver);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      font-family: var(--font-th);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .modal-btn-cancel:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-stellar);
    }

    /* Print Dossier Core Styles (Hidden on Screen) */
    #print-dossier {
      display: none;
    }

    /* Print Media Query */
    @media print {
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: none !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .container, .modal-overlay, nav, header {
        display: none !important;
      }

      #print-dossier {
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 6mm 10mm !important;
        box-sizing: border-box !important;
        font-family: var(--font-th) !important;
      }

      @page {
        size: A4 portrait;
        margin: 8mm 10mm 10mm 10mm;
      }

      .dossier-avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }

    /* Theme: Celestial Obsidian */
    #print-dossier.theme-obsidian {
      background: #06080F !important;
      color: #F8FAFC !important;
    }

    #print-dossier.theme-obsidian .dossier-header-block {
      border-bottom: 2px solid #E5B869;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    #print-dossier.theme-obsidian .dossier-main-title {
      color: #E5B869;
      font-family: var(--font-mystic);
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    #print-dossier.theme-obsidian .dossier-sub-title {
      font-size: 11.5px;
      color: #94A3B8;
    }

    #print-dossier.theme-obsidian .dossier-scope-badge {
      background: rgba(229, 184, 105, 0.15);
      color: #E5B869;
      border: 1px solid #E5B869;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      font-family: var(--font-en);
    }

    #print-dossier.theme-obsidian .dossier-meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px 14px;
      background: #0B101D;
      border: 1px solid rgba(229, 184, 105, 0.25);
      border-radius: 10px;
      padding: 10px 14px;
      margin-top: 12px;
      font-size: 11.5px;
    }

    #print-dossier.theme-obsidian .meta-label {
      color: #E5B869;
      font-weight: 600;
    }

    #print-dossier.theme-obsidian .meta-val {
      color: #F8FAFC;
    }

    #print-dossier.theme-obsidian .dossier-summary-box {
      background: rgba(229, 184, 105, 0.08) !important;
      border: 1px solid rgba(229, 184, 105, 0.3) !important;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 14px;
      font-size: 12px;
      line-height: 1.5;
    }

    #print-dossier.theme-obsidian .dossier-section-heading {
      color: #E5B869;
      font-family: var(--font-mystic);
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 6px;
    }

    #print-dossier.theme-obsidian .dossier-day-card {
      background: #0B0F1A !important;
      border: 1px solid rgba(229, 184, 105, 0.25) !important;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    #print-dossier.theme-obsidian .d-pillar {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 8px 10px;
    }

    #print-dossier.theme-obsidian .dp-title {
      color: #E5B869;
      font-weight: 600;
      font-size: 11.5px;
      margin-bottom: 4px;
    }

    #print-dossier.theme-obsidian .dp-body {
      color: #CBD5E1;
      font-size: 11px;
      line-height: 1.45;
    }

    #print-dossier.theme-obsidian .day-headline-quote {
      color: #F8FAFC;
      font-size: 13px;
      font-weight: 600;
      margin: 6px 0 4px;
    }

    #print-dossier.theme-obsidian .day-summary-note {
      color: #94A3B8;
      font-size: 11.5px;
      margin-bottom: 8px;
      line-height: 1.45;
    }

    /* Theme: Minimalist Ivory */
    #print-dossier.theme-ivory {
      background: #FFFFFF !important;
      color: #0F172A !important;
    }

    #print-dossier.theme-ivory .dossier-header-block {
      border-bottom: 2px solid #92400E;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    #print-dossier.theme-ivory .dossier-main-title {
      color: #92400E;
      font-family: var(--font-mystic);
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    #print-dossier.theme-ivory .dossier-sub-title {
      font-size: 11.5px;
      color: #475569;
    }

    #print-dossier.theme-ivory .dossier-scope-badge {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #B45309;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      font-family: var(--font-en);
    }

    #print-dossier.theme-ivory .dossier-meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px 14px;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 10px;
      padding: 10px 14px;
      margin-top: 12px;
      font-size: 11.5px;
    }

    #print-dossier.theme-ivory .meta-label {
      color: #92400E;
      font-weight: 600;
    }

    #print-dossier.theme-ivory .meta-val {
      color: #0F172A;
    }

    #print-dossier.theme-ivory .dossier-summary-box {
      background: #FFFBEB !important;
      border: 1px solid #FCD34D !important;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 14px;
      font-size: 12px;
      line-height: 1.5;
      color: #78350F;
    }

    #print-dossier.theme-ivory .dossier-section-heading {
      color: #92400E;
      font-family: var(--font-mystic);
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 6px;
    }

    #print-dossier.theme-ivory .dossier-day-card {
      background: #F8FAFC !important;
      border: 1px solid #CBD5E1 !important;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    }

    #print-dossier.theme-ivory .d-pillar {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 8px 10px;
    }

    #print-dossier.theme-ivory .dp-title {
      color: #92400E;
      font-weight: 600;
      font-size: 11.5px;
      margin-bottom: 4px;
    }

    #print-dossier.theme-ivory .dp-body {
      color: #334155;
      font-size: 11px;
      line-height: 1.45;
    }

    #print-dossier.theme-ivory .day-headline-quote {
      color: #0F172A;
      font-size: 13px;
      font-weight: 600;
      margin: 6px 0 4px;
    }

    #print-dossier.theme-ivory .day-summary-note {
      color: #475569;
      font-size: 11.5px;
      margin-bottom: 8px;
      line-height: 1.45;
    }

    /* Common Dossier Element Styles */
    .dossier-brand-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .dossier-sigil {
      font-size: 26px;
      line-height: 1;
      color: #E5B869;
    }

    .dossier-guidelines-row {
      display: flex;
      gap: 12px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    .dossier-guide-pill {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.15);
      border: 1px dashed rgba(229, 184, 105, 0.4);
    }

    .theme-ivory .dossier-guide-pill {
      background: #FEF3C7;
      border-color: #B45309;
      color: #92400E;
    }

    .day-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 6px;
      margin-bottom: 6px;
    }

    .theme-ivory .day-card-head {
      border-bottom: 1px solid #E2E8F0;
    }

    .day-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .day-num {
      font-family: var(--font-en);
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .day-bazi-tag {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      color: #94A3B8;
    }

    .theme-ivory .day-bazi-tag {
      background: #E2E8F0;
      color: #475569;
    }

    .day-score-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .day-status-pill {
      font-size: 10.5px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .day-status-pill.flowing {
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .day-status-pill.challenging {
      background: rgba(244, 63, 94, 0.15);
      color: #F43F5E;
      border: 1px solid rgba(244, 63, 94, 0.3);
    }

    .day-status-pill.neutral {
      background: rgba(229, 184, 105, 0.15);
      color: #E5B869;
      border: 1px solid rgba(229, 184, 105, 0.3);
    }

    .theme-ivory .day-status-pill.flowing {
      background: #DCFCE7;
      color: #15803D;
      border: 1px solid #86EFAC;
    }

    .theme-ivory .day-status-pill.challenging {
      background: #FFE4E6;
      color: #BE123C;
      border: 1px solid #FDA4AF;
    }

    .theme-ivory .day-status-pill.neutral {
      background: #FEF3C7;
      color: #B45309;
      border: 1px solid #FCD34D;
    }

    .day-score-num {
      font-family: var(--font-en);
      font-size: 15px;
      font-weight: 800;
    }

    .day-score-num span {
      font-size: 10px;
      font-weight: 400;
      opacity: 0.6;
    }

    .day-four-pillars-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin: 8px 0;
    }

    .day-tactical-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed rgba(255, 255, 255, 0.08);
      font-size: 10.5px;
      color: #94A3B8;
      flex-wrap: wrap;
      gap: 8px;
    }

    .theme-ivory .day-tactical-footer {
      border-top: 1px dashed #CBD5E1;
      color: #64748B;
    }

    .c-sri { color: #10B981; }
    .c-dech { color: #8B5CF6; }
    .c-montri { color: #3B82F6; }
    .c-kala { color: #EF4444; }

    .theme-ivory .c-sri { color: #047857; }
    .theme-ivory .c-dech { color: #6D28D9; }
    .theme-ivory .c-montri { color: #1D4ED8; }
    .theme-ivory .c-kala { color: #B91C1C; }

    /* 30-Day Ledger Grid */
    .dossier-ledger-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 14px;
    }

    .compact-ledger-card {
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 11px;
    }

    #print-dossier.theme-obsidian .compact-ledger-card {
      background: #0B0F1A;
      border: 1px solid rgba(229, 184, 105, 0.2);
    }

    #print-dossier.theme-ivory .compact-ledger-card {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
    }

    .compact-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .compact-headline {
      font-weight: 600;
      margin-bottom: 3px;
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .compact-desc {
      font-size: 10px;
      opacity: 0.85;
      line-height: 1.35;
      margin-bottom: 4px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .compact-footer {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      opacity: 0.8;
      border-top: 1px dotted rgba(255, 255, 255, 0.1);
      padding-top: 4px;
    }

    .theme-ivory .compact-footer {
      border-top: 1px dotted #CBD5E1;
    }

    /* Footer Seal */
    .dossier-footer-seal {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(229, 184, 105, 0.3);
      text-align: center;
    }

    .theme-ivory .dossier-footer-seal {
      border-top: 1px solid #CBD5E1;
    }

    .seal-symbol {
      font-size: 14px;
      color: #E5B869;
      letter-spacing: 4px;
      margin-bottom: 4px;
    }

    .theme-ivory .seal-symbol {
      color: #92400E;
    }

    .seal-statement {
      font-size: 10px;
      line-height: 1.5;
      opacity: 0.8;
      max-width: 600px;
      margin: 0 auto 4px;
    }

    .seal-timestamp {
      font-family: var(--font-en);
      font-size: 9.5px;
      opacity: 0.6;
    }

    /* Quick Action Image Button on Daily Card */
    .card-quick-img-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(229, 184, 105, 0.12);
      border: 1px solid var(--gold-primary);
      color: var(--gold-primary);
      padding: 4px 12px;
      border-radius: 999px;
      font-family: var(--font-th);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .card-quick-img-btn:hover {
      background: rgba(229, 184, 105, 0.25);
      box-shadow: 0 0 12px rgba(229, 184, 105, 0.3);
      transform: translateY(-1px);
    }

    /* ============================================================ */
    /* IMAGE EXPORT STYLES (High-DPI Social Card Layout)             */
    /* ============================================================ */
    .image-capture-card {
      width: 680px;
      border-radius: 18px;
      padding: 30px 28px;
      box-sizing: border-box;
      font-family: var(--font-th);
      position: relative;
      overflow: hidden;
    }

    /* Theme: Celestial Obsidian (Image) */
    .image-capture-card.theme-obsidian {
      background: #06080F;
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 60%),
        radial-gradient(circle at 100% 50%, rgba(229, 184, 105, 0.1) 0%, transparent 40%),
        radial-gradient(circle at 0% 100%, rgba(16, 185, 129, 0.08) 0%, transparent 50%);
      border: 2px solid #E5B869;
      color: #F8FAFC;
      box-shadow: 0 0 50px rgba(0, 0, 0, 0.9);
    }

    .image-capture-card.theme-obsidian .icc-brand-title {
      color: #E5B869;
      font-family: var(--font-mystic);
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .image-capture-card.theme-obsidian .icc-score-circle {
      border: 3px solid #E5B869;
      background: radial-gradient(circle, rgba(229, 184, 105, 0.2) 0%, #0B101D 70%);
      color: #E5B869;
    }

    .image-capture-card.theme-obsidian .icc-pillar-card {
      background: #0B101D;
      border: 1px solid rgba(229, 184, 105, 0.25);
    }

    .image-capture-card.theme-obsidian .icc-pillar-title {
      color: #E5B869;
    }

    .image-capture-card.theme-obsidian .icc-tactical-box {
      background: rgba(229, 184, 105, 0.08);
      border: 1px solid rgba(229, 184, 105, 0.3);
    }

    /* Theme: Minimalist Ivory (Image) */
    .image-capture-card.theme-ivory {
      background: #FFFFFF;
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.06) 0%, transparent 60%),
        radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.04) 0%, transparent 50%);
      border: 2px solid #92400E;
      color: #0F172A;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    }

    .image-capture-card.theme-ivory .icc-brand-title {
      color: #92400E;
      font-family: var(--font-mystic);
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .image-capture-card.theme-ivory .icc-score-circle {
      border: 3px solid #B45309;
      background: #FFFBEB;
      color: #92400E;
    }

    .image-capture-card.theme-ivory .icc-pillar-card {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
    }

    .image-capture-card.theme-ivory .icc-pillar-title {
      color: #92400E;
    }

    .image-capture-card.theme-ivory .icc-tactical-box {
      background: #FFFBEB;
      border: 1px solid #FCD34D;
      color: #78350F;
    }

    /* Card Elements */
    .icc-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(229, 184, 105, 0.3);
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    .theme-ivory .icc-header-row {
      border-bottom-color: #CBD5E1;
    }

    .icc-brand-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icc-sigil {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 1px solid #E5B869;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: #E5B869;
      background: rgba(229, 184, 105, 0.15);
    }

    .theme-ivory .icc-sigil {
      border-color: #B45309;
      color: #92400E;
      background: #FEF3C7;
    }

    .icc-sub-brand {
      font-size: 10.5px;
      opacity: 0.75;
    }

    .icc-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 999px;
      font-family: var(--font-en);
    }

    .icc-hero-section {
      display: flex;
      gap: 18px;
      align-items: center;
      margin-bottom: 16px;
    }

    .icc-score-circle {
      width: 84px;
      height: 84px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .icc-score-val {
      font-size: 30px;
      font-weight: 800;
      font-family: var(--font-en);
      line-height: 1;
    }

    .icc-score-lbl {
      font-size: 8.5px;
      letter-spacing: 1px;
      opacity: 0.7;
      margin-top: 2px;
    }

    .icc-hero-info {
      flex: 1;
    }

    .icc-hero-date {
      font-size: 12.5px;
      font-weight: 700;
      color: #E5B869;
      font-family: var(--font-en);
      margin-bottom: 2px;
    }

    .theme-ivory .icc-hero-date {
      color: #92400E;
    }

    .icc-hero-headline {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.35;
      margin-bottom: 4px;
    }

    .icc-hero-summary {
      font-size: 11.5px;
      opacity: 0.85;
      line-height: 1.45;
    }

    .icc-pillars-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }

    .icc-pillar-card {
      border-radius: 10px;
      padding: 10px 12px;
    }

    .icc-pillar-title {
      font-size: 11.5px;
      font-weight: 700;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .icc-pillar-desc {
      font-size: 10.5px;
      line-height: 1.45;
      opacity: 0.9;
    }

    .icc-tactical-box {
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 14px;
      font-size: 11px;
      line-height: 1.5;
    }

    .icc-footer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(229, 184, 105, 0.3);
      padding-top: 10px;
      font-size: 9.5px;
      opacity: 0.75;
    }

    .theme-ivory .icc-footer-row {
      border-top-color: #CBD5E1;
    }
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
      <div class="header-actions">
        <button class="export-btn" onclick="openExportModal()" title="ส่งออกดวงชะตาเป็น PDF หรือ รูปภาพความละเอียดสูง">
          <span>📜</span> ส่งออกรายงาน (PDF / รูปภาพ)
        </button>
        <div class="astronomy-badge">
          <div class="pulse"></div>
          <span>LIVE EPHEMERIS ACTIVE</span>
        </div>
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
      <div class="system-charter">
        <h3><span>📜</span> ปรัชญาและขอบเขต: "ศูนย์บัญชาการชะตา & การสังเคราะห์องค์รวม"</h3>
        <p>
          หน้านี้ทำหน้าที่เป็น <strong>Executive Summary (บทสรุปผู้บริหาร)</strong> รวบรวมสัญญาณจากทั้ง 4 ศาสตร์มาผ่านตัวกรอง 
          <strong>Confluence Filter</strong> เพื่อตัดสัญญาณรบกวน (Noise) ออก และคงไว้เฉพาะ <strong>High-Signal Events</strong> 
          ที่ส่งผลต่อชีวิตจริง ทั้งเรื่องงาน การเงิน สุขภาพ และอารมณ์ ช่วยให้คุณครูวางแผนชีวิตได้อย่างมีกลยุทธ์ล่วงหน้า 30 วัน
        </p>
      </div>

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
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="card-quick-img-btn" id="btn-quick-img" onclick="exportDailyImage()" title="บันทึกการ์ดดวงวันนี้เป็นรูปภาพความละเอียดสูง (PNG)">
              <span>📸</span> บันทึกรูปการ์ด
            </button>
            <div id="day-quality-badge" class="aspect-tag neutral">ปกติ</div>
          </div>
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
      <div class="system-charter">
        <h3><span>🌌</span> ปรัชญาและขอบเขต: "สภาวะแวดล้อมภายนอก & จิตวิทยาความรู้สึก"</h3>
        <p>
          โหราศาสตร์ตะวันตก (Western Astrological Ephemeris) คำนวณการเคลื่อนที่จริงของเทหวัตถุบนท้องฟ้า 
          ตอบคำถามว่า <strong>"โลกภายนอกกำลังกระตุ้นเราอย่างไร?"</strong> ดวงดาวทำหน้าที่เป็นเลนส์รวมแสง 
          มุมตรีโกณ (△) คือกระแสน้ำหนุนส่ง มุมฉาก (□) คือบททดสอบความอดทน และมุมเล็ง (☍) คือการปะทะกับคนรอบข้าง
        </p>
      </div>

      <!-- Real Interpretation Cards for Active Transits -->
      <div class="card-header">
        <div class="card-title"><span>🔍</span> ถอดรหัสมุมดาวใหญ่ที่กำลังส่งผลต่อชีวิตคุณครู (Active Transit Decoded)</div>
      </div>
      <div class="interpretation-grid">
        <div class="interpretation-card">
          <h5><span>🪐</span> ดาวเสาร์ทับจุดจอมฟ้า (Saturn ☌ MC ในราศีเมษ)</h5>
          <p>
            <strong>ความหมาย:</strong> เกิดขึ้นครั้งเดียวในรอบ 29.5 ปี! เป็นช่วงเวลาที่ระบบและภาระหน้าที่ตามตำแหน่งราชการเข้ามากดทับ 
            คุณครูจะรู้สึกว่าต้องปฏิบัติตามกฎเกณฑ์อย่างเคร่งครัด เหนื่อยล้า แต่เป็นการสร้าง <em>"ความมั่นคงถาวรในวิชาชีพ"</em>
          </p>
        </div>
        <div class="interpretation-card">
          <h5><span>🌟</span> พฤหัสบดีตรีโกณดาวศุกร์ (Jupiter △ Venus ในราศีสิงห์-เมษ)</h5>
          <p>
            <strong>ความหมาย:</strong> ดาวพฤหัสเดินในภพการเงิน ส่งแสงตรีโกณธาตุไฟถึงดาวศุกร์ (ความงาม/ศิลปะ) 
            หมายถึง <em>"โอกาสขยายรายได้ผ่านทักษะความสามารถเฉพาะตัวและอาชีพเสริม"</em> เป็นช่วงเวลาทองในการสร้างสรรค์ผลงาน
          </p>
        </div>
        <div class="interpretation-card">
          <h5><span>⚡</span> พลูโตทับมฤตยูเดิม (Pluto ☌ Uranus ในราศีกุมภ์)</h5>
          <p>
            <strong>ความหมาย:</strong> สภาวะจิตใต้สำนึกที่ต้องการ <em>"อิสรภาพและการก้าวออกจากกรอบเดิมๆ"</em> 
            ปลุกพลังให้คุณครูอยากมีธุรกิจหรืออาณาจักรเล็กๆ ของตัวเองในระยะยาว
          </p>
        </div>
        <div class="interpretation-card">
          <h5><span>🍀</span> อาทิตย์ทับจุดโชคลาภ (Sun ☌ Part of Fortune)</h5>
          <p>
            <strong>ความหมาย:</strong> แสงสว่างส่องถึงจุดสมดุลแห่งผลประโยชน์ มีเกณฑ์พบช่องทางเก็บเงิน หรือได้รับข่าวดีเล็กๆ น้อยๆ 
            ที่ทำให้สบายใจขึ้นจากเรื่องวุ่นวายก่อนหน้า
          </p>
        </div>
      </div>

      <section class="card">
        <div class="card-header">
          <div class="card-title"><span>🌌</span> ตำแหน่งพิกัดดวงดาวจริง ณ ปัจจุบัน (Astronomical Coordinates)</div>
        </div>
        <div class="matrix-grid" id="western-planets-grid"></div>

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
              <th>ความหมายเชิงพลังงาน</th>
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
      <div class="system-charter">
        <h3><span>🇨🇳</span> ปรัชญาและขอบเขต: "พิมพ์เขียวเบญจธาตุ & วาสนาดั้งเดิมของตัวตน"</h3>
        <p>
          โหราศาสตร์จีน Bazi (八字) วิเคราะห์ความสมดุลของ <strong>ธาตุทั้งห้า (ไม้-ไฟ-ดิน-ทอง-น้ำ)</strong> ณ วินาทีที่คุณครูลืมตาดูโลก 
          ตอบคำถามว่า <strong>"แก่นแท้ของร่างกายและจิตวิญญาณเราต้องการพลังงานอะไรมาหล่อเลี้ยง?"</strong> 
          ช่วยให้รู้จุดแข็ง จุดอ่อน และการเลือกช่วงจังหวะชีวิตที่ธาตุประจำตัวมีพลังสูงสุด
        </p>
      </div>

      <section class="card">
        <div class="card-header">
          <div class="card-title"><span>🇨🇳</span> แผนผังดวงจีน 4 เสาหลักกำเนิด (Natal Four Pillars)</div>
        </div>
        <div class="matrix-grid">
          <div class="matrix-cell">
            <div class="matrix-title">เสายามเกิด (Hour Pillar)</div>
            <div class="matrix-val" style="color: var(--gold-primary);">Xin Wei (辛未)</div>
            <div class="matrix-sub">ทองหยิน / แพะดิน • ขุมทรัพย์ใต้ดิน ความสุขในบั้นปลาย และลูกศิษย์</div>
          </div>
          <div class="matrix-cell" style="border-color: var(--gold-primary); box-shadow: 0 0 14px rgba(229,184,105,0.2);">
            <div class="matrix-title" style="color: var(--accent-emerald);">เสาวันเกิด (Day Master) ★ จิตวิญญาณตัวตน</div>
            <div class="matrix-val" style="color: var(--accent-emerald);">Jia Chen (甲辰)</div>
            <div class="matrix-sub">ไม้ใหญ่เจี่ย นั่งบนมังกรน้ำ • เสาหลักผู้สร้าง มั่นคงและมีเมตตา</div>
          </div>
          <div class="matrix-cell">
            <div class="matrix-title">เสาเดือนเกิด (Month Pillar)</div>
            <div class="matrix-val" style="color: var(--gold-primary);">Geng Yin (庚ขาล)</div>
            <div class="matrix-sub">ทองหยาง / เสือไม้ • ระเบียบวินัย หน้าที่การงาน และเกียรติยศ</div>
          </div>
          <div class="matrix-cell">
            <div class="matrix-title">เสาปีเกิด (Year Pillar)</div>
            <div class="matrix-val" style="color: var(--gold-primary);">Bing Zi (丙子)</div>
            <div class="matrix-sub">ไฟหยาง / ชวดน้ำ • รากฐานตระกูล แสงสว่าง และปัญญาญาณ</div>
          </div>
        </div>

        <div class="tactical-box" style="margin-top: 16px;">
          <h4><span>🪵</span> ถอดรหัสดิถีตัวตน: "ต้นไม้ใหญ่ตระหง่านกลางป่า (Jia Wood 甲木)"</h4>
          <p>
            คุณครูเปรียบเสมือน <strong>ต้นสน/ต้นโอ๊กใหญ่</strong> ที่มีรากหยั่งลึกลงในมังกรดิน (Chen) ที่ชุ่มน้ำ 
            คุณครูเกิดมาเพื่อเป็น <strong>"ร่มเงาและที่พึ่งพาให้คนอื่น"</strong> มีความอดทน ซื่อตรง และรักความยุติธรรม<br><br>
            • <strong>ธาตุถ่ายเทปัญญา (ธาตุไฟ):</strong> คือความคิดสร้างสรรค์ ศิลปะ สื่อดิจิทัล ช่วยให้กิ่งก้านผลิใบงดงาม<br>
            • <strong>ธาตุโชคลาภ (ธาตุดิน):</strong> คือความมั่งคั่ง ทรัพย์สินคงทน การจัดการพื้นที่ และผลตอบแทนที่จับต้องได้<br>
            • <strong>ธาตุควบคุม (ธาตุทอง):</strong> คือระเบียบราชการ วินัย และกฎเกณฑ์ที่คอยตัดแต่งกิ่งไม้ให้เติบโตเป็นไม้แปรรูปที่มีค่า
          </p>
        </div>

        <div class="card-header" style="margin-top: 20px;">
          <div class="card-title"><span>📅</span> การอ่านค่าพลังงานเสาจรประจำวัน (Daily Interaction)</div>
        </div>
        <div class="matrix-grid">
          <div class="matrix-cell">
            <div class="matrix-title">กิ่งฟ้า (Heavenly Stem)</div>
            <div class="matrix-val" id="bazi-stem-display">-</div>
            <div class="matrix-sub">พลังงานความคิดและอารมณ์ที่เข้ามากระทบ</div>
          </div>
          <div class="matrix-cell">
            <div class="matrix-title">ก้านดิน (Earthly Branch)</div>
            <div class="matrix-val" id="bazi-branch-display">-</div>
            <div class="matrix-sub">สภาพแวดล้อม ร่างกาย และเหตุการณ์รอบตัว</div>
          </div>
          <div class="matrix-cell">
            <div class="matrix-title">ปฏิกิริยากับดวงเดิม</div>
            <div class="matrix-val" id="bazi-relation-display" style="font-size: 14px; color: var(--gold-primary);">-</div>
            <div class="matrix-sub">การตรวจจับ ชง (ชน) - เฮ้ง (ขัดแย้ง) - ฮะ (ผูกมิตร)</div>
          </div>
        </div>
      </section>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 4: 🇹🇭 THAI TAKSA & FENG SHUI                             -->
    <!-- ============================================================ -->
    <div id="tab-taksa" class="tab-pane">
      <div class="system-charter">
        <h3><span>🇹🇭</span> ปรัชญาและขอบเขต: "การปรับจูนพลังงานสิ่งแวดล้อม & เคล็ดมงคลภาคปฏิบัติ"</h3>
        <p>
          โหราศาสตร์ไทยภูมิทักษา และฮวงจุ้ยแปดทิศ (Eight Mansions) เป็นศาสตร์แห่ง <strong>การปรับแก้สภาวะแวดล้อม (Environmental Harmony)</strong> 
          ตอบคำถามว่า <strong>"วันนี้ควรปฏิบัติตัวอย่างไร? สวมใส่สีอะไร? และจัดวางพื้นที่ตรงไหนถึงจะดูดทรัพย์และปลอดภัย?"</strong> 
          เพื่อช่วยหนุนดวงชะตาและปัดเป่าพลังงานลบในชีวิตประจำวัน
        </p>
      </div>

      <section class="card">
        <div class="card-header">
          <div class="card-title"><span>🇹🇭</span> ตารางสีมงคลตามภูมิทักษา (คนเกิดวันอังคาร)</div>
        </div>
        
        <div class="matrix-grid">
          <div class="matrix-cell">
            <div class="matrix-title" style="color: var(--gold-primary);">🌟 ศรี (โชคลาภ/เงินทอง)</div>
            <div class="matrix-val" id="taksa-sri" style="color: var(--gold-primary);">-</div>
            <div class="matrix-sub">ดึงดูดทรัพย์สิน เสน่ห์เมตตา และการเงินคล่องตัว</div>
          </div>
          <div class="matrix-cell">
            <div class="matrix-title" style="color: var(--accent-indigo);">🛡️ เดช (อำนาจ/บารมี)</div>
            <div class="matrix-val" id="taksa-dech" style="color: var(--accent-indigo);">-</div>
            <div class="matrix-sub">สร้างเกราะป้องกัน คนเกรงใจ ไม่กล้าเอาเปรียบ</div>
          </div>
          <div class="matrix-cell">
            <div class="matrix-title" style="color: var(--accent-emerald);">👑 มนตรี (ผู้ใหญ่อุปถัมภ์)</div>
            <div class="matrix-val" id="taksa-montri" style="color: var(--accent-emerald);">-</div>
            <div class="matrix-sub">ผู้ใหญ่เมตตา เสนองานผ่านง่าย ได้รับความช่วยเหลือ</div>
          </div>
          <div class="matrix-cell" style="border-color: rgba(244, 63, 94, 0.3);">
            <div class="matrix-title" style="color: var(--accent-rose);">❌ กาลกิณี (อุปสรรคต้องห้าม)</div>
            <div class="matrix-val" id="taksa-kalakini" style="color: var(--accent-rose);">-</div>
            <div class="matrix-sub">งดใช้ในเครื่องประดับและเสื้อผ้าเด็ดขาด</div>
          </div>
        </div>

        <div class="interpretation-grid">
          <div class="interpretation-card">
            <h5><span>⚠️</span> ทำไมคนวันอังคารถึงห้ามสีขาว/ครีมเด็ดขาด?</h5>
            <p>
              ในตำราทักษาไทย <strong>ดาวจันทร์ (สีขาว/ครีม/เงินยวง)</strong> คือตำแหน่ง <em>"กาลกิณี"</em> ของคนเกิดวันอังคาร 
              หากสวมใส่หรือใช้ของสีขาว จะไปกระตุ้นความใจอ่อน ลังเล ตัดสินใจผิดพลาด และเปิดช่องให้คนอื่นเข้ามาเอาเปรียบเรื่องเงินได้ง่าย
            </p>
          </div>
          <div class="interpretation-card">
            <h5><span>💍</span> ทำไมต้องสวมแหวนที่ "นิ้วกลางมือซ้าย"?</h5>
            <p>
              นิ้วกลางคือตัวแทนของ <strong>ดาวเสาร์ (ความมั่นคงและกำแพงปกป้อง)</strong> 
              การสวมแหวนเกลี้ยง (ทองหรือนิลดำ) ที่นิ้วกลางซ้าย จะช่วย <em>"อุดรอยรั่วทางการเงิน"</em> ล็อกกระเป๋าเงินไม่ให้รั่วไหล 
              และช่วยสยบคนที่คิดจะเข้ามาเบียดเบียนหรือยืมเงินให้เกรงใจคุณครู (ห้ามใส่นิ้วนางเพราะจะดึงดูดภาระครอบครัว)
            </p>
          </div>
        </div>

        <div class="tactical-box" style="margin-top: 16px;">
          <h4><span>🧭</span> การจัดเคหะสถานและทิศมงคลประจำตัว (รหัสกัวะ 4 - Kua 4 ธาตุไม้)</h4>
          <p>
            • <strong>ทิศหัวนอน: ทิศใต้ (เทียนอี้ / หมอเทวดา):</strong> ราชาแห่งการพักผ่อน ช่วยเรื่องการนอนหลับลึก (Deep Sleep) ฟื้นฟูระบบประสาทส่วนกลาง (CNS) คลายความเครียดสะสม<br>
            • <strong>ทิศโต๊ะทำงาน: หันหน้าทิศเหนือ 338° (เซิงชี่ / ความรุ่งเรือง):</strong> เสริมพลังสมาธิ สติปัญญา บารมีความเป็นผู้นำในการสอนและการบริหาร<br>
            • <strong>สีกรอบแว่นตา: สีดำด้าน (Matte Black) หรือ โลหะเทารมดำ:</strong> เสริมพลังเดชและมูละ ดูสุขุม นิ่ง มีบารมีในฐานะครู
          </p>
        </div>
      </section>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 5: ⚡ URANIAN 90° DIAL                                    -->
    <!-- ============================================================ -->
    <div id="tab-uranian" class="tab-pane">
      <div class="system-charter">
        <h3><span>⚡</span> ปรัชญาและขอบเขต: "สมการคณิตศาสตร์ดวงดาว & จุดสับไกเหตุการณ์เฉียบพลัน"</h3>
        <p>
          โหราศาสตร์ยูเรเนียน (Hamburg School) ถูกพัฒนาขึ้นโดยใช้คณิตศาสตร์ดาราศาสตร์บริสุทธิ์ 
          โดยนำมุมสัมพันธ์ทั้งหมดมาบีบลงบน <strong>หน้าปัดจานหมุน 90 องศา (90° Dial)</strong> 
          เพื่อจับคู่ <strong>จุดกึ่งกลาง (Midpoints = A+B/2)</strong> ตอบคำถามว่า <strong>"มีจุดกระตุ้นเหตุการณ์เฉียบพลันอะไรที่กำลังทำงานในระดับสัปดาห์?"</strong> 
          มีความแม่นยำและเที่ยงตรงสูงมาก ปราศจากการคาดเดาเชิงอารมณ์
        </p>
      </div>

      <div class="interpretation-grid">
        <div class="interpretation-card">
          <h5><span>🌞</span> พระเคราะห์สนธิ Sun / Moon</h5>
          <p>
            <strong>ความหมาย:</strong> จุดเชื่อมต่อระหว่าง <em>"ตัวตนภายนอก (อาทิตย์)"</em> และ <em>"จิตใจภายใน (จันทร์)"</em> 
            บ่งบอกถึงความสุขในชีวิตส่วนตัว สมดุลระหว่างงานและครอบครัว เมื่อมีดาวดีมาสับไก จะรู้สึกสบายใจและปลอดโปร่ง
          </p>
        </div>
        <div class="interpretation-card">
          <h5><span>💎</span> พระเคราะห์สนธิ Jupiter / Venus</h5>
          <p>
            <strong>ความหมาย:</strong> สมการแห่ง <em>"ความสุข สุนทรียภาพ ศิลปะ และโชคลาภทางการเงิน"</em> 
            เป็นจุดที่มีค่าที่สุดสำหรับงานสร้างสรรค์ หากมีดาวมาทำมุมส่งเสริม จะหมายถึงความสำเร็จของผลงานและความราบรื่นเรื่องเงิน
          </p>
        </div>
        <div class="interpretation-card">
          <h5><span>⚔️</span> พระเคราะห์สนธิ Mars / Saturn</h5>
          <p>
            <strong>ความหมาย:</strong> สมการแห่ง <em>"การทำงานหนัก ความทรหดอดทน และภาระหน้าที่"</em> 
            บ่งบอกถึงช่วงเวลาที่ต้องฟันฝ่าอุปสรรค ต้องใช้ความนิ่งและพลังใจในการเอาชนะความเหนื่อยยาก
          </p>
        </div>
        <div class="interpretation-card">
          <h5><span>👑</span> พระเคราะห์สนธิ MC / ASC</h5>
          <p>
            <strong>ความหมาย:</strong> สมการแห่ง <em>"ภาพลักษณ์ สถานะ และการได้รับการยอมรับในสังคม"</em> 
            ชี้ชัดว่าคนรอบข้างหรือผู้ใหญ่ในองค์กรมองตัวคุณครูอย่างไรในช่วงเวลานั้นๆ
          </p>
        </div>
      </div>

      <section class="card">
        <div class="card-header">
          <div class="card-title"><span>💥</span> จุดสับไกยูเรเนียนที่กำลังทำงาน ณ ปัจจุบัน (Active Midpoint Triggers)</div>
        </div>
        <div id="uranian-triggers-container"></div>
      </section>
    </div>

  </div>

  <!-- Export Modal (PDF & Image) -->
  <div id="export-modal" class="modal-overlay">
    <div class="modal-box">
      <div class="modal-header">
        <div class="sigil-icon" style="margin: 0 auto 10px; width: 40px; height: 40px; font-size: 18px;">✧</div>
        <h3>IMPERIAL ASTROLOGICAL DOSSIER</h3>
        <p>ส่งออกแฟ้มรายงานดวงชะตาเป็น PDF หรือ รูปภาพความละเอียดสูง (2x Retina)</p>
      </div>

      <!-- Format Selector -->
      <div class="modal-section">
        <div class="modal-section-title"><span>📂</span> เลือกรูปแบบไฟล์ (Export Format)</div>
        <div class="option-cards">
          <div class="option-card selected" id="opt-fmt-pdf" onclick="selectExportFormat('pdf')">
            <h4><span>📄</span> เอกสาร PDF</h4>
            <p>พิมพ์/บันทึกเป็นเอกสาร A4 คมชัดแบบ Vector สำหรับอ่านละเอียดหรือพรินต์</p>
          </div>
          <div class="option-card" id="opt-fmt-image" onclick="selectExportFormat('image')">
            <h4><span>🖼️</span> รูปภาพการ์ด PNG</h4>
            <p>ส่งออกเป็นการ์ดภาพความละเอียดสูง 2x Retina เหมาะสำหรับแชร์ลง LINE / IG / โซเชียล</p>
          </div>
        </div>
      </div>

      <!-- Scope Selector -->
      <div class="modal-section">
        <div class="modal-section-title"><span>⏳</span> เลือกระยะเวลาการพยากรณ์</div>
        <div class="option-cards">
          <div class="option-card selected" id="opt-scope-7" onclick="selectExportScope(7)">
            <h4 id="lbl-scope-7"><span>⚡</span> ยุทธศาสตร์ 7 วัน</h4>
            <p id="desc-scope-7">เน้นยุทธศาสตร์เชิงรุกรายวัน เจาะลึก 4 เสาหลัก ฤกษ์เวลาทอง และข้อควรระวัง</p>
          </div>
          <div class="option-card" id="opt-scope-30" onclick="selectExportScope(30)">
            <h4 id="lbl-scope-30"><span>🌙</span> มหาภาครายเดือน 30 วัน</h4>
            <p id="desc-scope-30">วิเคราะห์ภาพรวมแนวโน้ม 30 วัน สถิติพลังงาน และปฏิทินพลังงานครบวงจร</p>
          </div>
        </div>
      </div>

      <!-- Theme Selector -->
      <div class="modal-section">
        <div class="modal-section-title"><span>🎨</span> เลือกธีมของเอกสาร / รูปภาพ</div>
        <div class="option-cards">
          <div class="option-card selected" id="opt-theme-obsidian" onclick="selectExportTheme('obsidian')">
            <h4><span>🌌</span> Celestial Obsidian</h4>
            <p>พื้นหลังดำสนิท ขอบทองคำ ตัวหนังสือเงิน/ทอง ลึกลับ หรูหรา สไตล์พรีเมียม</p>
          </div>
          <div class="option-card" id="opt-theme-ivory" onclick="selectExportTheme('ivory')">
            <h4><span>📜</span> Minimalist Ivory</h4>
            <p>พื้นขาวงาช้าง ลายเส้นทองและเทา คมชัด สะอาดตา ประหยัดหมึกพิมพ์</p>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="modal-btn-confirm" id="modal-submit-btn" onclick="executeExport()">
          <span>✨</span> สร้างและสั่งพิมพ์ / บันทึก PDF
        </button>
        <button class="modal-btn-cancel" onclick="closeExportModal()">ยกเลิก</button>
      </div>
    </div>
  </div>

  <!-- Hidden Container for High-Fidelity Vector Print & PDF Export -->
  <div id="print-dossier" class="theme-obsidian"></div>

  <!-- Hidden Staging Wrapper for High-DPI Image Capture (positioned behind everything at 0, 0) -->
  <div id="image-export-stage" style="position: fixed; left: 0; top: 0; width: 680px; z-index: -99999; pointer-events: none; opacity: 1;"></div>

  <!-- Image Preview Modal -->
  <div id="image-preview-modal" class="modal-overlay">
    <div class="modal-box" style="max-width: 640px; text-align: center; padding: 22px;">
      <div class="modal-header" style="border: none; padding-bottom: 4px; margin-bottom: 10px;">
        <h3 style="font-size: 17px; color: var(--gold-primary);">✦ แฟ้มภาพการ์ดดวงชะตา (Destiny Card) ✦</h3>
        <p style="font-size: 12px; color: var(--text-silver);">ระบบได้เริ่มดาวน์โหลดไฟล์ภาพอัตโนมัติแล้ว</p>
      </div>
      <div id="image-preview-content" style="max-height: 60vh; overflow-y: auto; border-radius: 12px; margin-bottom: 12px; border: 1px solid var(--border-celestial); box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
      </div>
      <p style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 14px;">
        💡 สำหรับมือถือ / iPhone: หากไฟล์ไม่ดาวน์โหลด สามารถแตะค้างที่รูปภาพด้านบน แล้วเลือก <strong>"บันทึกรูปภาพ" (Save Image)</strong> ได้ทันทีครับ
      </p>
      <div style="display: flex; gap: 10px;">
        <button class="modal-btn-confirm" id="btn-re-download" style="flex: 2; padding: 10px;">
          <span>📥</span> ดาวน์โหลดอีกครั้ง
        </button>
        <button class="modal-btn-cancel" onclick="closeImagePreviewModal()" style="flex: 1; padding: 10px;">
          ✕ ปิด
        </button>
      </div>
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
          <td style="font-size: 12px; color: var(--text-silver);">\${a.desc || '-'}</td>
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
            <div style="font-size: 12.5px; color: var(--text-silver); margin: 4px 0;">\${m.desc || ''}</div>
            <div style="font-size: 12px; color: var(--text-muted);">
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

    // ============================================================
    // PDF Export & Dossier Generation Logic
    // ============================================================
    let exportScope = 7;
    let exportTheme = 'obsidian';
    let exportFormat = 'pdf'; // 'pdf' or 'image'

    function openExportModal() {
      document.getElementById('export-modal').classList.add('active');
    }

    function closeExportModal() {
      document.getElementById('export-modal').classList.remove('active');
    }

    function selectExportFormat(fmt) {
      exportFormat = fmt;
      document.getElementById('opt-fmt-pdf').classList.toggle('selected', fmt === 'pdf');
      document.getElementById('opt-fmt-image').classList.toggle('selected', fmt === 'image');
      
      const submitBtn = document.getElementById('modal-submit-btn');
      const lblScope7 = document.getElementById('lbl-scope-7');
      const descScope7 = document.getElementById('desc-scope-7');
      const lblScope30 = document.getElementById('lbl-scope-30');
      const descScope30 = document.getElementById('desc-scope-30');

      if (fmt === 'pdf') {
        submitBtn.innerHTML = '<span>✨</span> สร้างและสั่งพิมพ์ / บันทึก PDF';
        lblScope7.innerHTML = '<span>⚡</span> ยุทธศาสตร์ 7 วัน';
        descScope7.textContent = 'เน้นยุทธศาสตร์เชิงรุกรายวัน เจาะลึก 4 เสาหลัก ฤกษ์เวลาทอง และข้อควรระวัง';
        lblScope30.innerHTML = '<span>🌙</span> มหาภาครายเดือน 30 วัน';
        descScope30.textContent = 'วิเคราะห์ภาพรวมแนวโน้ม 30 วัน สถิติพลังงาน และปฏิทินพลังงานครบวงจร';
      } else {
        submitBtn.innerHTML = '<span>📸</span> ดาวน์โหลดรูปภาพ PNG (High-DPI)';
        lblScope7.innerHTML = '<span>⚡</span> ภาพการ์ดดวงรายวัน (Daily Card)';
        descScope7.textContent = 'ส่งออกภาพการ์ดดวงวันที่เลือก สวยคมชัดระดับ 2x Retina เหมาะแชร์ลง LINE / IG';
        lblScope30.innerHTML = '<span>🌙</span> ภาพแผ่นยุทธศาสตร์ 7 วัน (7-Day Sheet)';
        descScope30.textContent = 'สรุปแนวโน้มและคะแนนดวงดาว 7 วันล่วงหน้าในแผ่นภาพเดียว';
      }
    }

    function selectExportScope(scope) {
      exportScope = scope;
      document.getElementById('opt-scope-7').classList.toggle('selected', scope === 7);
      document.getElementById('opt-scope-30').classList.toggle('selected', scope === 30);
    }

    function selectExportTheme(theme) {
      exportTheme = theme;
      document.getElementById('opt-theme-obsidian').classList.toggle('selected', theme === 'obsidian');
      document.getElementById('opt-theme-ivory').classList.toggle('selected', theme === 'ivory');
    }

    function executeExport() {
      if (exportFormat === 'pdf') {
        executeExportPDF();
      } else {
        closeExportModal();
        if (exportScope === 7) {
          exportDailyImage(activeIndex, exportTheme);
        } else {
          export7DayImage(activeIndex, exportTheme);
        }
      }
    }

    function executeExportPDF() {
      closeExportModal();
      renderPrintDossier(exportScope, exportTheme);
      setTimeout(() => {
        window.print();
      }, 350);
    }

    function exportDailyImage(dateIdx, themeOverride) {
      const idx = (typeof dateIdx === 'number') ? dateIdx : activeIndex;
      const theme = themeOverride || exportTheme || 'obsidian';
      const cur = data[idx];
      const n = cur.narrative || {};
      const t = cur.taksa || {};

      const quickBtn = document.getElementById('btn-quick-img');
      const originalText = quickBtn ? quickBtn.innerHTML : '';
      if (quickBtn) quickBtn.innerHTML = '<span>⏳</span> กำลังสร้างรูป...';

      const stage = document.getElementById('image-export-stage');
      stage.innerHTML = '';

      const card = document.createElement('div');
      card.className = \`image-capture-card theme-\${theme}\`;
      card.style.width = '680px';
      card.style.position = 'relative';

      const statusText = cur.netScore >= 70 ? '🌟 GOLDEN DAY (จังหวะเปิด)' : (cur.netScore <= 45 ? '⚠️ CAUTION DAY (เฝ้าระวัง)' : '⚡ NEUTRAL (ดำเนินงานปกติ)');
      const scoreColor = cur.netScore >= 70 ? '#10B981' : (cur.netScore <= 45 ? '#F43F5E' : (theme === 'obsidian' ? '#E5B869' : '#B45309'));

      card.innerHTML = \`
        <div class="icc-header-row">
          <div class="icc-brand-wrap">
            <div class="icc-sigil">✧</div>
            <div>
              <div class="icc-brand-title">IAE ARCANE OBSERVATORY</div>
              <div class="icc-sub-brand">ระบบสังเคราะห์ดวงชะตาบูรณาการ • พิกัดดาราศาสตร์สากล VSOP87</div>
            </div>
          </div>
          <div class="icc-badge" style="background: \${cur.netScore >= 70 ? 'rgba(16, 185, 129, 0.2)' : (cur.netScore <= 45 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(229, 184, 105, 0.2)')}; color: \${scoreColor}; border: 1px solid \${scoreColor};">
            \${statusText}
          </div>
        </div>

        <div class="icc-hero-section">
          <div class="icc-score-circle" style="border-color: \${scoreColor}; color: \${scoreColor};">
            <div class="icc-score-val">\${cur.netScore}</div>
            <div class="icc-score-lbl">CONFLUENCE</div>
          </div>
          <div class="icc-hero-info">
            <div class="icc-hero-date">\${formatThaiDateLong(cur.date)} (\${cur.dayOfWeek})</div>
            <div class="icc-hero-headline">"\${n.headline || 'จังหวะชีวิตดำเนินไปอย่างมั่นคง'}"</div>
            <div class="icc-hero-summary">\${n.summary || ''}</div>
          </div>
        </div>

        <div class="icc-pillars-grid">
          <div class="icc-pillar-card">
            <div class="icc-pillar-title">🧠 กายและจิตใจ (Mind & Body)</div>
            <div class="icc-pillar-desc">\${n.emotion || '-'}</div>
          </div>
          <div class="icc-pillar-card">
            <div class="icc-pillar-title">💼 หน้าที่การงาน (Career)</div>
            <div class="icc-pillar-desc">\${n.career || '-'}</div>
          </div>
          <div class="icc-pillar-card">
            <div class="icc-pillar-title">💰 การเงินและทรัพย์ (Wealth)</div>
            <div class="icc-pillar-desc">\${n.finance || '-'}</div>
          </div>
          <div class="icc-pillar-card">
            <div class="icc-pillar-title">♟️ ยุทธศาสตร์ & ปฏิบัติ (Action)</div>
            <div class="icc-pillar-desc">\${n.action || '-'}</div>
          </div>
        </div>

        <div class="icc-tactical-box">
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
            <div>
              <span>🎨 <strong>สีทักษา:</strong></span>
              <span>ศรี: <strong class="c-sri">\${t.sri || '-'}</strong></span> •
              <span>เดช: <strong class="c-dech">\${t.dech || '-'}</strong></span> •
              <span>มนตรี: <strong class="c-montri">\${t.montri || '-'}</strong></span> •
              <span>กาลกิณี: <strong class="c-kala">\${t.kalakini || '-'}</strong></span>
            </div>
            <div>🇨🇳 <strong>ดวงจีน:</strong> \${cur.bazi.raw}</div>
          </div>
          <div>⚠️ <strong>ข้อควรระวัง:</strong> \${n.warning || 'ระวังความเหนื่อยล้าสะสม'}</div>
          <div style="margin-top: 4px; font-size: 10.5px; opacity: 0.85;">🧭 <strong>ทิศมงคล Kua 4:</strong> ใต้ (บารมี) • เหนือ (ความคิด) • ตะวันออกเฉียงใต้ (มั่งคั่ง) • ตะวันออก (สุขภาพ)</div>
        </div>

        <div class="icc-footer-row">
          <div>คุณครูพิชญุตม์ • ลัคนากรกฎ 12°44' • จอมฟ้าเมษ 8°37' • ดิถีไม้กะ</div>
          <div style="font-family: var(--font-en);">✦ IAE Scientific Astrological Framework ✦</div>
        </div>
      \`;

      stage.appendChild(card);

      setTimeout(() => {
        if (typeof htmlToImage === 'undefined') {
          alert('กำลังโหลดโมดูลรูปภาพ กรุณาลองใหม่อีกครั้ง');
          if (quickBtn) quickBtn.innerHTML = originalText;
          return;
        }

        htmlToImage.toPng(card, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: theme === 'obsidian' ? '#06080F' : '#FFFFFF'
        })
        .then(dataUrl => {
          const filename = \`IAE-Destiny-\${cur.date}.png\`;
          const a = document.createElement('a');
          a.download = filename;
          a.href = dataUrl;
          a.click();
          if (quickBtn) {
            quickBtn.innerHTML = '<span>✅</span> สำเร็จ!';
            setTimeout(() => { quickBtn.innerHTML = originalText; }, 2000);
          }
          stage.innerHTML = '';
          showImagePreviewModal(dataUrl, filename);
        })
        .catch(err => {
          console.error('Image export failed:', err);
          alert('เกิดข้อผิดพลาดในการสร้างรูปภาพ กรุณาลองใหม่อีกครั้ง');
          if (quickBtn) quickBtn.innerHTML = originalText;
          stage.innerHTML = '';
        });
      }, 150);
    }

    function export7DayImage(startIdx, themeOverride) {
      const idx = (typeof startIdx === 'number') ? startIdx : activeIndex;
      const theme = themeOverride || exportTheme || 'obsidian';
      const actualStart = (idx + 7 <= data.length) ? idx : Math.max(0, data.length - 7);
      const days = data.slice(actualStart, actualStart + 7);
      const startDateStr = formatThaiDateLong(days[0].date);
      const endDateStr = formatThaiDateLong(days[days.length - 1].date);
      const avgScore = Math.round(days.reduce((acc, d) => acc + d.netScore, 0) / days.length);

      const stage = document.getElementById('image-export-stage');
      stage.innerHTML = '';

      const card = document.createElement('div');
      card.className = \`image-capture-card theme-\${theme}\`;
      card.style.width = '680px';
      card.style.position = 'relative';

      let itemsHtml = '';
      days.forEach(d => {
        const n = d.narrative || {};
        const t = d.taksa || {};
        const scoreColor = d.netScore >= 70 ? '#10B981' : (d.netScore <= 45 ? '#F43F5E' : (theme === 'obsidian' ? '#E5B869' : '#B45309'));

        itemsHtml += \`
          <div style="background: \${theme === 'obsidian' ? '#0B101D' : '#F8FAFC'}; border: 1px solid \${theme === 'obsidian' ? 'rgba(229,184,105,0.2)' : '#CBD5E1'}; border-radius: 8px; padding: 8px 12px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="flex: 1.2;">
              <div style="font-weight: 700; font-size: 12px; font-family: var(--font-en); color: \${scoreColor};">\${d.date} (\${d.dayOfWeek.slice(3)})</div>
              <div style="font-size: 11.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">\${n.headline || '-'}</div>
            </div>
            <div style="flex: 2; font-size: 10.5px; opacity: 0.85; line-height: 1.35;">
              <div>🎯 \${n.action || '-'}</div>
              <div style="font-size: 9.5px; opacity: 0.75; margin-top: 2px;">🎨 ศรี:\${t.sri || '-'} | เดช:\${t.dech || '-'} | เลี่ยง:\${t.kalakini || '-'}</div>
            </div>
            <div style="text-align: right; min-width: 50px;">
              <div style="font-size: 16px; font-weight: 800; font-family: var(--font-en); color: \${scoreColor};">\${d.netScore}</div>
              <div style="font-size: 8.5px; opacity: 0.6;">SCORE</div>
            </div>
          </div>
        \`;
      });

      card.innerHTML = \`
        <div class="icc-header-row">
          <div class="icc-brand-wrap">
            <div class="icc-sigil">✧</div>
            <div>
              <div class="icc-brand-title">IAE IMPERIAL ASTROLOGICAL DOSSIER</div>
              <div class="icc-sub-brand">แผนผังยุทธศาสตร์ชะตา 7 วัน • พิกัดดาราศาสตร์สากล VSOP87</div>
            </div>
          </div>
          <div class="icc-badge" style="background: rgba(229, 184, 105, 0.2); color: #E5B869; border: 1px solid #E5B869;">
            ⚡ 7-DAY STRATEGIC SHEET
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: \${theme === 'obsidian' ? 'rgba(229,184,105,0.08)' : '#FFFBEB'}; border: 1px solid \${theme === 'obsidian' ? 'rgba(229,184,105,0.25)' : '#FCD34D'}; border-radius: 8px; padding: 8px 14px; margin-bottom: 12px; font-size: 11.5px;">
          <div>📅 <strong>ช่วงเวลา:</strong> \${startDateStr} – \${endDateStr}</div>
          <div>📈 <strong>คะแนนเฉลี่ย:</strong> <span style="font-weight: 700; font-family: var(--font-en); font-size: 13px;">\${avgScore}/100</span></div>
        </div>

        <div style="margin-bottom: 12px;">
          \${itemsHtml}
        </div>

        <div class="icc-footer-row">
          <div>คุณครูพิชญุตม์ • ลัคนากรกฎ 12°44' • จอมฟ้าเมษ 8°37' • ดิถีไม้กะ • Kua 4</div>
          <div style="font-family: var(--font-en);">✦ IAE Scientific Astrological Framework ✦</div>
        </div>
      \`;

      stage.appendChild(card);

      setTimeout(() => {
        if (typeof htmlToImage === 'undefined') {
          alert('กำลังโหลดโมดูลรูปภาพ กรุณาลองใหม่อีกครั้ง');
          return;
        }

        htmlToImage.toPng(card, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: theme === 'obsidian' ? '#06080F' : '#FFFFFF'
        })
        .then(dataUrl => {
          const filename = \`IAE-7Day-Strategy-\${days[0].date}.png\`;
          const a = document.createElement('a');
          a.download = filename;
          a.href = dataUrl;
          a.click();
          stage.innerHTML = '';
          showImagePreviewModal(dataUrl, filename);
        })
        .catch(err => {
          console.error('7-Day image export failed:', err);
          alert('เกิดข้อผิดพลาดในการสร้างรูปภาพ กรุณาลองใหม่อีกครั้ง');
          stage.innerHTML = '';
        });
      }, 150);
    }

    function showImagePreviewModal(dataUrl, filename) {
      const modal = document.getElementById('image-preview-modal');
      const content = document.getElementById('image-preview-content');
      const reDownloadBtn = document.getElementById('btn-re-download');
      if (!modal || !content) return;

      content.innerHTML = \`<img src="\${dataUrl}" alt="IAE Card Preview" style="width: 100%; display: block; border-radius: 8px;">\`;
      if (reDownloadBtn) {
        reDownloadBtn.onclick = () => {
          const a = document.createElement('a');
          a.download = filename;
          a.href = dataUrl;
          a.click();
        };
      }
      modal.classList.add('active');
    }

    function closeImagePreviewModal() {
      const modal = document.getElementById('image-preview-modal');
      if (modal) modal.classList.remove('active');
    }

    function formatThaiDateLong(dateStr) {
      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      return \`\${d} \${thMonths[m - 1]} \${y + 543}\`;
    }

    function renderPrintDossier(scope, theme) {
      const container = document.getElementById('print-dossier');
      container.className = \`theme-\${theme}\`;

      let days = [];
      if (scope === 7) {
        const startIdx = (activeIndex + 7 <= data.length) ? activeIndex : Math.max(0, data.length - 7);
        days = data.slice(startIdx, startIdx + 7);
      } else {
        days = data;
      }

      const startDateStr = formatThaiDateLong(days[0].date);
      const endDateStr = formatThaiDateLong(days[days.length - 1].date);
      const avgScore = Math.round(days.reduce((acc, d) => acc + d.netScore, 0) / days.length);
      const goldenCount = days.filter(d => d.netScore >= 70).length;
      const cautionCount = days.filter(d => d.netScore <= 45).length;

      let html = \`
        <div class="dossier-header-block">
          <div class="dossier-brand-row">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="dossier-sigil">✧</div>
              <div>
                <div class="dossier-main-title">IAE IMPERIAL ASTROLOGICAL DOSSIER</div>
                <div class="dossier-sub-title">ระบบพยากรณ์และวิเคราะห์ดวงชะตาบูรณาการ • พิกัดดาราศาสตร์สากล VSOP87</div>
              </div>
            </div>
            <div class="dossier-scope-badge">\${scope === 7 ? '⚡ 7-DAY STRATEGIC DOSSIER' : '🌙 30-DAY COMPREHENSIVE ODYSSEY'}</div>
          </div>

          <div class="dossier-meta-grid">
            <div class="dossier-meta-item">
              <span class="meta-label">เจ้าชะตา:</span> <span class="meta-val">คุณครูพิชญุตม์</span>
            </div>
            <div class="dossier-meta-item">
              <span class="meta-label">ลัคนา / จอมฟ้า:</span> <span class="meta-val">กรกฎ 12°44' / เมษ 8°37'</span>
            </div>
            <div class="dossier-meta-item">
              <span class="meta-label">อาทิตย์ / จันทร์:</span> <span class="meta-val">มีน 7°59' / เมถุน 19°42'</span>
            </div>
            <div class="dossier-meta-item">
              <span class="meta-label">ดิถีจีน / กัวฮวงจุ้ย:</span> <span class="meta-val">ไม้กะ (Jia Wood) / Kua 4 (ทิศตะวันออก)</span>
            </div>
            <div class="dossier-meta-item">
              <span class="meta-label">ช่วงเวลาพยากรณ์:</span> <span class="meta-val">\${startDateStr} – \${endDateStr}</span>
            </div>
            <div class="dossier-meta-item">
              <span class="meta-label">ดัชนีชะตาเฉลี่ย:</span> <span class="meta-val">\${avgScore}/100 (วันเด่น: \${goldenCount} | วันระวัง: \${cautionCount})</span>
            </div>
          </div>
        </div>

        <div class="dossier-summary-box dossier-avoid-break">
          <div class="dossier-section-heading">✦ ภาพรวมมหาภาคและแกนยุทธศาสตร์หลัก (Executive Macro Guidance)</div>
          <div style="margin-bottom: 8px;">
            ช่วงเวลานี้ชะตาชีวิตถูกกำหนดโดย <strong>ดาวเสาร์จรตรึงแนวตั้งฉากจอมฟ้า (Saturn Conjunct MC ในราศีเมษ)</strong> เป็นห้วงเวลาแห่งการสร้างวินัย ก่อร่างสร้างสถานะทางสังคมและวิชาชีพ 
            ขณะที่ <strong>ดาวพฤหัสในราศีสิงห์</strong> ให้มุมตรีโกณเสริมความสง่างาม ความน่าเชื่อถือ และความคิดริเริ่มสร้างสรรค์ 
            ดิถีไม้กะต้องการความชุ่มชื้นและการจัดการเวลาอย่างมีกลยุทธ์ ควรมุ่งเน้นการลงมือทำตามลำดับความสำคัญ ไม่ผลีผลาม และพักผ่อนตามจังหวะชีวกลศาสตร์
          </div>
          <div class="dossier-guidelines-row">
            <div class="dossier-guide-pill">🧭 <strong>ทิศมงคล Kua 4:</strong> ใต้ (บารมี), เหนือ (สร้างสรรค์), ตะวันออกเฉียงใต้ (มั่งคั่ง), ตะวันออก (สุขภาพ)</div>
            <div class="dossier-guide-pill">💍 <strong>วัตถุมงคล:</strong> สวมแหวนโลหะ/ทอง เสริมเดชและเกราะคุ้มกันพลังงานตามหลักทักษา</div>
          </div>
        </div>
      \`;

      if (scope === 7) {
        html += \`<div class="dossier-section-heading" style="margin: 14px 0 10px;">✦ บันทึกยุทธศาสตร์รายวัน 7 วัน (7-Day Strategic Action Ledger)</div>\`;
        days.forEach(d => {
          const n = d.narrative || {};
          const t = d.taksa || {};
          const statusClass = d.netScore >= 70 ? 'flowing' : (d.netScore <= 45 ? 'challenging' : 'neutral');
          const statusText = d.netScore >= 70 ? '🌟 วันจังหวะเปิด (Golden Day)' : (d.netScore <= 45 ? '⚠️ วันเฝ้าระวัง (Caution Day)' : '⚡ วันดำเนินงานปกติ');

          html += \`
            <div class="dossier-day-card dossier-avoid-break">
              <div class="day-card-head">
                <div class="day-title-wrap">
                  <span class="day-num">\${formatThaiDateLong(d.date)} (\${d.dayOfWeek})</span>
                  <span class="day-bazi-tag">จีน: \${d.bazi.raw}</span>
                </div>
                <div class="day-score-wrap">
                  <span class="day-status-pill \${statusClass}">\${statusText}</span>
                  <span class="day-score-num">\${d.netScore}<span>/100</span></span>
                </div>
              </div>

              <div class="day-headline-quote">"\${n.headline || 'จังหวะชีวิตดำเนินไปอย่างมั่นคง'}"</div>
              <div class="day-summary-note">\${n.summary || ''}</div>

              <div class="day-four-pillars-grid">
                <div class="d-pillar">
                  <div class="dp-title">🧠 กายและจิตใจ (Mind & Body)</div>
                  <div class="dp-body">\${n.emotion || '-'}</div>
                </div>
                <div class="d-pillar">
                  <div class="dp-title">🏛️ หน้าที่การงาน (Career)</div>
                  <div class="dp-body">\${n.career || '-'}</div>
                </div>
                <div class="d-pillar">
                  <div class="dp-title">💰 การเงินและทรัพย์ (Wealth)</div>
                  <div class="dp-body">\${n.finance || '-'}</div>
                </div>
                <div class="d-pillar">
                  <div class="dp-title">♟️ กลยุทธ์และการปฏิบัติ (Action)</div>
                  <div class="dp-body">\${n.action || '-'}</div>
                </div>
              </div>

              <div class="day-tactical-footer">
                <div>
                  <span>🎨 <strong>สีทักษา:</strong></span>
                  <span>ศรี: <strong class="c-sri">\${t.sri || '-'}</strong></span> •
                  <span>เดช: <strong class="c-dech">\${t.dech || '-'}</strong></span> •
                  <span>มนตรี: <strong class="c-montri">\${t.montri || '-'}</strong></span> •
                  <span>กาลกิณี: <strong class="c-kala">\${t.kalakini || '-'}</strong></span>
                </div>
                <div>⚠️ <strong>ข้อควรระวัง:</strong> \${n.warning || 'ระวังความเหนื่อยล้าสะสม'}</div>
              </div>
            </div>
          \`;
        });
      } else {
        html += \`<div class="dossier-section-heading" style="margin: 14px 0 10px;">✦ บัญชีพยากรณ์มหาภาค 30 วัน (30-Day Astrological Ledger)</div>\`;
        html += \`<div class="dossier-ledger-grid">\`;
        days.forEach(d => {
          const n = d.narrative || {};
          const t = d.taksa || {};
          const statusClass = d.netScore >= 70 ? 'flowing' : (d.netScore <= 45 ? 'challenging' : 'neutral');
          const statusText = d.netScore >= 70 ? '🌟 จังหวะเปิด' : (d.netScore <= 45 ? '⚠️ ระวัง' : '⚡ ปกติ');

          html += \`
            <div class="compact-ledger-card dossier-avoid-break">
              <div class="compact-head">
                <span style="font-weight: 700; font-family: var(--font-en);">\${d.date} (\${d.dayOfWeek.slice(3, 5)})</span>
                <span class="day-status-pill \${statusClass}">\${statusText} (\${d.netScore})</span>
              </div>
              <div class="compact-headline">\${n.headline || '-'}</div>
              <div class="compact-desc">\${n.summary || ''}</div>
              <div class="compact-footer">
                <span>🎯 \${n.action ? n.action.slice(0, 42) + '...' : '-'}</span>
                <span>🎨 ศรี:\${t.sri || '-'} | เลี่ยง:\${t.kalakini || '-'}</span>
              </div>
            </div>
          \`;
        });
        html += \`</div>\`;
      }

      html += \`
        <div class="dossier-footer-seal dossier-avoid-break">
          <div class="seal-symbol">✧ ✦ ✧</div>
          <div class="seal-statement">
            <strong>ETHICAL ASTROLOGICAL ARCHITECTURE & FIDELITY CHARTER</strong><br>
            รายงานฉบับนี้ประมวลผลด้วยอัลกอริทึมตำแหน่งดาวจริงตามพิกัดดาราศาสตร์สากล VSOP87 และกลไกสังเคราะห์ 4 ศาสตร์ (IAE Engine v3.2)<br>
            <em>"ดวงดาวบ่งชี้เพียงแนวโน้มและฤดูกาลแห่งพลังงาน แต่วิจารณญาณ คุณธรรม และการลงมือทำด้วยสติสัมปชัญญะของท่าน คือผู้กำหนดชะตาชีวิตที่แท้จริง"</em>
          </div>
          <div class="seal-timestamp">เอกสารออกเมื่อ: \${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} • เอกสารลับเฉพาะบุคคล</div>
        </div>
      \`;

      container.innerHTML = html;
    }

    // Modal Events
    document.addEventListener('click', (e) => {
      const modal = document.getElementById('export-modal');
      if (e.target === modal) closeExportModal();
      const imgModal = document.getElementById('image-preview-modal');
      if (e.target === imgModal) closeImagePreviewModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeExportModal();
        closeImagePreviewModal();
      }
    });

    // Initialize
    renderTimelineChart();
    renderDateChips();
    updateAllTabs();
  </script>
</body>
</html>
`;

// Save updated files
fs.writeFileSync('index.html', htmlContent, 'utf-8');
fs.writeFileSync('timeline_data.json', JSON.stringify(timeline, null, 2), 'utf-8');

// Also update local artifact dashboard so user can preview directly
const artifactDashboardPath = 'C:/Users/UNS_CT/.gemini/antigravity/brain/b3fc2399-9925-4d4c-bb9e-64f29755c607/iae_dashboard.html';
fs.writeFileSync(artifactDashboardPath, htmlContent, 'utf-8');

console.log(`[Auto-Generate] IAE Arcane Observatory v3.1 with Deep Meanings generated successfully for ${firstDate} to ${lastDate}`);
