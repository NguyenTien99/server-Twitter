import { Request } from 'express'
import path from 'path'
import sharp from 'sharp'
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
import {
  getFiles,
  getNameFromFullName,
  handleUploadImages,
  handleUploadSingleImage,
  handleUploadVideo
} from '~/utils/file'
import fs from 'fs'
import fsPromise from 'fs/promises'
import { isProduction } from '~/utils/config'
import { config } from 'dotenv'
import { EncodingStatus, MediaType } from '~/constants/enums'
import { Media } from '~/models/Other'
import { encodeHLSWithMultipleVideoStreams } from '~/utils/video'
import databaseService from './database.services'
import VideoStatus from '~/models/schemas/VideoStatus.schema'
import { uploadFileToS3 } from '~/utils/s3'
// import mime from 'mime'
import { rimrafSync } from 'rimraf'

config()

class Queue {
  items: string[]
  encoding: boolean
  constructor() {
    this.items = []
    this.encoding = false
  }

  async enqueue(item: string) {
    this.items.push(item)
    const idName = getNameFromFullName(item.split('\\').pop() as string)
    await databaseService.videoStatus.insertOne(
      new VideoStatus({
        name: idName,
        status: EncodingStatus.Pending
      })
    )
    this.processEncode()
  }
  async processEncode() {
    const mime = (await import('mime')).default

    if (this.encoding) return
    if (this.items.length > 0) {
      this.encoding = true
      const videoPath = this.items[0]

      const idName = getNameFromFullName(videoPath.split('\\').pop() as string)

      await databaseService.videoStatus.updateOne(
        {
          name: idName
        },
        {
          $set: {
            status: EncodingStatus.Processing
          },
          $currentDate: {
            updated_at: true
          }
        }
      )
      try {
        await encodeHLSWithMultipleVideoStreams(videoPath)
        this.items.shift()
        await fsPromise.unlink(videoPath)
        const files = getFiles(path.resolve(UPLOAD_VIDEO_DIR, idName))
        await Promise.all(
          files.map((filepath) => {
            const filename = ('videos-hls' + filepath.replace(path.resolve(UPLOAD_VIDEO_DIR), '')).replace('\\', '/')
            return uploadFileToS3({
              filename,
              filepath,
              contentType: mime.getType(filepath) as string
            })
          })
        )
        // await Promise.all([fsPromise.unlink(videoPath), fsPromise.unlink(path.resolve(UPLOAD_VIDEO_DIR, idName))])
        rimrafSync(path.resolve(UPLOAD_VIDEO_DIR, idName))
        await databaseService.videoStatus.updateOne(
          {
            name: idName
          },
          {
            $set: {
              status: EncodingStatus.Success
            },
            $currentDate: {
              updated_at: true
            }
          }
        )
      } catch (error) {
        await databaseService.videoStatus
          .updateOne(
            {
              name: idName
            },
            {
              $set: {
                status: EncodingStatus.Failed
              },
              $currentDate: {
                updated_at: true
              }
            }
          )
          .catch((err) => {
            console.log('Update video status failed', err)
          })
        console.log('Error', error)
      }
      this.encoding = false
      this.processEncode()
    } else {
      console.log('Encode video empty')
    }
  }
}

const queue = new Queue()

class MediaService {
  async handleUploadSingleImage(req: Request) {
    const mime = (await import('mime')).default

    const file = await handleUploadSingleImage(req)
    const newName = getNameFromFullName(file.newFilename)
    const newFullFileName = `${newName}.jpg`

    const newPath = path.resolve(UPLOAD_IMAGE_DIR, `${newFullFileName}`)
    sharp.cache(false)
    await sharp(file.filepath).jpeg().toFile(newPath)
    const s3 = await uploadFileToS3({
      filename: 'images/' + newFullFileName,
      filepath: newPath,
      contentType: mime.getType(newPath) as string
    })

    // const filePath = file.filepath.replace(/\\/g, '/')

    await Promise.all([fsPromise.unlink(file.filepath), fsPromise.unlink(newPath)])

    return {
      url: s3.Location,
      type: MediaType.Image
    }
    // return {
    //   url: isProduction
    //     ? `${process.env.HOST}/static/image/${newFullFileName}`
    //     : `http://localhost:${process.env.PORT}/static/image/${newFullFileName}`,
    //   type: MediaType.Image
    // }
  }

  async handleUploadImages(req: Request) {
    const mime = (await import('mime')).default

    const files = await handleUploadImages(req)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const newName = getNameFromFullName(file.newFilename)
        const newFullFileName = `${newName}.jpg`
        const newPath = path.resolve(UPLOAD_IMAGE_DIR, newFullFileName)

        sharp.cache(false)
        await sharp(file.filepath).jpeg().toFile(newPath)
        const s3 = await uploadFileToS3({
          filename: 'images/' + newFullFileName,
          filepath: newPath,
          contentType: mime.getType(newPath) as string
        })
        // fs.unlinkSync(file.filepath)

        return {
          url: s3.Location as string,
          type: MediaType.Image
        }

        // return {
        //   url: isProduction
        //     ? `${process.env.HOST}/static/image/${newFullFileName}`
        //     : `http://localhost:${process.env.PORT}/static/image/${newFullFileName}`,
        //   type: MediaType.Image
        // }
      })
    )
    return result
  }

  async handleUploadVideo(req: Request) {
    const mime = (await import('mime')).default

    const files = await handleUploadVideo(req)
    // const { newFilename } = files[0]

    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const s3 = await uploadFileToS3({
          filename: 'videos/' + file.newFilename,
          filepath: file.filepath,
          contentType: mime.getType(file.filepath) as string
        })
        fsPromise.unlink(file.filepath)
        return {
          url: s3.Location as string,
          type: MediaType.Video
        }
        // return {
        //   url: isProduction
        //     ? `${process.env.HOST}/static/video/${file.newFilename}`
        //     : `http://localhost:${process.env.PORT}/static/video/${file.newFilename}`,
        //   type: MediaType.Video
        // }
      })
    )
    return result
  }

  async handleUploadVideoHLS(req: Request) {
    const files = await handleUploadVideo(req)
    // const { newFilename } = files[0]

    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        // await encodeHLSWithMultipleVideoStreams(file.filepath)
        const newName = getNameFromFullName(file.newFilename)
        // await fsPromise.unlink(file.filepath)

        queue.enqueue(file.filepath)
        return {
          url: isProduction
            ? `${process.env.HOST}/static/video-hls/${newName}/master.m3u8`
            : `http://localhost:${process.env.PORT}/static/video-hls/${newName}/master.m3u8`,
          type: MediaType.HLS
        }
      })
    )
    return result
  }

  async getVideoStatus(id: string) {
    const data = await databaseService.videoStatus.findOne({ name: id })
    return data
  }
}

const mediaService = new MediaService()

export default mediaService
