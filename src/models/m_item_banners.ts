import { Document, Schema, model } from 'mongoose'

export interface IBanner extends Document {
  name: string
  image: Buffer
  status: boolean
}

const BannerSchema = new Schema(
  {
    name: { type: String, required: true },
    image: { type: Buffer, required: true },
    status: { type: Boolean, required: true },
  },
  { collection: 'item_banners' }
)

export default model<IBanner>('Banner', BannerSchema)
