import { Document, Schema, model } from 'mongoose'

interface Prices {
  cost: number
  nominal: number
}

export interface ITopUpNominal extends Document {
  for: string
  prices: Array<Prices>
}

const TopUpNominalSchema = new Schema(
  {
    for: { type: String, required: true },
    prices: { type: Array, required: true },
  },
  { collection: 'item_top_up_nominals' }
)

export default model<ITopUpNominal>('TopUpNominal', TopUpNominalSchema)
