import './styles/styles.css';

import Chart from 'Chart.js' ;
import lodash from 'lodash';
import d3 from 'd3';
import Fingerprint2 from 'fingerprintjs2';
import raw_attachments from 'data/raw_attachments.csv';
import raw_weapons from 'data/raw_weapons.csv';
import weaponGroups from 'data/weapon_groups.json';

weaponGroups.all = _.reduce(weaponGroups, (prev, current) => [...prev, ...current]);

const weaponGroupNames = {
  ar: 'Assault Rifles',
  smg: 'Submachine Guns',
  lmg: 'Light Machine Guns',
  sniper: 'Sniper Rifles',
  shotgun: 'Shotguns',
  pistol: 'Pistols',
};

function parseRangeUnits(units) {
  return {
    units: units,
    inches: units,
    feet: Math.ceil(units * 0.08334),
    yards: units * 0.02778,
    centimeters: units * 2.54,
    meters: Math.floor(units * 0.0254),
  };
}

function getSuppressorDamageRangeScale(weapon, rangeIndex) {
  const damageRangeScaleKeys = ['damageRangeScale1', 'damageRangeScale2',	'damageRangeScale3',	'damageRangeScale4',	'damageRangeScale5',	'damageRangeScale6'];
  if (weapon.WEAPONFILE.indexOf('ar_standard') !== -1) {
    return Number(attachmentsById.suppressed.damageRangeScale);
  }
  if (weapon.WEAPONFILE.indexOf('ar_') !== -1) {
    return Number(attachmentsById.suppressed_ar.damageRangeScale);
  }
  if (weapon.WEAPONFILE.indexOf('smg_') !== -1) {
    return Number(attachmentsById.suppressed_smg.damageRangeScale);
  }
  if (weapon.WEAPONFILE.indexOf('shotgun_precision_') !== -1) {
    return Number(attachmentsById.suppressed_shotgunprecision[damageRangeScaleKeys[rangeIndex]]);
  }
  if (weapon.WEAPONFILE.indexOf('shotgun_') !== -1) {
    return Number(attachmentsById.suppressed_shotgun.damageRangeScale);
  }
  return 1;
}

function getDamage(weapon, rangeIndex) {
  const damageKeys = ['damage', 'damage2', 'damage3', 'damage4', 'damage5', 'minDamage'];
  const multishotBaseDamageKeys = ['multishotBaseDamage1', 'multishotBaseDamage2', 'multishotBaseDamage3', 'multishotBaseDamage4', 'multishotBaseDamage5', 'multishotBaseDamage6'];
  return Number(weapon[damageKeys[rangeIndex]]) + Number(weapon[multishotBaseDamageKeys[rangeIndex]]);
}

function getRange(weapon, rangeIndex) {
  const rangeKeys = ['maxDamageRange', 'damageRange2', 'damageRange3', 'damageRange4', 'damageRange5', 'minDamageRange'];
  return Number(weapon[rangeKeys[rangeIndex]]);
}

function getStatsAtRange(weapon, attachmentsById, attachments, rangeIndex) {
  const damageScaleKeys = ['damageScale1', 'damageScale2',	'damageScale3',	'damageScale4',	'damageScale5',	'damageScale6'];

  const damage = getDamage(weapon, rangeIndex);
  const stk = Math.ceil(100 / damage);
  let range = getRange(weapon, rangeIndex);
  if (attachments.indexOf('suppressor') !== -1) {
    range = range * getSuppressorDamageRangeScale(weapon, rangeIndex);
  }
  return {
    damage: damage,
    stk: stk,
    range: parseRangeUnits(range),
  };
}

function parseWeapon(weapon, attachmentsById, attachments) {
  const rangeIndexes = [0, 1, 3, 4, 5];

  const stats = rangeIndexes.reduce((prev, rangeKey) => {
    const stats = getStatsAtRange(weapon, attachmentsById, attachments, rangeKey);
    if (stats.stk !== Infinity) {
      if (prev.length > 0) {
        if (stats.stk === prev[prev.length - 1].stk) {
          prev.pop();
          return [...prev, stats];
        }
        if (stats.range.units - prev[prev.length - 1].range.units < 2) {
          return prev;
        }
      }
      return [...prev, stats];
    }
    return prev;
  }, []);

  return {
    ...weapon,
    name: weapon.name,
    id: weapon.WEAPONFILE,
    stats: stats,
  };
}

function filterWeapons(weaponsById, weaponGroups) {
  const category = document.querySelector('select#category').value;
  const game = document.querySelector('select#game').value;

  return _.filter(weaponsById, (weapon) => (
    weapon.WEAPONFILE.indexOf(game) !== -1 &&
    weapon.WEAPONFILE.indexOf('dualoptic_') === -1 &&
    weapon.WEAPONFILE.indexOf('dw_') === -1 &&
    weapon.WEAPONFILE.indexOf('lh_') === -1 &&
    weaponGroups[category].indexOf(weapon.displayName) !== -1
  ));
}

function draw(chartsById, weapons) {
  const attachments = document.querySelector('input#suppressor').checked ? ['suppressor'] : [];

  weapons.forEach((weapon) => {
    const weaponModel = parseWeapon(weapon, attachmentsById, attachments);
    const labels = weaponModel.stats.map(stat => stat.stk);
    const data = weaponModel.stats.map(stat => stat.range.meters);

    let chart = chartsById[weaponModel.id];
    if (chart) {
      drawChart(weaponModel, chart);
    }
    else {
      chart = drawChart(weaponModel);
      chartsById[weaponModel.id] = chart;
    }
  });
}

function setupChart(weaponModel) {
  const template = `
  <div class="chart">
    <div class="chart-header">
      <span class="title">${weaponModel.name}</span>
      <span class="weaponfile">${weaponModel.WEAPONFILE}</span>
    </div>
    <div class="chart-body">
    </div>
  </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = template;
  document.querySelector('.weapons').appendChild(div);
  const ctx = div.querySelector('.chart-body');

  const maxRange = _.max(weaponModel.stats.map(wm => wm.range.meters * 2));
  const barWidth = Math.max(200, maxRange);

  const svg = d3.select(ctx)
    .append('svg')
    .attr('height', 60)
    .attr('width', barWidth)
    .append('g');

  svg.append('g')
    .append('rect')
    .attr('fill', 'rgba(90, 90, 90, 1)')
    .attr('width', barWidth)
    .attr('height', 20)

  const scale = d3.scale.linear()
    .domain([0, 100])
    .range([0, 200])

  const xAxis = d3.svg.axis()
      .scale(scale)
      .innerTickSize(10)
      .outerTickSize(2)
      .tickValues([5, 15, 30, 50, 70, 90, 120])

  svg.append("g")
    .attr('class', 'xaxis axis')
    .attr("transform", "translate(0, 20)")
    .call(xAxis)
    .selectAll('text')

  const barsGroup = svg.append('g')
    .attr('class', 'barsGroup')

  return svg;
}


const stkColors = [
  'rgba(255, 198, 54, 1)',
  'rgba(255, 173, 54, 1)',
  'rgba(255, 149, 54, 1)',
  'rgba(250, 114, 53, 1)',
  'rgba(219, 58, 47, 1)',
  'rgba(158, 34, 51, 1)',
];

function drawChart(weaponModel, svg) {
  if (!svg) {
    svg = setupChart(weaponModel);
  }


  function getSTKBarWidth(d, index) {
    return d.range.meters * 2;
  }

  const xOffsets = [0];
  function getSTKBarOffsetX(d, index) {
    console.log('offsetX', d.stk, index)
    if (xOffsets.length - 1 <= index) {
      xOffsets.push(d.range.meters * 2)
    }
    return xOffsets[index];
  }

  function getSTKTextOffsetX(data, index) {
    return getSTKBarOffsetX(data, index) + (getSTKBarWidth(data, index) / 2);
  }

  const barsGroup = svg.select('.barsGroup')

  // DATA JOIN
  const stkBars = barsGroup.selectAll('rect')
    .data(weaponModel.stats, d => d.stk);

  stkBars.enter()
    .append('rect')
      .attr('height', 20)
      .attr('y', 0)

  stkBars.transition()
      .duration(750)
        .attr('x', getSTKBarOffsetX)
        .attr('width', getSTKBarWidth)
        .attr('fill', d => stkColors[d.stk - 1])

  const stkText = barsGroup.selectAll('text')
    .data(weaponModel.stats, d => d.stk);

  stkText.enter()
    .append('text')
    .text(d => d.stk)
    .attr('text-anchor', 'middle')
    .attr('y', 16)
    .attr('fill', 'black')

  stkText
    .transition()
    .duration(750)
    .attr('x', getSTKTextOffsetX)
    .attr('width', getSTKBarWidth)

  return svg;
}


function init() {
  let chartsById = window.chartsById = {};
  let weapons;
  let weaponsById = window.weaponsById = _.keyBy(d3.csv.parse(raw_weapons, (data) => {
    data.name = data.WEAPONFILE.indexOf('dualoptic_') === 0 ? `${data.displayName} Varix` : data.displayName;
    return data;
  }), 'WEAPONFILE');

  const attachmentsById = window.attachmentsById = _.keyBy(d3.csv.parse(raw_attachments), 'ATTACHMENTFILE');

  function setup() {
    chartsById = {};
    document.querySelector('.loader').classList.remove('hidden');
    document.querySelector('.weapons').innerHTML = '';
    weapons = filterWeapons(weaponsById, weaponGroups);
    draw(chartsById, weapons);
    document.querySelector('.loader').classList.add('hidden');
  }
  setup();

  document.querySelector('select#category').onchange = setup;
  document.querySelector('select#game').onchange = setup;
  document.querySelector('input#suppressor').onchange = () => draw(chartsById, weapons);
}

init();

new Fingerprint2().get((result) => ga('set', 'userId', result));
