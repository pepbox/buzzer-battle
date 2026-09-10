import mongoose, { Types } from "mongoose";
import { Team } from "../models/team.model";
import { ITeam } from "../types/interface";
import { Session } from "../../session/models/session.model";

export default class TeamService {
  private session?: mongoose.ClientSession;

  constructor(session?: mongoose.ClientSession) {
    this.session = session;
  }

  // Create a new team or join an existing team
  async createTeam({
    teamNumber,
    playerName,
    playerRole,
    sessionId,
  }: {
    teamNumber: number;
    playerName: string;
    playerRole: "BUZZER_PERSON" | "TEAM_MEMBER";
    sessionId: Types.ObjectId | string;
  }): Promise<ITeam> {
    // Check if team already exists in this session
    const query = Team.findOne({ teamNumber, session: sessionId });
    if (this.session) {
      query.session(this.session);
    }

    let team = await query;
    const newMember = {
      name: playerName,
      role: playerRole,
      joinedAt: new Date(),
    };

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    if (team) {
      // Check duplicate name
      const nameExists = team.members.some(
        (m) => m.name.toLowerCase() === playerName.toLowerCase()
      );
      if (nameExists) {
        throw new Error("Player name already exists in this team");
      }

      // Check if buzzer person already exists if joining as buzzer person
      if (playerRole === "BUZZER_PERSON") {
        const hasBuzzerPerson = team.members.some(
          (m) => m.role === "BUZZER_PERSON"
        );
        if (hasBuzzerPerson) {
          throw new Error("Buzzer Person already exists in this team");
        }
      }

      team.members.push(newMember);
      await team.save(options);
    } else {
      // Fetch session to determine teamName
      const sessionDoc = await Session.findById(sessionId).select("teamMode");
      const teamMode = sessionDoc?.teamMode || "NUMBER";
      
      const COLOR_OPTIONS: Record<number, string> = {
        1: "Red", 2: "Green", 3: "Blue", 4: "Yellow", 5: "Orange",
        6: "White", 7: "Pink", 8: "Purple", 9: "Maroon", 10: "Light Blue",
        11: "Silver", 12: "Brown", 13: "Indigo", 14: "Olive Green"
      };
      
      const derivedTeamName = teamMode === "COLOR" 
        ? `Team ${COLOR_OPTIONS[teamNumber] || teamNumber}`
        : `Team ${teamNumber}`;

      team = new Team({
        teamNumber,
        teamName: derivedTeamName,
        session: sessionId,
        teamScore: 0,
        joinedAt: new Date(),
        members: [newMember]
      });

      await team.save(options);
    }

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

  // Fetch total number of teams and config in a session
  async fetchTotalTeamsInSession(
    sessionId: Types.ObjectId | string,
  ): Promise<{ totalTeams: number; teamMode: string; colorTeams: number[] }> {
    const sessionDoc =
      await Session.findById(sessionId).select("numberOfTeams teamMode colorTeams");
    if (!sessionDoc || typeof sessionDoc.numberOfTeams !== "number") {
      throw new Error("Session not found or numberOfTeams not set");
    }
    return {
      totalTeams: sessionDoc.numberOfTeams,
      teamMode: sessionDoc.teamMode || 'NUMBER',
      colorTeams: sessionDoc.colorTeams || []
    };
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

  // Fetch joined teams details in a session
  async fetchJoinedTeamsDetails(
    sessionId: Types.ObjectId | string,
  ): Promise<{ teamNumber: number; hasBuzzerPerson: boolean }[]> {
    const teams = await Team.find({ session: sessionId })
      .select("teamNumber members")
      .lean();
    return teams.map((team: any) => ({
      teamNumber: Number(team.teamNumber),
      hasBuzzerPerson: team.members?.some((m: any) => m.role === "BUZZER_PERSON") || false
    }));
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

    return team as unknown as ITeam;
  }
}
