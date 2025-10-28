import { Context } from 'koa'
import Category from '@/models/m_item_categories'

export const getCategories = async (ctx: Context) => {
  try {
    const categories = await Category.find()

    ctx.status = 200
    ctx.body = categories
  } catch (error) {
    ctx.status = 500
    console.error(error)
  }
}
