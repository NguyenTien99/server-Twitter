import { Router } from 'express'
import {
  uploadImagesController,
  uploadSingleImageController,
  uploadVideoController,
  uploadVideoHLSController,
  videoStatusController
} from '~/controllers/medias.controllers'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const mediaRoute = Router()

mediaRoute.post('/upload-image', wrapRequestHandler(uploadSingleImageController))

mediaRoute.post('/upload-images', wrapRequestHandler(uploadImagesController))

mediaRoute.post('/upload-video', wrapRequestHandler(uploadVideoController))

mediaRoute.post('/upload-video-hls', wrapRequestHandler(uploadVideoHLSController))

mediaRoute.get('/video-status/:id', wrapRequestHandler(videoStatusController))

export default mediaRoute
