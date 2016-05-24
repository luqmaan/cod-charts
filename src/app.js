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

const promiseWeapons = new Promise((resolve, reject) => {
  d3.csv('/data/weapons.csv')
    .row((d) => {
      return _.chain(d)
        .set('name', d['More...'])
        .value();
    })
    .get((error, rows) => {
      if (error) {
        console.log(error)
        reject(error);
      }
      window.rows = rows;
      const weaponGroups = _.chain(rows)
        .filter(r => !!r.name)
        .keyBy('name')
        .value();
      resolve(weaponGroups);
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
  console.log(weaponsByName)
  draw(weaponGroups.ar.map(name => weaponsByName[name]))
});

function draw(weapons) {
  const ctx = document.querySelector('#weapons-chart');

  const data = {
    labels: weapons.map(w => w.name),
    datasets: [
      {
        label: 'My First dataset',
        backgroundColor: 'rgba(255,99,132,0.2)',
        borderColor: 'rgba(255,99,132,1)',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(255,99,132,0.4)',
        hoverBorderColor: 'rgba(255,99,132,1)',
        data: weapons.map(w => w['Damage::2']),
      }
    ]
  };

  console.log('data', data)

  const options = {
    scales: {
      xAxes: [{
        stacked: true
      }],
      yAxes: [{
        stacked: true
      }]
    }
  };

  const weaponsChart = new Chart(ctx, {
    type: 'bar',
    data: data,
    options: options
  });
}
