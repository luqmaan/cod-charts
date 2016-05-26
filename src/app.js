function load(path) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.overrideMimeType('application/json');
    req.open('GET', path, true);
    req.onreadystatechange = function () {
      if (req.readyState == 4 && req.status == '200') {
        resolve(req.responseText);
      }
    }
    req.send(null);
  });
}

function loadJson(path) {
  return load(path).then((res) => JSON.parse(res));
}

function parseRangeUnits(units) {
  return {
    units: units,
    inches: units,
    feet: units * 0.08334,
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
  };
}

const promiseAttachments = new Promise((resolve, reject) => {
  d3.csv('data/raw_attachments.csv')
    .get((error, rows) => {
      if (error) {
        reject(error);
      }

      const attachmentsById = window.attachmentsById = _.keyBy(rows, 'ATTACHMENTFILE');

      resolve(attachmentsById);
    });
});

const promiseWeapons = (attachmentsById) => new Promise((resolve, reject) => {
  d3.csv('data/raw_weapons.csv')
  .row((data) => {
    data.name = data.WEAPONFILE.indexOf('dualoptic_') === 0 ? `${data.displayName} Varix` : data.displayName;
    return data;
  })
  .get((error, rows) => {
    if (error) {
      reject(error);
    }

    const weaponsById = window.weaponsById = _.keyBy(rows, 'WEAPONFILE');

    resolve(weaponsById);
  });
});

const promiseWeaponGroups = loadJson('data/weapon_groups.json')
.then((res) => {
  const weaponGroups = window.weaponGroups = res;
  weaponGroups.all = _.reduce(weaponGroups, (prev, current) => [...prev, ...current]);
  return weaponGroups;
});

Promise.all([
  promiseAttachments.then(attachments => promiseWeapons(attachments)),
  promiseWeaponGroups,
])
.then((args) => {
  const weaponsById = args[0];
  const weaponGroups = args[1];

  let chartsById;
  let weapons;

  function setup() {
    console.log('setup');
    document.querySelector('.weapons').innerHTML = '';
    chartsById = {};
    weapons = filterWeapons(weaponsById, weaponGroups);
    draw(chartsById, weapons);
  }
  setup();

  document.querySelector('select#category').onchange = setup;
  document.querySelector('input#suppressor').onchange = () => draw(chartsById, weapons);
})
// .catch((err) => console.error(err));

function filterWeapons(weaponsById, weaponGroups) {
  const category = document.querySelector('select#category').value;

  return _.filter(weaponsById, (weapon) => (
    weapon.WEAPONFILE.indexOf('_mp') !== -1 &&
    weapon.WEAPONFILE.indexOf('dualoptic_') === -1 &&
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
      chart = drawChart(weaponModel.name, labels, data);
      chartsById[weaponModel.id] = chart;
    }
  });
}

function drawChart(title, labels, data) {
  const template = `<div class="chart">${title}<canvas width="250" height="250"></canvas></div>`;
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
      },
    ]
  };

  const options = {
    scales: {
      xAxes: [{
        ticks: {
          fontSize: 30,
          fontColor: 'rgba(102, 102, 102, 1)',
        }
      }],
      yAxes: [{
        scaleLabel: {
          display: true,
          labelString: 'Distance (meters)',
        },
        ticks: {
          max: 100,
          min: 0,
        },
      }]
    }
  };

  return new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: options,
  });
}
