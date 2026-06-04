import { Document, Schema, model } from 'mongoose'

export interface ICategory extends Document {
  name: string
  slug: string
  sub: string[]
}

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    sub: [{ type: String }],
  },
  { collection: 'item_categories' }
)

export default model<ICategory>('Category', CategorySchema)
