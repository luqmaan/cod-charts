function loadJson(path, callback) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.overrideMimeType("application/json");
    req.open('GET', path, true);
    req.onreadystatechange = function () {
      if (req.readyState == 4 && req.status == "200") {
        resolve(JSON.parse(req.responseText));
      }
    }
    req.send(null);
  });
}

loadJson('/data/weapons.json')
.then((res) => {
  const weapons = window.weapons = _.chain(res)
    .filter(w => w["More..."] !== "")
    .value();

  console.log('res', weapons, weapons[0]);

  const ctx = document.querySelector('#weapons-chart');

  const data = {
    labels: [weapons.map(w => w['More...'])],
    datasets: [
      {
        label: "My First dataset",
        backgroundColor: "rgba(255,99,132,0.2)",
        borderColor: "rgba(255,99,132,1)",
        borderWidth: 1,
        hoverBackgroundColor: "rgba(255,99,132,0.4)",
        hoverBorderColor: "rgba(255,99,132,1)",
        data: weapons.map(w => w.Damage),
      }
    ]
  };

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

});
