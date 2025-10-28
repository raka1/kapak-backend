import { Context } from 'koa'
import Product from '@/models/m_item_products'

export const getProducts = async (ctx: Context) => {
  try {
    const { q, np, xp, shop, skip, limit } = ctx.query
    let products

    if (q) {
      products = await Product.aggregate([
        {
          $match: {
            name: { $regex: q, $options: 'i' },
            ...(np && { 'variants.0.price': { $gte: parseInt(np as string) } }),
            ...(xp && { 'variants.0.price': { $lte: parseInt(xp as string) } }),
          },
        },
        {
          $lookup: {
            from: 'auth_users',
            localField: 'seller',
            foreignField: '_id',
            as: 'seller',
          },
        },
        {
          $unwind: '$seller',
        },
        {
          $project: {
            name: 1,
            slug: 1,
            price: { $arrayElemAt: ['$variants.price', 0] },
            images: { $arrayElemAt: ['$images', 0] },
            seller: '$seller.username',
          },
        },
        { $skip: skip ? parseInt(skip as string) : 0 },
        { $limit: limit ? parseInt(limit as string) : 30 },
      ])
    } else if (shop) {
      products = await Product.aggregate([
        {
          $lookup: {
            from: 'auth_users',
            localField: 'seller',
            foreignField: '_id',
            as: 'seller',
          },
        },
        {
          $unwind: '$seller',
        },
        {
          $match: {
            'seller.username': shop,
          },
        },
        {
          $project: {
            name: 1,
            slug: 1,
            price: { $arrayElemAt: ['$variants.price', 0] },
            images: { $arrayElemAt: ['$images', 0] },
            seller: '$seller.username',
          },
        },
        { $skip: skip ? parseInt(skip as string) : 0 },
        { $limit: limit ? parseInt(limit as string) : 30 },
      ])
    } else {
      products = await Product.aggregate([
        {
          $lookup: {
            from: 'auth_users',
            localField: 'seller',
            foreignField: '_id',
            as: 'seller',
          },
        },
        {
          $unwind: '$seller',
        },
        {
          $project: {
            name: 1,
            slug: 1,
            price: { $arrayElemAt: ['$variants.price', 0] },
            images: { $arrayElemAt: ['$images', 0] },
            seller: '$seller.username',
          },
        },
        { $skip: skip ? parseInt(skip as string) : 0 },
        { $limit: limit ? parseInt(limit as string) : 30 },
      ])
    }

    ctx.status = 200
    ctx.body = products
  } catch (error) {
    ctx.status = 500
    console.error(error)
  }
}

export const getProduct = async (ctx: Context) => {
  try {
    const seller = ctx.params.user
    const slug = ctx.params.slug

    const product = await Product.aggregate([
      {
        $match: {
          slug,
        },
      },
      {
        $lookup: {
          from: 'auth_users',
          localField: 'seller',
          foreignField: '_id',
          as: 'seller',
        },
      },
      {
        $unwind: '$seller',
      },
      {
        $match: {
          'seller.username': seller,
        },
      },
      {
        $project: {
          name: 1,
          variants: 1,
          description: 1,
          images: 1,
          category: 1,
          'seller._id': 1,
          'seller.username': 1,
          'seller.email': 1,
          'seller.first_name': 1,
          'seller.last_name': 1,
        },
      },
      {
        $limit: 1,
      },
    ])

    ctx.status = 200
    ctx.body = product[0]
  } catch (error) {
    ctx.status = 500
    console.error(error)
  }
}
