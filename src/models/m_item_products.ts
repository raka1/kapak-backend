import { Document, Schema, model } from 'mongoose'

export interface IProduct extends Document {
  name: string
  slug: string
  variants: Array<{
    name: string
    price: number
    stock: number
  }>
  description: string
  images: Array<Buffer>
  category: Schema.Types.ObjectId
  seller: Schema.Types.ObjectId
}

const VariantSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
  },
  { _id: false }
)

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    variants: { type: [VariantSchema], required: true },
    description: { type: String, required: true },
    images: { type: [Buffer], required: true },
    category: { type: Schema.Types.ObjectId, ref: 'item_categories', required: true },
    seller: { type: Schema.Types.ObjectId, ref: 'auth_users', required: true },
  },
  { collection: 'item_products', timestamps: true }
)

ProductSchema.index({ seller: 1, slug: 1 }, { unique: true })

export default model<IProduct>('Product', ProductSchema)
