import { NextFunction, Request, Response } from 'express'
import { TweetRequestBody } from '~/models/requests/Tweet.request'
import { ParamsDictionary } from 'express-serve-static-core'
import tweetService from '~/services/tweet.services'
import { body } from 'express-validator'
import { TokenPayload } from '~/models/requests/User.request'

export const createTweetController = async (
  request: Request<ParamsDictionary, any, TweetRequestBody>,
  response: Response,
  next: NextFunction
) => {
  const { user_id } = request.decode_authorization as TokenPayload
  const result = await tweetService.createTweet(user_id, request.body)
  response.json({
    message: 'Create tweet successfully',
    result
  })
}
