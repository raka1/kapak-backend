import { Context } from 'koa'
import ProviderPrefix from '@/models/m_item_provider_prefixes'
import { Types } from 'mongoose'

export const getTopUpNominals = async (ctx: Context) => {
  try {
    const id = ctx.params.id
    const topUpNominals = await ProviderPrefix.aggregate([
      {
        $match: {
          _id: Types.ObjectId.createFromHexString(id),
        },
      },
      {
        $lookup: {
          from: 'item_top_up_nominals',
          localField: '_id',
          foreignField: 'for',
          as: 'price_details',
        },
      },
      {
        $unwind: '$price_details',
      },
      {
        $project: {
          prices: '$price_details.prices',
        },
      },
    ])

    ctx.status = 200
    ctx.body = topUpNominals[0]
  } catch (error) {
    ctx.status = 500
    console.error(error)
  }
}
