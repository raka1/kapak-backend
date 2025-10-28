import mongoose from 'mongoose'
import passport from 'koa-passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as FacebookStrategy } from 'passport-facebook'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import router from 'src/routes/router'
import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT as string
const MONGO_URI = process.env.MONGO_URI as string

const app = new Koa()

// middleware
app.use(bodyParser())
app.use(passport.initialize())

const origin = process.env.FRONT_END as string

app.use(async (ctx, next) => {
  const referer = ctx.get('Referer')

  if ((!referer || !referer.startsWith(origin)) && process.env.NODE_ENV == 'production') {
    ctx.status = 403
    ctx.body = 'Forbidden: Invalid origin or referer'
    return
  }

  await next()
})

// DB connect
mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 50000,
  })
  .then(() => {
    console.log('Connected to MongoDB')
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err)
  })

// Facebook OAuth2
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
      callbackURL: process.env.BACK_END + 'api/oauth2/facebook/callback',
      profileFields: ['id', 'email', 'first_name', 'last_name'],
    },
    function (accessToken, refreshToken, profile, done) {
      return done(null, profile)
    }
  )
)

// Google OAuth2
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.BACK_END + 'api/oauth2/google/callback',
    },
    function (accessToken, refreshToken, profile, done) {
      return done(null, profile)
    }
  )
)

// router
app.use(router.routes()).use(router.allowedMethods())

app.listen(3000, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
