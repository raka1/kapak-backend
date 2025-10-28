import { Context } from 'koa'
import bcrypt from 'bcrypt'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import User, { IUser } from '@/models/m_auth_users'

export const getUsers = async (ctx: Context) => {
  try {
    const users = await User.find()
    ctx.status = 200
    ctx.body = users
  } catch (error) {
    ctx.status = 500
    console.error(error)
  }
}

export const autoLogin = async (ctx: Context) => {
  ctx.set('Cache-Control', 'no-store, must-revalidate')
  try {
    const token = ctx.cookies.get('token')
    const decoded = jwt.verify(token as string, process.env.JWT_SECRET_KEY as string) as JwtPayload

    ctx.status = 200
    ctx.body = { response: 'SUCCESS', body: decoded.username }
  } catch (error) {
    ctx.status = 401
    ctx.body = { response: 'INVALID_TOKEN' }
  }
}

export const checkEmail = async (ctx: Context) => {
  try {
    const { email } = ctx.request.body as { email: string }

    const existingEmail = await User.findOne({ email: email.toLowerCase() })
    if (existingEmail) {
      ctx.status = 409
      ctx.body = { response: 'EMAIL_ALREADY_EXISTS' }
      return
    }

    ctx.status = 200
    ctx.body = { response: 'SUCCESS' }
  } catch (error) {
    ctx.status = 500
    ctx.body = { response: 'SERVER_ERROR' }
  }
}

export const setToken = (ctx: Context, username: string) => {
  const token = jwt.sign({ username: username }, process.env.JWT_SECRET_KEY as string, {
    expiresIn: '30d',
  })

  ctx.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'strict',
  })
}

export const login = async (ctx: Context) => {
  try {
    const { username, password } = ctx.request.body as {
      username: string
      password: string
    }
    let user = await User.findOne({ username: username.toLowerCase() })

    if (!user) user = await User.findOne({ email: username.toLowerCase() })

    if (!user) {
      ctx.status = 404
      ctx.body = { response: 'USER_NOT_FOUND' }
      return
    }

    if (!user.password) {
      let methods: Array<string> = []

      if (user.google_id) methods.push('Google')
      if (user.facebook_id) methods.push('Facebook')

      ctx.status = 409
      ctx.body = { response: 'CONFLICT', body: methods }
      return
    }

    if (!(await bcrypt.compare(password, user.password as string))) {
      ctx.status = 401
      ctx.body = { response: 'INVALID_PASSWORD' }
      return
    }

    if (user.status === 'inactive') {
      ctx.status = 403
      ctx.body = { response: 'USER_INACTIVE' }
      return
    }

    if (user.status === 'banned') {
      ctx.status = 403
      ctx.body = { response: 'USER_BANNED' }
      return
    }

    setToken(ctx, user.username)

    ctx.status = 200
    ctx.body = { response: 'SUCCESS', body: user.username }
  } catch (error) {
    console.error(error)
    ctx.status = 500
    ctx.body = { response: 'SERVER_ERROR' }
  }
}

export const generateUniqueUUID = async (email: string) => {
  let uuid = uuidv4()
  while (await User.findOne({ username: `${email.split('@')[0]}_${uuid.slice(0, 8)}` })) {
    uuid = uuidv4()
  }
  return uuid.slice(0, 8)
}

// sign up
export const createUser = async (ctx: Context) => {
  try {
    const { first_name, last_name, email, phone_number, password } = ctx.request.body as IUser

    const salt = 12
    const userGet = `${email.split('@')[0]}_${await generateUniqueUUID(email)}`

    if (!first_name || !email || !password) {
      ctx.status = 400
      ctx.body = { response: 'INCOMPLETE_FORM' }
      return
    }

    const existingEmail = await User.findOne({ email: email })
    if (existingEmail) {
      ctx.status = 409
      ctx.body = { response: 'USER_NOT_FOUND' }
      return
    }

    await User.create({
      first_name: first_name,
      last_name: last_name,
      email: email,
      phone_number: phone_number,
      username: userGet,
      password: await bcrypt.hash(password, salt),
      login_method: 'native',
      status: 'active',
    })

    ctx.status = 200
    ctx.body = { response: 'SUCCESS' }
  } catch (error) {
    console.error(error)

    ctx.status = 500
    ctx.body = { response: 'SERVER_ERROR' }
  }
}

// logout
export const logout = (ctx: Context) => {
  ctx.cookies.set('token', null, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    sameSite: 'strict',
  })

  ctx.status = 200
  ctx.body = { response: 'SUCCESS' }
}

export const deleteUser = async (ctx: Context) => {
  const { email, password } = ctx.request.body as IUser

  console.error(email.toLowerCase(), password)

  await User.deleteOne({ email: email.toLowerCase() })

  ctx.status = 200
  ctx.body = { response: 'SUCCESS' }
}
