const S3 = require('aws-sdk/clients/s3');
const Jimp = require('jimp');
const { basename } = require('path');
const { s3AccessKey, s3Bucket, s3SecretAccessKey} = process.env;

module.exports.upload = (event, context) => {
  const img = event.Records[0];
  const absoluteName = img.s3.object.key;
  const filename = basename(absoluteName);

  if (absoluteName.includes('-original')) {
    return;
  }

  const s3 = new S3({
    accessKeyId: s3AccessKey,
    secretAccessKey: s3SecretAccessKey,
    params: {
      Bucket: s3Bucket,
    },
  });

  const rename = (name, sufix) => {
    const tmp = name.split('/');
    let [origin, ext] = tmp.pop().split('.');
    tmp.push(`${origin}${sufix}.${ext}`);
    return tmp.join('/');
  };

  const tmp = img => Jimp.read(img)
    .then(image => image.resize(100, 100).getBufferAsync(Jimp.AUTO))
    .then(buffer => s3.upload({
      Body: buffer,
      Key: `thumbnails/${filename}`,
    }).promise());

  return s3.getObject({ Key: absoluteName }).promise()
    .then(img => { return tmp(img.Body).then(() => img) })
    .then(img => s3.upload({
      Body: img.Body,
      Key: rename(absoluteName, '-original'),
    }).promise())
    .then(s3.deleteObject({ Key: absoluteName }).promise())
    .catch(err => console.log(err));
};

