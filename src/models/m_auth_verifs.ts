import { Document, Schema, model } from 'mongoose'

export interface IVerif extends Document {
  email: string
  code: string
  exp: number
  resend: number
}

const VerifSchema: Schema = new Schema(
  {
    email: { type: String, required: true },
    code: { type: String, required: true },
    exp: { type: Number, required: true },
    resend: { type: Number, required: true },
  },
  { collection: 'auth_verifs' }
)

export default model<IVerif>('Verif', VerifSchema)
