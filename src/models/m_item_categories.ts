import { Document, Schema, model } from 'mongoose'

export interface ICategory extends Document {
  name: string
}

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
  },
  { collection: 'item_categories' }
)

export default model<ICategory>('Category', CategorySchema)
