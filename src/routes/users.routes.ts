import { Router } from 'express'
import {
  verifyEmailController,
  loginController,
  logoutController,
  registerController,
  resendVerifyEmailController,
  forgotPasswordController,
  verifyForgotPasswordController,
  resetForgotPasswordController,
  getMeController,
  updateMeController,
  getProfileController,
  followController,
  unFollowController,
  refreshTokenController
} from '~/controllers/users.controllers'
import { filterMiddleware } from '~/middlewares/common.middlewares'
import {
  accessTokenValidator,
  emailVerifyTokenValidator,
  followValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  unfollowValidator,
  updateMeValidator,
  verifiedUserValidator,
  verifyForgotPasswordValidator
} from '~/middlewares/users.middlewares'
import { UpdateMeReqBody } from '~/models/requests/User.request'
import { wrapRequestHandler } from '~/utils/handlers'

const usersRouter = Router()

// body: { email: string, password: string }
usersRouter.post('/login', loginValidator, wrapRequestHandler(loginController))

// body: { name: string, email: string, password: string, confirm_password: string, date_of_birth: ISO8601 }
usersRouter.post('/register', registerValidator, wrapRequestHandler(registerController))

// Header: { Authorization: Bear <accessToken>}, body: { refresh_token }
usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(logoutController))

//  body: { refresh_token }
usersRouter.post('/refresh-token', refreshTokenValidator, wrapRequestHandler(refreshTokenController))

// Body: {email_verify_token: string}
usersRouter.post('/verify-email', emailVerifyTokenValidator, wrapRequestHandler(verifyEmailController))

// Header: { Authorization: Bear <accessToken>}
usersRouter.post('/resend-verify-email', accessTokenValidator, wrapRequestHandler(resendVerifyEmailController))

// Body: {email: string}
usersRouter.post('/forgot-password', forgotPasswordValidator, wrapRequestHandler(forgotPasswordController))

// Body: {forgot-password-token: string}
usersRouter.post(
  '/verify-forgot-password',
  verifyForgotPasswordValidator,
  wrapRequestHandler(verifyForgotPasswordController)
)

// Body: {forgot_password_token: string, password: string, confirm_password: string}
usersRouter.post('/reset-password', resetPasswordValidator, wrapRequestHandler(resetForgotPasswordController))

usersRouter.get('/me', accessTokenValidator, wrapRequestHandler(getMeController))

// Header: : { Authorization: Bear <accessToken>}, Body: UserSchema
usersRouter.patch(
  '/me',
  accessTokenValidator,
  verifiedUserValidator,
  updateMeValidator,
  filterMiddleware<UpdateMeReqBody>([
    'name',
    'date_of_birth',
    'bio',
    'location',
    'website',
    'username',
    'avatar',
    'cover_photo'
  ]),
  wrapRequestHandler(updateMeController)
)

// Get user profile
usersRouter.get('/:username', wrapRequestHandler(getProfileController))

// Post follow user
// Header: : { Authorization: Bear <accessToken>},
// Body: { follow_user_id: string}
usersRouter.post(
  '/follow',
  accessTokenValidator,
  verifiedUserValidator,
  followValidator,
  wrapRequestHandler(followController)
)

// Unfollow
usersRouter.delete(
  '/follow/:user_id',
  accessTokenValidator,
  verifiedUserValidator,
  unfollowValidator,
  wrapRequestHandler(unFollowController)
)

export default usersRouter
