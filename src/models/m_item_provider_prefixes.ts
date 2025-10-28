import { Document, Schema, model } from 'mongoose'

export interface IProviderPrefix extends Document {
  name: string
  image: Buffer
  prefixes: Array<string>
}

const ProviderPrefixSchema = new Schema(
  {
    name: { type: String, required: true },
    image: { type: Buffer, required: true },
    prefixes: { type: [String], required: true },
  },
  { collection: 'item_provider_prefixes' }
)

export default model<IProviderPrefix>('ProviderPrefix', ProviderPrefixSchema)
