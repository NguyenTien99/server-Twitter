import express from 'express'
import { validationResult, ValidationChain } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/src/middlewares/schema'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorEntity, ErrorWithStatus } from '~/models/Errors'
// can be reused by many routes

// sequential processing, stops running validations chain if the previous one fails.
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    await validation.run(req)

    const errors = validationResult(req)

    // Nếu không có lỗi
    if (errors.isEmpty()) {
      return next()
    }

    const errorsObject = errors.mapped()
    const errorsEntity = new ErrorEntity({ errors: {} })
    for (const key in errorsObject) {
      // Lặp vòng for cho Object
      // trả về lỗi không phải validate
      const { msg } = errorsObject[key]
      if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg)
      }

      errorsEntity.errors[key] = errorsObject[key]
    }

    next(errorsEntity)
  }
}
