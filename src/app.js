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
    meters: units * 0.0254,
  };
}

function calculateSTK(weapon) {
  const damageKeys = ['damage', 'damage2', 'damage3', 'damage4', 'damage5', 'minDamage'];
  const rangeKeys = ['maxDamageRange', 'damageRange2', 'damageRange3', 'damageRange4', 'damageRange5', 'minDamageRange'];

  const shotsToKill = damageKeys.reduce((prev, damageKey, i) => {
    const rangeKey = rangeKeys[i];
    const stk = Math.ceil(100 / weapon[damageKey]);
    if (stk !== Infinity) {
      const data = {
        stk: stk,
        range: parseRangeUnits(weapon[rangeKey])
      };
      if (prev.length > 0) {
        if (stk === prev[prev.length - 1].stk) {
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

const promiseWeapons = new Promise((resolve, reject) => {
  d3.csv('/data/raw_weapons.csv')
  .row((data) => {
    data.name = data.WEAPONFILE.indexOf('dualoptic_') === 0 ? `${data.displayName} Varix` : data.displayName;
    data.stk = calculateSTK(data);
    return data;
  })
  .get((error, rows) => {
    if (error) {
      reject(error);
    }

    const weaponsByName = window.weaponsByName = _.keyBy(rows, 'WEAPONFILE');

    resolve(weaponsByName);
  });
});

const promiseWeaponGroups = loadJson('/data/weapon_groups.json')
.then((res) => {
  const weaponGroups = window.weaponGroups = res;
  return weaponGroups;
});

Promise.all([
  promiseWeapons,
  promiseWeaponGroups,
])
.then((args) => {
  const weaponsByName = args[0];
  const weaponGroups = args[1];

  const ars = window.ars = _.filter(weaponsByName, weapon => {
    return weaponGroups.ar.indexOf(weapon.name) !== -1 && weapon.WEAPONFILE.indexOf('_mp') !== -1;
  });

  ars.sort((weaponA, weaponB) => weaponA.stk[0].stk > weaponB.stk[0].stk);

  ars.map(weapon => {
    draw(
      `${weapon.name} Shots To Kill`,
      weapon.stk.map(stk => stk.stk),
      weapon.stk.map(stk => stk.range.meters)
    );
  });
})
.catch((err) => console.error(err));

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
        stacked: true,
        scaleLabel: {
          display: true,
          labelString: 'Distance (meters)',
        }
      }],
      yAxes: [{
      }]
    }
  };

  const weaponsChart = new Chart(ctx, {
    type: 'horizontalBar',
    data: chartData,
    options: options
  });
}
