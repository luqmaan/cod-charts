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
  const cols = ['Max', '2', '3', '4', '5', 'Min'];
  const shotsToKill = [];
  cols.forEach((col) => {
    const stk = Math.ceil(100 / weapon[`Damage::${col}`]);
    if (stk !== Infinity) {
      shotsToKill.push({
        stk: stk,
        range: parseRangeUnits(weapon[`Range::${col}`])
      });
    }
  });
  return shotsToKill;
}

const promiseWeapons = new Promise((resolve, reject) => {
  d3.csv('/data/weapons.csv')
  .row((data) => {
    data.stk = calculateSTK(data);
    return data;
  })
  .get((error, rows) => {
    if (error) {
      reject(error);
    }
    window.rows = rows;
    const weaponsByName = window.weaponsByName = _.chain(rows)
    .filter(r => !!r.name)
    .keyBy('name')
    .value();

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
  const ar = weaponGroups.ar.map(name => weaponsByName[name]);

  ar.map(gun => {
    console.log(gun.name)
    draw(
      `${gun.name} Shots To Kill`,
      gun.stk.map(stk => stk.stk),
      gun.stk.map(stk => stk.range.meters)
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
        backgroundColor: 'rgba(255,99,132,0.2)',
        borderColor: 'rgba(255,99,132,1)',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(255,99,132,0.4)',
        hoverBorderColor: 'rgba(255,99,132,1)',
        data: data,
      },
    ]
  };

  const options = {
    scales: {
      xAxes: [{
        stacked: true
      }],
      yAxes: [{
        stacked: true,
      }]
    }
  };

  const weaponsChart = new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: options
  });
}
