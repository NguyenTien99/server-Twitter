import express from 'express'
import usersRouter from './routes/users.routes'
import mediaRoute from './routes/medias.routes'
import tweetsRouter from './routes/tweets.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middlewares'
import { initFolder } from './utils/file'
import { config } from 'dotenv'
import staticRouter from './routes/static.routes'
import { UPLOAD_VIDEO_DIR } from './constants/dir'
import cors from 'cors'

config()

databaseService.connect().then(() => {
  databaseService.indexUser()
  databaseService.indexRefreshTokens()
  databaseService.indexFollowers()
  databaseService.indexVideoStatus()
})
const app = express()
app.use(cors())

const port = process.env.PORT || 4000

initFolder()

app.use(express.json())

app.use('/users', usersRouter)
app.use('/medias', mediaRoute)
app.use('/static', staticRouter)
app.use('/tweets', tweetsRouter)

app.use('/static/video', express.static(UPLOAD_VIDEO_DIR))

app.use(defaultErrorHandler)

app.listen(port, () => {
  console.log(`Example app listen on port ${port}`)
})
