import mongoose, { Schema } from 'mongoose';
import { IAdmin } from '../types/interface';


const AdminSchema: Schema<IAdmin> = new Schema(
    {
        name: { type: String, required: true },
        password: { type: String, required: true },
        sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    },
    { timestamps: true }
);

export default mongoose.model<IAdmin>('Admin', AdminSchema);