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

function innerSTK(weapon, attachmentsById, attachments, rangeIndex) {
  const rangeKeys = ['maxDamageRange', 'damageRange2', 'damageRange3', 'damageRange4', 'damageRange5', 'minDamageRange'];
  const damageScaleKeys = ['damageScale1', 'damageScale2',	'damageScale3',	'damageScale4',	'damageScale5',	'damageScale6'];

  const damage = getDamage(weapon, rangeIndex);
  const stk = Math.ceil(100 / damage);
  let range = weapon[rangeKeys[rangeIndex]];
  if (attachments.indexOf('suppressor') !== -1) {
    range = range * getSuppressorDamageRangeScale(weapon, rangeIndex);
  }
  return {
    damage: damage,
    stk: stk,
    range: parseRangeUnits(range),
  };
}

function calculateSTK(weapon, attachmentsById, attachments) {
  const shotsToKill = [0, 1, 3, 4, 5].reduce((prev, rangeKey) => {

    const data = innerSTK(weapon, attachmentsById, attachments, rangeKey);

    if (data.stk !== Infinity) {
      if (prev.length > 0) {
        if (data.stk === prev[prev.length - 1].stk) {
          prev.pop();
          return [...prev, data];
        }
        if (data.range.units - prev[prev.length - 1].range.units < 2) {
          return prev;
        }
      }
      return [...prev, data];
    }
    return prev;
  }, []);
  return shotsToKill;
}

const promiseAttachments = new Promise((resolve, reject) => {
  d3.csv('/data/raw_attachments.csv')
    .get((error, rows) => {
      if (error) {
        reject(error);
      }

      const attachmentsById = window.attachmentsById = _.keyBy(rows, 'ATTACHMENTFILE');

      resolve(attachmentsById);
    });
});

const promiseWeapons = (attachmentsById) => new Promise((resolve, reject) => {
  d3.csv('/data/raw_weapons.csv')
  .row((data) => {
    data.name = data.WEAPONFILE.indexOf('dualoptic_') === 0 ? `${data.displayName} Varix` : data.displayName;
    data.stk = calculateSTK(data, attachmentsById, ['suppressor']);
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

const promiseWeaponGroups = loadJson('/data/weapon_groups.json')
.then((res) => {
  const weaponGroups = window.weaponGroups = res;
  return weaponGroups;
});

Promise.all([
  promiseAttachments.then(attachments => promiseWeapons(attachments)),
  promiseWeaponGroups,
])
.then((args) => {
  const weaponsById = args[0];
  const weaponGroups = args[1];

  const weapons = _.filter(weaponsById, (weapon) => {
    return weaponGroups.shotgun.indexOf(weapon.name) !== -1 && weapon.stk.length && weapon.WEAPONFILE.indexOf('_mp') !== -1;
  });

  weapons.sort((weaponA, weaponB) => weaponA.stk[0].stk > weaponB.stk[0].stk);

  weapons.map(weapon => {
    draw(
      weapon.name,
      weapon.stk.map(stk => stk.stk),
      weapon.stk.map(stk => stk.range.meters)
    );
  });
})
// .catch((err) => console.error(err));

function draw(title, labels, data) {
  const template = `<div class="chart"><canvas width="400" height="400"></canvas></div>`;
  const div = document.createElement('div');
  div.innerHTML = template;
  document.querySelector('.weapons').appendChild(div);
  const ctx = div.querySelector('canvas');

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: title,
        backgroundColor: 'rgba(255, 102, 0, 0.4)',
        borderColor: 'rgba(255, 102, 0, 0.6)',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(255, 102, 0, 0.6)',
        hoverBorderColor: 'rgba(255, 102, 0, 0.9)',
        data: data,
      },
    ]
  };

  const options = {
    scales: {
      xAxes: [{
        ticks: {
          fontSize: 30,
          fontColor: 'rgba(255, 255, 255, 1)',
        }
      }],
      yAxes: [{
        scaleLabel: {
          display: true,
          labelString: 'Distance (meters)',
        },
        ticks: {
          max: 60,
          min: 0,
        },
      }]
    }
  };

  const weaponsChart = new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: options
  });
}
