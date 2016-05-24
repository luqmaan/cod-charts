function loadJson(path, callback) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.overrideMimeType('application/json');
    req.open('GET', path, true);
    req.onreadystatechange = function () {
      if (req.readyState == 4 && req.status == '200') {
        resolve(JSON.parse(req.responseText));
      }
    }
    req.send(null);
  });
}

const promiseWeapons = loadJson('/data/weapons.json')
  .then((res) => {
    const weaponsByName = window.weaponsByName = _.chain(res)
      .map(w => _.set(w, 'name', w['More...']))
      .filter(w => w['name'] !== '')
      .keyBy('name')
      .value();
    return weaponsByName;
  })

const promiseWeaponGroups = loadJson('/data/weapon_groups.json')
  .then((res) => {
    const weaponGroups = window.weaponGroups = res;
    return weaponGroups;
  });

Promise.all([
  promiseWeapons,
  promiseWeaponGroups,
])
.then(() => {
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
        data: weapons.map(w => w.Damage),
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
