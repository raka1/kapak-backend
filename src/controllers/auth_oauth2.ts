import { Context } from 'koa'
import passport from 'koa-passport'
import { generateUniqueUUID, setToken } from '@/controllers/auth_users'
import User, { IUser } from '@/models/m_auth_users'

async function callback(ctx: Context, id: 'facebook_id' | 'google_id') {
  try {
    const rawData = ctx.state.user
    const data = <IUser>{
      [id]: rawData.id,
      first_name: rawData.name.givenName,
      last_name: rawData.name.familyName,
      email: rawData.emails[0].value,
      status: 'active',
    }

    const user = await User.findOne({ [id]: data[id] })
    const send = { response: 'SUCCESS', body: '' }

    if (user) send.body = user.username
    else {
      let existingEmail: IUser | null

      if ((existingEmail = await User.findOne({ email: data.email }))) {
        let methods: Array<string> = []

        if (existingEmail.password) methods.push('Native Login')
        if (existingEmail.google_id) methods.push('Google')
        if (existingEmail.facebook_id) methods.push('Facebook')

        const send = { response: 'CONFLICT', body: methods }

        ctx.status = 409
        ctx.body = `<script>
          window.opener.postMessage(${JSON.stringify(send)}, '${process.env.FRONT_END}')
          window.close()
        </script>`
        return
      }

      const userGet = `${data.email.split('@')[0]}_${await generateUniqueUUID(data.email)}`
      const user = await User.create({
        [id]: data[id],
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        username: userGet,
        status: data.status,
      })

      send.body = user.username
    }

    setToken(ctx, send.body)

    ctx.status = 200
    ctx.body = `<script>
      window.opener.postMessage(${JSON.stringify(send)}, '${process.env.FRONT_END}')
      window.close()
    </script>`
  } catch (error) {
    console.error(error)

    ctx.status = 500
    ctx.body = { response: 'SERVER_ERROR' }
  }
}

export const facebookOAuth2 = passport.authenticate('facebook', {
  scope: ['email', 'public_profile'],
  session: false,
})
export const facebookOAuth2Callback = passport.authenticate('facebook', {
  failureRedirect: '/login',
  session: false,
})
export const facebookOAuth2CallbackCallback = async (ctx: Context) =>
  await callback(ctx, 'facebook_id')

export const googleOAuth2 = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
})
export const googleOAuth2Callback = passport.authenticate('google', {
  failureRedirect: '/login',
  session: false,
})
export const googleOAuth2CallbackCallback = async (ctx: Context) => await callback(ctx, 'google_id')
