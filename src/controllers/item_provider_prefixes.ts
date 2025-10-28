import { Context } from 'koa'
import ProviderPrefix from '@/models/m_item_provider_prefixes'

export const getProviderPrefixes = async (ctx: Context) => {
  try {
    const providerPrefixes = await ProviderPrefix.aggregate([
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          prefixes: 1,
        },
      },
    ])

    ctx.status = 200
    ctx.body = providerPrefixes
  } catch (error) {
    ctx.status = 500
    console.error(error)
  }
}
