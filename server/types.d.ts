import mongoose from "mongoose";
import "socket.io";
import { AccessTokenPayload } from "./src/utils/jwtUtils";

declare global {
  namespace Express {
    interface Request {
      user: {
        id: mongoose.Types.ObjectId;
        role: 'USER' | 'ADMIN';
        sessionId?: mongoose.Types.ObjectId;
      };
    }
    namespace Multer {
      interface File {
        key?: string;
        bucket?: string;
        location?: string;
        etag?: string;
        contentType?: string;
        metadata?: any;
        serverSideEncryption?: string;
        storageClass?: string;
      }
    }
  }
}

declare module "socket.io" {
  interface Socket {
    user?: {
      id: string;
      role: "ADMIN" | "USER";
      name: string;
    };
  }
}

export { };