import mongoose, { Types } from "mongoose";
import { Team } from "../models/team.model";
import { ITeam } from "../types/interface";
import { Session } from "../../session/models/session.model";

export default class TeamService {
  private session?: mongoose.ClientSession;

  constructor(session?: mongoose.ClientSession) {
    this.session = session;
  }

  // Create a new team
  async createTeam({
    teamNumber,
    teamName,
    sessionId,
  }: {
    teamNumber: number;
    teamName: string;
    sessionId: Types.ObjectId | string;
  }): Promise<ITeam> {
    // Check if team number already exists in this session
    const query = Team.findOne({ teamNumber, session: sessionId });
    if (this.session) {
      query.session(this.session);
    }

    const existingTeam = await query;
    if (existingTeam) {
      throw new Error("Team number already exists in this session");
    }

    const team = new Team({
      teamNumber,
      teamName,
      session: sessionId,
      teamScore: 0,
      joinedAt: new Date(),
    });

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await team.save(options);
    return team;
  }

  // Fetch team by ID
  async fetchTeamById(teamId: Types.ObjectId | string): Promise<ITeam> {
    const query = Team.findById(teamId).populate("session");
    if (this.session) {
      query.session(this.session);
    }

    const team = await query;
    if (!team) {
      throw new Error("Team not found");
    }
    return team;
  }

  // Fetch team by team number and session
  async fetchTeamByNumber(
    teamNumber: number,
    sessionId: Types.ObjectId | string,
  ): Promise<ITeam | null> {
    const query = Team.findOne({ teamNumber, session: sessionId });
    if (this.session) {
      query.session(this.session);
    }
    return await query;
  }

  // Fetch overall leaderboard for a session
  async fetchOverallLeaderboard(
    sessionId: Types.ObjectId | string,
  ): Promise<ITeam[]> {
    const query = Team.find({ session: sessionId })
      .select(
        "teamNumber teamName teamScore joinedAt totalBuzzerReactionTimeMs totalBuzzerPressCount",
      );

    if (this.session) {
      query.session(this.session);
    }

    const teams = await query;

    return teams.sort((teamA, teamB) => {
      if (teamA.teamScore !== teamB.teamScore) {
        return teamB.teamScore - teamA.teamScore;
      }

      const teamAHasBuzzerData = (teamA.totalBuzzerPressCount ?? 0) > 0;
      const teamBHasBuzzerData = (teamB.totalBuzzerPressCount ?? 0) > 0;

      if (teamAHasBuzzerData !== teamBHasBuzzerData) {
        return teamAHasBuzzerData ? -1 : 1;
      }

      if (teamAHasBuzzerData && teamBHasBuzzerData) {
        const reactionTimeDifference =
          (teamA.totalBuzzerReactionTimeMs ?? 0) -
          (teamB.totalBuzzerReactionTimeMs ?? 0);

        if (reactionTimeDifference !== 0) {
          return reactionTimeDifference;
        }
      }

      const joinedAtDifference =
        new Date(teamA.joinedAt).getTime() - new Date(teamB.joinedAt).getTime();

      if (joinedAtDifference !== 0) {
        return joinedAtDifference;
      }

      return teamA.teamNumber - teamB.teamNumber;
    });
  }

  async recordBuzzerReactionTime(
    teamId: Types.ObjectId | string,
    reactionTimeMs: number,
  ): Promise<void> {
    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    const updateResult = await Team.updateOne(
      { _id: teamId },
      {
        $inc: {
          totalBuzzerReactionTimeMs: reactionTimeMs,
          totalBuzzerPressCount: 1,
        },
      },
      options,
    );

    if (updateResult.matchedCount === 0) {
      throw new Error("Team not found");
    }
  }

  // Update team score
  async updateTeamScore(
    teamId: Types.ObjectId | string,
    points: number,
  ): Promise<ITeam> {
    const query = Team.findById(teamId);
    if (this.session) {
      query.session(this.session);
    }

    const team = await query;
    if (!team) {
      throw new Error("Team not found");
    }

    team.teamScore += points;

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await team.save(options);
    return team;
  }

  // Get all teams in a session
  async fetchTeamsBySession(
    sessionId: Types.ObjectId | string,
  ): Promise<ITeam[]> {
    const query = Team.find({ session: sessionId });
    if (this.session) {
      query.session(this.session);
    }
    return await query;
  }

  // Fetch total number of teams in a session
  async fetchTotalTeamsInSession(
    sessionId: Types.ObjectId | string,
  ): Promise<number> {
    const sessionDoc =
      await Session.findById(sessionId).select("numberOfTeams");
    if (!sessionDoc || typeof sessionDoc.numberOfTeams !== "number") {
      throw new Error("Session not found or numberOfTeams not set");
    }
    return sessionDoc.numberOfTeams;
  }

  // Fetch joined team numbers in a session
  async fetchJoinedTeamNumbers(
    sessionId: Types.ObjectId | string,
  ): Promise<number[]> {
    const teams = await Team.find({ session: sessionId })
      .select("teamNumber")
      .lean();
    return teams
      .map((team: any) => Number(team.teamNumber))
      .filter((teamNumber) => Number.isInteger(teamNumber))
      .sort((a, b) => a - b);
  }

  // Update team by ID (for admin)
  async updateTeamById(
    teamId: Types.ObjectId | string,
    updateData: Partial<ITeam>,
  ): Promise<ITeam> {
    const options: any = {
      new: true, // Return updated document
      runValidators: true,
    };
    if (this.session) {
      options.session = this.session;
    }

    const team = await Team.findByIdAndUpdate(teamId, updateData, options);

    if (!team) {
      throw new Error("Team not found");
    }

    return team;
  }
}
