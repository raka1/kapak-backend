import { Context } from 'koa'
import AutoComplete from '@/models/m_item_autocompletes'

export const getAutoCompletes = async (ctx: Context) => {
  try {
    const autoCompletes = await AutoComplete.find()

    ctx.status = 200
    ctx.body = autoCompletes
  } catch (error) {
    ctx.status = 500
    console.error(error)
  }
}
