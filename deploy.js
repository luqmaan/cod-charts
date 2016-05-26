var ghpages = require('gh-pages');
var path = require('path');

const options = {
  repo: 'https://' + process.env.GITHUB_TOKEN + '@github.com/codcharts/codcharts.git',
  user: {
    name: 'COD Charts',
    email: 'hi@codcharts.com',
  },
};

ghpages.publish(path.join(__dirname, 'src'), options, function (err) {
  if (err) {
    console.error(err);
  }
  else {
    console.log('Done');
  }
});
