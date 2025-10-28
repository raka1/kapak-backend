import { Context } from 'koa'
import Banner from '@/models/m_item_banners'

export const getBanners = async (ctx: Context) => {
  try {
    const banners = await Banner.aggregate([
      {
        $match: {
          status: true,
        },
      },
      {
        $project: {
          name: 1,
          image: 1,
          status: 1,
        },
      },
    ])

    ctx.status = 200
    ctx.body = banners
  } catch (error) {
    ctx.status = 500
    console.error(error)
  }
}
