const https = require('https');
const fs = require('fs');

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 308) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url} - Status Code: ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    }).on('error', reject);
  });
};

fs.mkdirSync('./public/planets', { recursive: true });

Promise.all([
  download('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Jupiter_Map_-_Voyager_and_Cassini.jpg/2048px-Jupiter_Map_-_Voyager_and_Cassini.jpg', './public/planets/jupiter.jpg'),
  download('https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Mars_equirectangular_projection.jpg/2048px-Mars_equirectangular_projection.jpg', './public/planets/mars.jpg'),
  download('https://upload.wikimedia.org/wikipedia/commons/1/1e/Neptune_Voyager_2_equirectangular_map.jpg', './public/planets/neptune.jpg')
]).then(() => {
  console.log('Successfully downloaded high resolution planet textures.');
}).catch((err) => {
  console.error('Download failed:', err);
});
