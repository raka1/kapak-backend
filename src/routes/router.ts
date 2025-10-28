import Router from 'koa-router'
import {
  autoLogin,
  login,
  checkEmail,
  createUser,
  logout,
  deleteUser,
} from '@/controllers/auth_users'
import {
  facebookOAuth2,
  facebookOAuth2Callback,
  facebookOAuth2CallbackCallback,
  googleOAuth2,
  googleOAuth2Callback,
  googleOAuth2CallbackCallback,
} from '@/controllers/auth_oauth2'
import { getBanners } from '@/controllers/item_banners'
import { getProducts, getProduct } from '@/controllers/item_products'
import { getProviderPrefixes } from '@/controllers/item_provider_prefixes'
import { getTopUpNominals } from '@/controllers/item_top_up_nominals'
import { sendEmail, emailVerification } from '@/controllers/email_verification'
import {
  getCart,
  addItemToCart,
  updateQuantityOnCart,
  updateCheckOnCart,
  deleteItemsOnCart,
} from '@/controllers/cart_management'
import { getAutoCompletes } from '@/controllers/item_autocompletes'
import { getCategories } from '@/controllers/item_categories'

const router = new Router()

// auth
router.get('/auth/auto_login', autoLogin)
router.post('/auth/login', login)
router.post('/auth/create_user', createUser)
router.post('/auth/logout', logout)
router.delete('/auth/delete_user', deleteUser)

// oauth2
router.get('/oauth2/facebook', facebookOAuth2)
router.get('/oauth2/facebook/callback', facebookOAuth2Callback, facebookOAuth2CallbackCallback)
router.get('/oauth2/google', googleOAuth2)
router.get('/oauth2/google/callback', googleOAuth2Callback, googleOAuth2CallbackCallback)

// cart
router.get('/cart/:user', getCart)
router.post('/cart/:user/items', addItemToCart)
router.put('/cart/:user/items/:product/:variant', updateQuantityOnCart)
router.put('/cart/:user/items/check', updateCheckOnCart)
router.delete('/cart/:user/items', deleteItemsOnCart)

// item
router.get('/item/banners', getBanners)
router.get('/item/categories', getCategories)
router.get('/item/products', getProducts)
router.get('/item/product/:user/:slug', getProduct)
router.get('/item/provider_prefixes', getProviderPrefixes)
router.get('/item/top_up_nominals/:id', getTopUpNominals)
router.get('/item/autocompletes', getAutoCompletes)

// email
router.post('/email/send_verification', sendEmail)
router.post('/email/check_code', emailVerification)
router.post('/email/check_email', checkEmail)

export default router
