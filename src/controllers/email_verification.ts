import { Context } from 'koa'
import formData from 'form-data'
import Mailgun from 'mailgun.js'
import Verif from '@/models/m_auth_verifs'

export const emailVerification = async (ctx: Context) => {
  try {
    const { email, code } = ctx.request.body as {
      email: string
      code: string
    }
    const now = Math.floor(new Date().getTime() / 1000)
    const verif = await Verif.findOne({ email: email, code: code, exp: { $gte: now } })

    if (verif) {
      ctx.status = 200
      ctx.body = { response: 'SUCCESS' }
      await Verif.deleteOne({ email: email, code: code })
    } else {
      ctx.status = 400
      ctx.body = { response: 'INVALID_VERIFICATION_CODE' }
    }
  } catch (error) {
    console.error(error)

    ctx.status = 500
    ctx.body = { response: 'SERVER_ERROR' }
  }
}

export const sendEmail = async (ctx: Context) => {
  try {
    function generateRandomNumbers() {
      let rand = ''
      for (let i = 0; i < 6; i++) {
        rand += Math.floor(Math.random() * 10)
      }
      return rand
    }

    const gen = generateRandomNumbers()
    const { email } = ctx.request.body as {
      email: string
    }
    const mailgun = new Mailgun(formData)
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY as string,
    })

    const holdOn = await Verif.findOne({
      email: email,
      resend: { $gt: Date.now() / 1000 },
    })

    if (holdOn) {
      ctx.status = 429
      ctx.body = {
        response: 'TOO_MANY_REQUESTS',
        time: Math.ceil(holdOn.resend - Date.now() / 1000),
      }
      return
    }

    await mg.messages.create(process.env.MAILGUN_DOMAIN as string, {
      from: `${process.env.USER_EMAIL} <${process.env.EMAIL}>`,
      to: email,
      subject: 'Code',
      html: `<h1>${gen}</h1>`,
    })

    const now = new Date()
    const expirationTime = new Date(now.getTime() + 30 * 60 * 1000)
    const expEpoch = Math.floor(expirationTime.getTime() / 1000)
    const resendTime = new Date(now.getTime() + 30 * 1000)
    const resendEpoch = Math.floor(resendTime.getTime() / 1000)

    await Verif.updateOne(
      {
        email: email,
      },
      {
        $set: {
          email: email,
          code: gen,
          exp: expEpoch,
          resend: resendEpoch,
        },
        $inc: {
          __v: 1,
        },
      },
      { upsert: true }
    )

    ctx.status = 200
    ctx.body = { response: 'SUCCESS' }
  } catch (error) {
    console.error(error)

    ctx.status = 500
    ctx.body = { response: 'SERVER_ERROR' }
  }
}
