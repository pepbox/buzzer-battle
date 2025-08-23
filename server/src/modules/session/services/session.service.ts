import mongoose from "mongoose";
import { ISession, Session } from "../models/session.model";

export default class SessionService {
  private session?: mongoose.ClientSession;

  constructor(session?: mongoose.ClientSession) {
    this.session = session;
  }

  // Static methods for backward compatibility
  static async fetchSessionById(sessionId: mongoose.Types.ObjectId | string) {
    const service = new SessionService();
    return service.fetchSessionById(sessionId);
  }

  static async getSessionsByQuery(query: any) {
    return await Session.find(query);
  }

  static async updateSessionById(
    sessionId: mongoose.Types.ObjectId | string,
    updateData: Partial<ISession>
  ) {
    const service = new SessionService();
    return service.updateSessionById(sessionId, updateData);
  }

  // Instance methods that use this.session
  async createSession(sessionData: Partial<ISession>) {
    const session = new Session(sessionData);
    if (this.session) {
      session.$session(this.session);
    }
    const savedSession = await session.save();
    return savedSession;
  }

  async fetchSessionById(sessionId: mongoose.Types.ObjectId | string) {
    const query = Session.findById(sessionId);
    if (this.session) {
      query.session(this.session);
    }
    const sessionDoc = await query;
    if (!sessionDoc) {
      throw new Error("Session not found");
    }
    return sessionDoc;
  }

  async updateSessionById(
    sessionId: mongoose.Types.ObjectId | string,
    updateData: Partial<ISession>
  ) {
    const options: any = {
      new: true,
      runValidators: true,
    };
    if (this.session) {
      options.session = this.session;
    }
    const sessionDoc = await Session.findByIdAndUpdate(
      sessionId,
      updateData,
      options
    );
    if (!sessionDoc) {
      throw new Error("Session not found");
    }
    return sessionDoc;
  }
}
