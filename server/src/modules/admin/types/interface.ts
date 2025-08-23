import { Types } from "mongoose";

export interface IAdmin {
    name: string;
    password: string;
    sessionId: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}
