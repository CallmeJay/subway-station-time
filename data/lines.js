// 线路色值 + 端点 + 1 号线 sample 站点
// 全量站点跑 scripts/scrape_full.py 后回填到这里
// 数据源：DB11/T657.2-2015 北京市地方标准

const LINES = [
  { id: 'line1',  no: '1',  name: '1号线/八通线', shortName: '1号线',   color: '#A4343A', colorDeep: '#7A1F25' },
  { id: 'line2',  no: '2',  name: '2号线',        shortName: '2号线',   color: '#004B87', colorDeep: '#003359' },
  { id: 'line3',  no: '3',  name: '3号线',        shortName: '3号线',   color: '#D90627', colorDeep: '#9A0418' },
  { id: 'line4',  no: '4',  name: '4号线/大兴线', shortName: '4号线',   color: '#008C95', colorDeep: '#005C62' },
  { id: 'line5',  no: '5',  name: '5号线',        shortName: '5号线',   color: '#AA0061', colorDeep: '#6E003E' },
  { id: 'line6',  no: '6',  name: '6号线',        shortName: '6号线',   color: '#B58500', colorDeep: '#7A5900' },
  { id: 'line7',  no: '7',  name: '7号线',        shortName: '7号线',   color: '#FFC56E', colorDeep: '#C68F30' },
  { id: 'line8',  no: '8',  name: '8号线',        shortName: '8号线',   color: '#009B77', colorDeep: '#00664C' },
  { id: 'line9',  no: '9',  name: '9号线',        shortName: '9号线',   color: '#97D700', colorDeep: '#5F8800' },
  { id: 'line10', no: '10', name: '10号线',       shortName: '10号线',  color: '#0092BC', colorDeep: '#005E7A' },
  { id: 'line11', no: '11', name: '11号线',       shortName: '11号线',  color: '#FF8674', colorDeep: '#C85546' },
  { id: 'line12', no: '12', name: '12号线',       shortName: '12号线',  color: '#9C4F01', colorDeep: '#643200' },
  { id: 'line13', no: '13', name: '13号线',       shortName: '13号线',  color: '#F4DA40', colorDeep: '#B49E16' },
  { id: 'line14', no: '14', name: '14号线',       shortName: '14号线',  color: '#CA9A8E', colorDeep: '#8C645A' },
  { id: 'line15', no: '15', name: '15号线',       shortName: '15号线',  color: '#653279', colorDeep: '#3F1A4D' },
  { id: 'line16', no: '16', name: '16号线',       shortName: '16号线',  color: '#6BA539', colorDeep: '#446B22' },
  { id: 'line17', no: '17', name: '17号线',       shortName: '17号线',  color: '#00ABAB', colorDeep: '#006D6D' },
  { id: 'line18', no: '18', name: '18号线',       shortName: '18号线',  color: '#685BC7', colorDeep: '#3F3585' },
  { id: 'line19', no: '19', name: '19号线',       shortName: '19号线',  color: '#D3A3C9', colorDeep: '#9A6E91' },
  { id: 'yz',     no: 'Y',  name: '亦庄线',       shortName: '亦庄线',  color: '#D0006F', colorDeep: '#8A0049' },
  { id: 'fs',     no: 'F',  name: '房山线',       shortName: '房山线',  color: '#D86018', colorDeep: '#8C3A00' },
  { id: 'yf',     no: 'YF', name: '燕房线',       shortName: '燕房线',  color: '#D86018', colorDeep: '#8C3A00' },
  { id: 's1',     no: 'S1', name: 'S1线',         shortName: 'S1线',    color: '#A45A2A', colorDeep: '#6E3B17' },
  { id: 'cp',     no: 'C',  name: '昌平线',       shortName: '昌平线',  color: '#D986BA', colorDeep: '#9A5780' },
  { id: 'airport',no: 'AP', name: '首都机场线',   shortName: '机场线',  color: '#A192B2', colorDeep: '#6E607E' },
  { id: 'dxap',   no: 'DX', name: '大兴机场线',   shortName: '大兴机场',color: '#0049A5', colorDeep: '#002E6B' },
  { id: 'xj',     no: 'X',  name: '西郊线',       shortName: '西郊线',  color: '#D22630', colorDeep: '#8E1419' },
  { id: 'yzt1',   no: 'T1', name: '亦庄T1线',     shortName: '亦庄T1', color: '#D22630', colorDeep: '#8E1419' }
];

// 1 号线全站点（西→东，含八通线段）
const LINE1_STATIONS = [
  { idx: 1,  cn: '古城',       py: 'Gucheng',           endpoint: 'west' },
  { idx: 2,  cn: '八角游乐园', py: 'Bajiao Youleyuan' },
  { idx: 3,  cn: '八宝山',     py: 'Babaoshan' },
  { idx: 4,  cn: '玉泉路',     py: 'Yuquanlu' },
  { idx: 5,  cn: '五棵松',     py: 'Wukesong' },
  { idx: 6,  cn: '万寿路',     py: 'Wanshoulu' },
  { idx: 7,  cn: '公主坟',     py: 'Gongzhufen', isOrigin: true },
  { idx: 8,  cn: '军事博物馆', py: 'Junshi Bowuguan' },
  { idx: 9,  cn: '木樨地',     py: 'Muxidi' },
  { idx: 10, cn: '南礼士路',   py: 'Nanlishilu' },
  { idx: 11, cn: '复兴门',     py: 'Fuxingmen', isOrigin: true, transfer: ['line2'] },
  { idx: 12, cn: '西单',       py: 'Xidan',     transfer: ['line4'] },
  { idx: 13, cn: '天安门西',   py: 'Tiananmen Xi' },
  { idx: 14, cn: '天安门东',   py: 'Tiananmen Dong' },
  { idx: 15, cn: '王府井',     py: 'Wangfujing' },
  { idx: 16, cn: '东单',       py: 'Dongdan',   transfer: ['line5'] },
  { idx: 17, cn: '建国门',     py: 'Jianguomen',transfer: ['line2'] },
  { idx: 18, cn: '永安里',     py: 'Yonganli' },
  { idx: 19, cn: '国贸',       py: 'Guomao',    transfer: ['line10'] },
  { idx: 20, cn: '大望路',     py: 'Dawanglu',  transfer: ['line14'] },
  { idx: 21, cn: '四惠',       py: 'Sihui',     transfer: ['line14'], endpoint: 'branch' },
  { idx: 22, cn: '四惠东',     py: 'Sihui Dong',endpoint: 'branch' },
  { idx: 23, cn: '高碑店',     py: 'Gaobeidian' },
  { idx: 24, cn: '传媒大学',   py: 'Chuanmei Daxue' },
  { idx: 25, cn: '双桥',       py: 'Shuangqiao' },
  { idx: 26, cn: '管庄',       py: 'Guanzhuang' },
  { idx: 27, cn: '八里桥',     py: 'Baliqiao' },
  { idx: 28, cn: '通州北苑',   py: 'Tongzhou Beiyuan' },
  { idx: 29, cn: '果园',       py: 'Guoyuan' },
  { idx: 30, cn: '九棵树',     py: 'Jiukeshu' },
  { idx: 31, cn: '梨园',       py: 'Liyuan' },
  { idx: 32, cn: '临河里',     py: 'Linheli' },
  { idx: 33, cn: '土桥',       py: 'Tuqiao' },
  { idx: 34, cn: '花庄',       py: 'Huazhuang' },
  { idx: 35, cn: '环球度假区', py: 'Huanqiu Dujiaqu', endpoint: 'east' }
];

// 站点数据合并源 (按优先级从低到高):
//   1) ZhuwenJ/subway 开源数据集 → stations.generated.js (历史快照)
//   2) 高德地图 → stations.amap.generated.js (27 条线全量, 含 3/11/12/18/19/大兴机场)
//   3) 京港地铁 → stations.mtr.generated.js (4/14/16/17, 最权威)
//   4) 1 号线手动 35 站全量
const { STATIONS_BY_LINE: GENERATED_STATIONS } = require('./stations.generated.js');
const { AMAP_STATIONS } = require('./stations.amap.generated.js');
const { MTR_STATIONS } = require('./stations.mtr.generated.js');

const STATIONS_BY_LINE = {
  ...GENERATED_STATIONS,
  ...AMAP_STATIONS,           // 高德覆盖全 27 条线
  ...MTR_STATIONS,            // 京港 4/14/16/17 (最权威)
  line1: LINE1_STATIONS
};

// 云端可用时优先取云端站点 (热更新)
let _cloud = null;
function _getCloud() {
  if (_cloud === null) {
    try { _cloud = require('../utils/cloudData.js'); } catch (e) { _cloud = false; }
  }
  return _cloud || null;
}
function _stationsFor(lineId) {
  const c = _getCloud();
  const cloudLine = c ? c.getLineData(lineId) : null;
  if (cloudLine && cloudLine.stations && cloudLine.stations.length) {
    return cloudLine.stations;
  }
  return STATIONS_BY_LINE[lineId] || [];
}

function findLine(id) {
  const line = LINES.find(l => l.id === id) || LINES[0];
  const stations = _stationsFor(line.id);
  if (stations && stations.length >= 2) {
    return Object.assign({}, line, {
      endpoints: [stations[0].cn, stations[stations.length - 1].cn]
    });
  }
  return Object.assign({}, line, { endpoints: [line.shortName + '终点', line.shortName + '起点'] });
}

function findStations(lineId) {
  return _stationsFor(lineId);
}

function findStation(lineId, cn) {
  return findStations(lineId).find(s => s.cn === cn);
}

module.exports = {
  LINES,
  STATIONS_BY_LINE,
  findLine,
  findStations,
  findStation
};
