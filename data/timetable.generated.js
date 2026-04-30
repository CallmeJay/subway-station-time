// AUTO-GENERATED · 线路级元数据 (紧凑格式, 班次由 utils/scheduleSynth.js 合成)

const _LINE_META = {"line1":{"ft":"05:05","lt":"23:58","endsEast":"环球度假区","endsWest":"古城","endsRotate":["四惠","四惠东","环球度假区"]},"line2":{"ft":"05:04","lt":"23:08","endsEast":"西直门","endsWest":"西直门","endsRotate":[]},"line3":{"ft":"05:30","lt":"23:00","endsEast":"东坝北","endsWest":"东四十条","endsRotate":[]},"line4":{"ft":"05:00","lt":"23:15","endsEast":"安河桥北","endsWest":"天宫院","endsRotate":[]},"line5":{"ft":"05:15","lt":"23:00","endsEast":"天通苑北","endsWest":"宋家庄","endsRotate":[]},"line6":{"ft":"05:00","lt":"23:00","endsEast":"潞城","endsWest":"金安桥","endsRotate":[]},"line7":{"ft":"05:30","lt":"22:50","endsEast":"环球度假区","endsWest":"北京西站","endsRotate":[]},"line8":{"ft":"05:05","lt":"23:00","endsEast":"瀛海","endsWest":"朱辛庄","endsRotate":[]},"line9":{"ft":"05:30","lt":"22:45","endsEast":"国家图书馆","endsWest":"郭公庄","endsRotate":[]},"line10":{"ft":"04:55","lt":"22:56","endsEast":"巴沟","endsWest":"巴沟","endsRotate":[]},"line11":{"ft":"06:00","lt":"22:30","endsEast":"新首钢","endsWest":"模式口","endsRotate":[]},"line12":{"ft":"05:30","lt":"22:30","endsEast":"四季青桥","endsWest":"东坝北","endsRotate":[]},"line13":{"ft":"05:30","lt":"22:56","endsEast":"东直门","endsWest":"西直门","endsRotate":[]},"line14":{"ft":"05:30","lt":"22:30","endsEast":"善各庄","endsWest":"张郭庄","endsRotate":[]},"line15":{"ft":"05:30","lt":"22:27","endsEast":"俸伯","endsWest":"清华东路西口","endsRotate":[]},"line16":{"ft":"05:35","lt":"22:35","endsEast":"宛平城","endsWest":"北安河","endsRotate":[]},"line17":{"ft":"05:19","lt":"22:31","endsEast":"未来科学城北","endsWest":"嘉会湖","endsRotate":[]},"line18":{"ft":"05:30","lt":"22:30","endsEast":"天通苑东","endsWest":"马连洼","endsRotate":[]},"line19":{"ft":"05:30","lt":"22:30","endsEast":"牡丹园","endsWest":"新宫","endsRotate":[]},"s1":{"ft":"06:00","lt":"22:30","endsEast":"苹果园","endsWest":"石厂","endsRotate":[]},"cp":{"ft":"05:10","lt":"23:10","endsEast":"蓟门桥","endsWest":"昌平西山口","endsRotate":[]},"fs":{"ft":"05:30","lt":"22:50","endsEast":"国家图书馆","endsWest":"阎村东","endsRotate":[]},"yf":{"ft":"05:50","lt":"22:00","endsEast":"阎村东","endsWest":"燕山","endsRotate":[]},"yz":{"ft":"05:22","lt":"23:00","endsEast":"亦庄火车站","endsWest":"宋家庄","endsRotate":[]},"airport":{"ft":"06:21","lt":"22:51","endsEast":"T2/T3 航站楼","endsWest":"北新桥","endsRotate":[]},"dxap":{"ft":"05:30","lt":"22:30","endsEast":"大兴机场","endsWest":"草桥","endsRotate":[]},"xj":{"ft":"07:00","lt":"18:00","endsEast":"巴沟","endsWest":"香山","endsRotate":[]}};

const _LINE_COLORS = {"line1":"#A4343A","line2":"#004B87","line3":"#D90627","line4":"#008C95","line5":"#AA0061","line6":"#B58500","line7":"#FFC56E","line8":"#009B77","line9":"#97D700","line10":"#0092BC","line11":"#FF8674","line12":"#9C4F01","line13":"#F4DA40","line14":"#CA9A8E","line15":"#653279","line16":"#6BA539","line17":"#00ABAB","line18":"#685BC7","line19":"#D3A3C9","yz":"#D0006F","fs":"#D86018","yf":"#D86018","s1":"#A45A2A","cp":"#D986BA","airport":"#A192B2","dxap":"#0049A5","xj":"#D22630","yzt1":"#D22630"};

const synth = require('../utils/scheduleSynth.js');

function getSchedule(lineId, stationCn, direction, daytype) {
  const meta = _LINE_META[lineId];
  if (!meta) return [];
  const color = _LINE_COLORS[lineId] || '#888';
  // 终点轮换 (1 号线): 复制基本 schedule, 按周期改 end
  if (meta.endsRotate && meta.endsRotate.length && direction === 'east') {
    const base = synth.buildSchedule(meta.ft, meta.lt, daytype, '', color);
    return base.map((c, i) => Object.assign({}, c, { end: meta.endsRotate[i % meta.endsRotate.length] }));
  }
  const end = direction === 'east' ? meta.endsEast : meta.endsWest;
  const key = lineId + '|' + direction + '|' + (daytype || 'weekday');
  return synth.buildScheduleCached(key, meta.ft, meta.lt, daytype, end, color);
}

module.exports = { getSchedule, _LINE_META };