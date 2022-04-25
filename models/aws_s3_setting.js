const AWS = require('aws-sdk');

// 把上面新增完 儲存桶(Bucket) 拿到的那個檔案裡面的 Access Key ID 及 Secret Access Key 填上
const s3 = new AWS.S3({
  accessKeyId: 'AKIARTSWJBA6JMDALL3N',
  secretAccessKey: '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'
});

module.exports={
    "s3":s3
}