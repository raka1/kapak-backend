import { Document, Schema, model } from 'mongoose'

export interface IAutoComplete extends Document {
  keyword: string
  count: number
}

const AutoCompleteSchema = new Schema(
  {
    keyword: { type: String, required: true },
    count: { type: Number, required: true },
  },
  { collection: 'item_autocompletes' }
)

export default model<IAutoComplete>('AutoComplete', AutoCompleteSchema)
