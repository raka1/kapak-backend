import { Document, Schema, model } from 'mongoose'

export interface IUser extends Document {
  first_name: string
  last_name?: string
  email: string
  phone_number?: string
  username: string
  password?: string
  google_id?: string
  facebook_id?: string
  status: 'active' | 'inactive' | 'banned'
  cart?: {
    items: Array<{
      product: Schema.Types.ObjectId
      variant: number
      quantity: number
      seller: Schema.Types.ObjectId
      checked: boolean
    }>
  }
  deleted_at?: Date
}

const UserSchema: Schema = new Schema(
  {
    first_name: { type: String, required: true },
    last_name: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone_number: { type: String },
    username: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    google_id: { type: String, unique: true, sparse: true },
    facebook_id: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      required: true,
      enum: ['active', 'inactive', 'banned'],
      default: 'active',
    },
    deleted_at: { type: Date },
    cart: {
      items: [
        {
          product: { type: Schema.Types.ObjectId, ref: 'item_products', required: true },
          variant: { type: Number, required: true },
          quantity: { type: Number, required: true, min: 1 },
          seller: { type: Schema.Types.ObjectId, ref: 'auth_users', required: true },
          checked: { type: Boolean, required: true },
        },
      ],
    },
  },
  { collection: 'auth_users', timestamps: true }
)

export default model<IUser>('User', UserSchema)
