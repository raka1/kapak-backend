
import dotenv from 'dotenv'

dotenv.config()

import mongoose from 'mongoose'
import passport from 'koa-passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as FacebookStrategy } from 'passport-facebook'
import Koa from 'koa'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import ratelimit from 'koa-ratelimit'
import Redis from 'ioredis'
import apiRouter from '@/routes/api'

const PORT = process.env.PORT as string || '3000'
const MONGO_URI = process.env.MONGO_URI as string

const app = new Koa()
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD || undefined,
})

// Middleware
app.use(bodyParser())
app.use(passport.initialize())
app.use(
  cors({
    origin: process.env.FRONT_END,
    allowMethods: ['GET', 'POST'],
  })
)

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

const rateLimiter = ratelimit({
  driver: 'redis',
  db: redis,
  duration: 60000,
  errorMessage: 'Too many requests, please try again later.',
  id: (ctx) => ctx.ip,
  max: 60,
})

// Rate Limiter
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/api/v1')) {
    return rateLimiter(ctx, next)
  }

  await next()
})

// Router
app.use(apiRouter.routes()).use(apiRouter.allowedMethods())

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
