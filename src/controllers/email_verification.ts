import { Context } from 'koa'
import { Resend } from 'resend';
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
    const resend = new Resend(process.env.RESEND_API_KEY as string);


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

    const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="text-align: center; padding-bottom: 20px;">
            <h2 style="margin: 0; color: #212529; font-size: 22px; letter-spacing: 0.5px;">Kapak</h2>
          </td>
        </tr>
        <tr>
          <td style="background-color: #ffffff; padding: 30px; border-radius: 6px; border: 1px solid #e9ecef; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 16px; line-height: 1.5; color: #6c757d;">
              Halo,
            </p>
            <p style="margin-top: 0; margin-bottom: 24px; font-size: 15px; line-height: 1.5; color: #6c757d;">
              Use the verification code below to continue the registration or authentication process for your account:
            </p>

            <div style="text-align: center; background-color: #f8f9fa; border: 1px dashed #ced4da; padding: 15px; border-radius: 6px; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1a237e; font-family: monospace;">${gen}</span>
            </div>

            <p style="margin-top: 0; margin-bottom: 0; font-size: 13px; line-height: 1.5; color: #6c757d; text-align: center;">
              *This code is valid for 30 minutes. Do not share this code with anyone for your account security.
            </p>
          </td>
        </tr>
        <tr>
          <td style="text-align: center; padding-top: 20px;">
            <p style="margin: 0; font-size: 12px; color: #6c757d;">
              &copy; ${new Date().getFullYear()} Kapak, Powered by Rondeletia. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </div>
    `
 
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL as string,
      to: email,
      subject: `[Kapak] Your Account Verification Code - ${gen}`,
      html: htmlContent,
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
