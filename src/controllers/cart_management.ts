import { Context } from 'koa'
import User from '@/models/m_auth_users'
import Product from '@/models/m_item_products'
import { Types, startSession } from 'mongoose'

export const getCart = async (ctx: Context) => {
  try {
    const username = ctx.params.user

    const user = await User.findOne({ username })
      .populate({
        path: 'cart.items.seller',
        select: 'username first_name last_name',
        model: 'User',
      })
      .populate({
        path: 'cart.items.product',
        select: 'name slug images variants',
        model: 'Product',
      })
      .select({
        'cart.items.product': 1,
        'cart.items.variant': 1,
        'cart.items.quantity': 1,
        'cart.items.seller': 1,
        'cart.items.checked': 1,
      })
      .lean()

    if (!user) {
      ctx.status = 404
      ctx.body = { response: 'USER_NOT_FOUND' }
      return
    }

    const items = user?.cart?.items

    let groupedItems = {} as { [key: string]: any }
    let total_all_quantity = 0
    let carted = []
    let select_all = true

    if (items) {
      groupedItems = items.reduce((acc, item) => {
        if (!acc[(item.seller as any)._id]) {
          acc[(item.seller as any)._id] = {
            seller: { ...item.seller, checked: true },
            items: [],
            total_quantity: 0,
          }
        }

        const images = (item.product as any)?.images
        const productWithBase64 = {
          ...item.product,
          image: Array.isArray(images) && images[0] ? images[0].toString('base64') : null,
          images: undefined,
          variants: undefined,
        }

        acc[(item.seller as any)._id].items.push({
          product: productWithBase64,
          variant: (item.product as any)?.variants[item.variant],
          variant_index: item.variant,
          quantity: item.quantity,
          checked: item.checked,
        })

        if (!item.checked && acc[(item.seller as any)._id].seller.checked) {
          acc[(item.seller as any)._id].seller.checked = false
          if (select_all) select_all = false
        }

        acc[(item.seller as any)._id].total_quantity += item.quantity
        total_all_quantity += item.quantity

        return acc
      }, {} as { [key: string]: any })

      carted = Object.values(groupedItems)
    }

    ctx.status = 200
    ctx.body = {
      response: 'CART_FETCHED',
      body: { cart: carted, total_all_quantity, select_all },
    }
  } catch (error) {
    console.error(error)

    ctx.status = 500
    ctx.body = { response: 'SERVER_ERROR' }
  }
}

export const addItemToCart = async (ctx: Context) => {
  const session = await startSession()
  session.startTransaction()

  try {
    const username = ctx.params.user
    const { product, variant, quantity, seller } = ctx.request.body as {
      product: string
      variant: number
      quantity: number
      seller: string
    }

    if (
      product === undefined ||
      variant === undefined ||
      quantity === undefined ||
      seller === undefined
    ) {
      await session.abortTransaction()

      ctx.status = 400
      ctx.body = { response: 'PRODUCT_VARIANT_QUANTITY_SELLER_REQUIRED' }
      return
    }

    const user = await User.findOne({ username }).session(session)
    if (!user) {
      await session.abortTransaction()

      ctx.status = 404
      ctx.body = { response: 'USER_NOT_FOUND' }
      return
    }

    let itemIndex = user.cart?.items?.findIndex(
      (item) => item.product.toString() === product && item.variant === Number(variant)
    )

    if (!user.cart || !Array.isArray(user.cart.items) || itemIndex === undefined) {
      await session.abortTransaction()

      ctx.status = 404
      ctx.body = { response: 'ITEM_NOT_FOUND_ON_CART' }
      return
    }

    if (itemIndex === -1) {
      user.cart.items.push({
        product: Types.ObjectId.createFromHexString(product) as any,
        variant,
        quantity: 0,
        seller: Types.ObjectId.createFromHexString(seller) as any,
        checked: true,
      })

      itemIndex = user.cart?.items?.findIndex(
        (item) => item.product.toString() === product && item.variant === Number(variant)
      )
    }

    const newQuantity = user.cart.items[itemIndex].quantity + quantity

    const dbProduct = await Product.findOne({ _id: product })
    const stock = dbProduct?.variants[variant]?.stock

    if (stock && newQuantity > stock) {
      await session.abortTransaction()

      ctx.status = 400
      ctx.body = {
        response: 'QUANTITY_EXCEEDS_STOCK',
        body: { quantity: user.cart.items[itemIndex].quantity },
      }
      return
    }

    user.cart.items[itemIndex].quantity = newQuantity
    await user.save({ session })
    await session.commitTransaction()

    ctx.status = 200
    ctx.body = { response: 'ITEM_ADDED_TO_CART' }
  } catch (error) {
    await session.abortTransaction()
    console.error(error)

    ctx.status = 500
    ctx.body = { response: 'SERVER_ERROR' }
  } finally {
    session.endSession()
  }
}

export const updateQuantityOnCart = async (ctx: Context) => {
  const session = await startSession()
  session.startTransaction()

  try {
    const username = ctx.params.user
    const { product, variant } = ctx.params
    const { action, quantity } = ctx.request.body as {
      action?: 'increase' | 'decrease'
      quantity?: number
    }

    if (action === undefined && quantity === undefined) {
      await session.abortTransaction()

      ctx.status = 400
      ctx.body = { response: 'ACTION_OR_QUANTITY_REQUIRED' }
      return
    }

    const user = await User.findOne({ username }).session(session)
    if (!user) {
      await session.abortTransaction()

      ctx.status = 404
      ctx.body = { response: 'USER_NOT_FOUND' }
      return
    }

    const itemIndex = user.cart?.items?.findIndex(
      (item) => item.product.toString() === product && item.variant === Number(variant)
    )

    if (
      !user.cart ||
      !Array.isArray(user.cart.items) ||
      itemIndex === undefined ||
      itemIndex === -1
    ) {
      await session.abortTransaction()

      ctx.status = 404
      ctx.body = { response: 'ITEM_NOT_FOUND_ON_CART' }
      return
    }

    let newQuantity = user.cart.items[itemIndex].quantity

    const dbProduct = await Product.findOne({ _id: product })
    const stock = dbProduct?.variants[variant]?.stock

    if (action) {
      newQuantity += action === 'increase' ? 1 : -1
    } else if (quantity !== undefined) {
      newQuantity = quantity
    }

    if (newQuantity <= 0) {
      user.cart.items.splice(itemIndex, 1)

      if (user.cart.items.length === 0) {
        user.cart = undefined
      }

      await user.save({ session })
      await session.commitTransaction()

      ctx.status = 200
      ctx.body = { response: 'ITEM_DELETED_FROM_CART' }
      return
    }

    if (stock && newQuantity > stock) {
      await session.abortTransaction()

      ctx.status = 400
      ctx.body = { response: 'QUANTITY_EXCEEDS_STOCK' }
      return
    }

    user.cart.items[itemIndex].quantity = newQuantity
    await user.save({ session })
    await session.commitTransaction()

    ctx.status = 200
    ctx.body = { response: 'ITEM_UPDATED_ON_CART' }
  } catch (error) {
    await session.abortTransaction()
    console.error(error)

    ctx.status = 500
    ctx.body = { response: 'SERVER_ERROR' }
  } finally {
    session.endSession()
  }
}

export const updateCheckOnCart = async (ctx: Context) => {
  try {
    const { check, value } = ctx.request.body as {
      check: boolean
      value:
        | {
            product?: string
            variant?: number
            seller?: string
          }
        | 'all'
    }
    const username = ctx.params.user

    let user

    if (value === 'all') {
      user = await User.updateOne({ username }, { $set: { 'cart.items.$[].checked': check } })
    } else if (value.product && typeof value.variant === 'number') {
      user = await User.updateOne(
        { username },
        { $set: { 'cart.items.$[elem].checked': check } },
        { arrayFilters: [{ 'elem.product': value.product, 'elem.variant': value.variant }] }
      )
    } else if (value.seller) {
      user = await User.updateOne(
        { username },
        { $set: { 'cart.items.$[elem].checked': check } },
        { arrayFilters: [{ 'elem.seller': value.seller }] }
      )
    } else {
      ctx.status = 400
      ctx.body = { response: 'INVALID_REQUEST' }
      return
    }

    if (user.matchedCount === 0) {
      ctx.status = 404
      ctx.body = { response: 'USER_OR_ITEMS_NOT_FOUND' }
      return
    }

    ctx.status = 200
    ctx.body = { response: 'ITEMS_CHECKED_UPDATED' }
  } catch (error) {
    console.error(error)

    ctx.status = 500
    ctx.body = { response: 'SERVER_ERROR' }
  }
}

export const deleteItemsOnCart = async (ctx: Context) => {
  try {
    const username = ctx.params.user
    const items = ctx.request.body as Array<{
      product: string
      variant: number
    }>

    if (!Array.isArray(items) || items.length === 0) {
      ctx.status = 400
      ctx.body = { response: 'ITEMS_REQUIRED' }
      return
    }

    const user = await User.updateOne(
      {
        username,
        'cart.items.product': { $in: items.map((item) => item.product) },
        'cart.items.variant': { $in: items.map((item) => item.variant) },
      },
      {
        $pull: {
          'cart.items': {
            $or: items.map((item) => ({ product: item.product, variant: item.variant })),
          },
        },
      }
    )

    if (user.matchedCount === 0) {
      ctx.status = 404
      ctx.body = { response: 'ITEM_NOT_FOUND_ON_CART' }
      return
    }

    ctx.status = 200
    ctx.body = { response: 'ITEMS_DELETED_FROM_CART' }
  } catch (error) {
    console.error(error)

    ctx.status = 500
    ctx.body = { response: 'SERVER_ERROR' }
  }
}
