import './styles/styles.css';

import Chart from 'Chart.js' ;
import lodash from 'lodash';
import d3 from 'd3';
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
    name: weapon.name,
    id: weapon.WEAPONFILE,
    stats: stats,
    weapon: weapon,
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
      chart.data.datasets[0].data = data;
      chart.update();
    }
    else {
      chart = drawChart(weaponModel.name, weaponModel.id, labels, data, weaponModel);
      chartsById[weaponModel.id] = chart;
    }
  });
}

function drawChart(title, weaponfile, labels, data, weaponModel) {
  const template = `
    <div class="chart">
      <div class="chart-header">
        <span class="title">${title}</span>
        <span class="weaponfile">${weaponfile}</span>
      </div>
      <span class="watermark">CODCharts.com</span>
      <canvas width="250" height="250"></canvas>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = template;
  document.querySelector('.weapons').appendChild(div);
  const ctx = div.querySelector('canvas');

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: `${title} Shots To Kill`,
        backgroundColor: 'rgba(255, 102, 0, 0.8)',
        borderColor: 'rgba(255, 102, 0, 1)',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(255, 102, 0, 0.5)',
        hoverBorderColor: 'rgba(255, 102, 0, 0.6)',
        data: data,
        weaponModel: weaponModel,
      },
    ]
  };

  const options = {
    legend: {
      display: false,
    },
    scales: {
      paddingLeft: 30,
      xAxes: [{
        ticks: {
          fontSize: 20,
          fontColor: 'rgba(102, 102, 102, 1)',
        },
        gridLines: {
          display: false
        },
      }],
      yAxes: [{
        scaleLabel: {
          display: false,
          labelString: 'Distance (meters)',
          fontFamily: 'sans-serif',
        },
        ticks: {
          maxTicksLimit: 5,
          max: 70,
          min: 0,
        },
        gridLines: {
          color: 'rgba(52, 52, 52, 1)',
        },
      }]
    },
    tooltips: {
      backgroundColor: 'rgba(0,0,0,1)',
      bodyFontSize: 15,
      callbacks: {
        title: function(tooltipItem, data) {
          const stk = tooltipItem[0].xLabel;
          const weaponModel = data.datasets[tooltipItem[0].datasetIndex].weaponModel;
          const stats = weaponModel.stats[tooltipItem[0].index];
          return `${stk} Hits`;
        },
        beforeBody: function(tooltipItem, data) {
          const weaponModel = data.datasets[tooltipItem[0].datasetIndex].weaponModel;
          const stats = weaponModel.stats[tooltipItem[0].index];
          return [
            `${stats.range.meters}m`,
            `${stats.range.feet}ft`,
          ].join('\n');
        },
        label: function(tooltipItem, data) {
          const weaponModel = data.datasets[tooltipItem.datasetIndex].weaponModel;
          const stats = weaponModel.stats[tooltipItem.index];
          return [
            `${stats.damage} Damage`,
          ].join('\n');
        }
      }
    },
  };

  return new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: options,
  });
}


function init() {
  let chartsById = window.chartsById = {};
  let weapons;
  let weaponsById = window.attachmentsById = _.keyBy(d3.csv.parse(raw_weapons, (data) => {
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
