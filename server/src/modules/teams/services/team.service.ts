import mongoose from "mongoose";
import { Team } from "../models/team.model";
import { ITeam } from "../types/interface";

export default class TeamService {
    private session?: mongoose.ClientSession;

    constructor(session?: mongoose.ClientSession) {
        this.session = session;
    }

    async createTeam(teamData: Partial<ITeam>) {
        const team = new Team(teamData);
        if (this.session) {
            team.$session(this.session);
        }
        const savedTeam = await team.save();
        return savedTeam;
    }

    async createMultipleTeams(n: number, teamData: Partial<ITeam> = {}) {
        const teams = [];
        for (let i = 1; i <= n; i++) {
            const data = { ...teamData, teamNumber: i };
            const team = new Team(data);
            if (this.session) {
                team.$session(this.session);
            }
            teams.push(team.save());
        }
        return await Promise.all(teams);
    }

    async fetchTeamById(teamId: mongoose.Types.ObjectId | string) {
        const query = Team.findById(teamId);
        if (this.session) {
            query.session(this.session);
        }
        const teamDoc = await query;
        if (!teamDoc) {
            throw new Error("Team not found");
        }
        return teamDoc;
    }

    async fetchTeamByNumber(teamNumber: number, sessionId: mongoose.Types.ObjectId | string) {
        const query = Team.findOne({ teamNumber: teamNumber, session: sessionId });
        if (this.session) {
            query.session(this.session);
        }
        const teamDoc = await query;
        if (!teamDoc) {
            throw new Error("Team not found");
        }
        return teamDoc;
    }

    async updateTeamById(
        teamId: mongoose.Types.ObjectId | string,
        updateData: Partial<ITeam>
    ) {
        const options: any = {
            new: true,
            runValidators: true,
        };
        if (this.session) {
            options.session = this.session;
        }
        const teamDoc = await Team.findByIdAndUpdate(
            teamId,
            updateData,
            options
        );
        if (!teamDoc) {
            throw new Error("Team not found");
        }
        return teamDoc;
    }

    async updateTeamScore(
        teamId: mongoose.Types.ObjectId | string,
        scoreToAdd: number
    ) {
        const options: any = {
            new: true,
            runValidators: true,
        };
        if (this.session) {
            options.session = this.session;
        }
        const teamDoc = await Team.findByIdAndUpdate(
            teamId,
            { $inc: { teamScore: scoreToAdd } },
            options
        );
        if (!teamDoc) {
            throw new Error("Team not found");
        }
        return teamDoc;
    }

    async deleteTeamById(teamId: mongoose.Types.ObjectId | string) {
        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        const teamDoc = await Team.findByIdAndDelete(teamId, options);
        if (!teamDoc) {
            throw new Error("Team not found");
        }
        return teamDoc;
    }

    async getAllTeamsBySessionId(sessionId: string) {
        const query = Team.find({ session: sessionId }).sort({ teamNumber: 1 });
        if (this.session) {
            query.session(this.session);
        }
        return await query;
    }

    async getTeamsByQuery(query: any) {
        const teamQuery = Team.find(query);
        if (this.session) {
            teamQuery.session(this.session);
        }
        return await teamQuery;
    }

    async getTeamCount() {
        const query = Team.countDocuments({});
        if (this.session) {
            return await Team.countDocuments({}).session(this.session);
        }
        return await query;
    }

    async resetAllTeamScores() {
        const options: any = {
            new: true,
            runValidators: true,
        };
        if (this.session) {
            options.session = this.session;
        }
        return await Team.updateMany(
            {},
            { teamScore: 0 },
            options
        );
    }
}