require('dotenv').config()
const S3 = require('aws-sdk/clients/s3')
const fs = require('fs')

const bucketname = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_KEY

// Access bucket
const s3 = new S3({
    region,
    accessKeyId,
    secretAccessKey
})

// Uploads file to s3 bucket
const uploadFile = file => {
    console.log(file)
    const fileStream = fs.createReadStream(file.path)
    console.log(fileStream)

    const uploadParams = {
        Bucket: bucketname,
        Body: fileStream,
        Key: `images/${file.originalname}`,
        ContentType: file.type
    }

    return s3.upload(uploadParams).promise()
}
exports.uploadFile = uploadFile

// Downloads file from s3
// const getFileStream  = async (fileKey) => {
//     const downloadParams = {
//         Key: fileKey,
//         Bucket: bucketname
//     }

//     return s3.getObject(downloadParams).createReadStream()
// }
// exports.getFileStream = getFileStream