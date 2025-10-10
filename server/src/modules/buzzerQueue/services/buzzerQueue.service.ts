import mongoose, { Types } from "mongoose";
import { BuzzerQueue } from "../models/buzzerQueue.model";
import { IBuzzerQueue } from "../types/buzzerQueue.interface";

export default class BuzzerQueueService {
    private session?: mongoose.ClientSession;

    constructor(session?: mongoose.ClientSession) {
        this.session = session;
    }

    // Create a buzzer entry
    async createBuzzerEntry({
        gameStateId,
        sessionId,
        teamId,
        questionId,
        timestamp,
        ttl,
    }: {
        gameStateId: Types.ObjectId | string;
        sessionId: Types.ObjectId | string;
        teamId: Types.ObjectId | string;
        questionId: Types.ObjectId | string;
        timestamp: bigint;
        ttl: Date;
    }): Promise<IBuzzerQueue> {
        const buzzerEntry = new BuzzerQueue({
            gameStateId,
            sessionId,
            teamId,
            questionId,
            timestamp,
            ttl,
        });

        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await buzzerEntry.save(options);
        return buzzerEntry;
    }

    // Check if team has already pressed the buzzer for a question
    async checkIfTeamPressed(
        questionId: Types.ObjectId | string,
        teamId: Types.ObjectId | string
    ): Promise<boolean> {
        const query = BuzzerQueue.findOne({
            questionId,
            teamId,
        });
        
        if (this.session) {
            query.session(this.session);
        }
        
        const entry = await query;
        return entry !== null;
    }

    // Fetch buzzer leaderboard for a specific question
    async fetchBuzzerLeaderboard(
        questionId: Types.ObjectId | string,
        sessionId: Types.ObjectId | string
    ): Promise<IBuzzerQueue[]> {
        const query = BuzzerQueue.find({
            questionId,
            sessionId,
        })
            .sort({ timestamp: 1 }) // Sort by timestamp ascending (fastest first)
            .populate('teamId', 'teamNumber teamName teamScore');
        
        if (this.session) {
            query.session(this.session);
        }
        
        return await query;
    }

    // Get the fastest team (first to press buzzer) for a question
    async getFastestTeam(
        questionId: Types.ObjectId | string,
        sessionId: Types.ObjectId | string
    ): Promise<IBuzzerQueue | null> {
        const query = BuzzerQueue.findOne({
            questionId,
            sessionId,
        })
            .sort({ timestamp: 1 })
            .populate('teamId', 'teamNumber teamName teamScore');
        
        if (this.session) {
            query.session(this.session);
        }
        
        return await query;
    }

    // Get all buzzer entries for a game state
    async fetchBuzzerEntriesByGameState(
        gameStateId: Types.ObjectId | string
    ): Promise<IBuzzerQueue[]> {
        const query = BuzzerQueue.find({ gameStateId })
            .sort({ timestamp: 1 })
            .populate('teamId', 'teamNumber teamName teamScore');
        
        if (this.session) {
            query.session(this.session);
        }
        
        return await query;
    }

    // Clear buzzer queue for a question (for cleanup or reset)
    async clearBuzzerQueueForQuestion(
        questionId: Types.ObjectId | string
    ): Promise<number> {
        const query = BuzzerQueue.deleteMany({ questionId });
        
        if (this.session) {
            query.session(this.session);
        }
        
        const result = await query;
        return result.deletedCount || 0;
    }

    // Get count of teams that pressed buzzer for a question
    async getTeamCountForQuestion(
        questionId: Types.ObjectId | string
    ): Promise<number> {
        const query = BuzzerQueue.countDocuments({ questionId });
        
        if (this.session) {
            query.session(this.session);
        }
        
        return await query;
    }
}
