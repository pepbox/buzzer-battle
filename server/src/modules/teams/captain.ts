import { Types } from "mongoose";
import { Team } from "./models/team.model";
import { ITeam, ITeamMember } from "./types/interface";
import { SessionEmitters } from "../../services/socket/sessionEmitters";
import { Events } from "../../services/socket/enums/Events";

/**
 * Team captain (= the team's BUZZER_PERSON member).
 *
 * If a team has no captain once the game is running, the member who joined first is
 * promoted automatically. Captaincy is stored on the team document, and permission
 * checks read it from there (not from the player's JWT, which is issued at join time
 * and would still say TEAM_MEMBER for a promoted player).
 */

const sameName = (a?: string, b?: string) =>
  Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

export const getCaptain = (
  team: Pick<ITeam, "members"> | null | undefined,
): ITeamMember | undefined =>
  team?.members?.find((m) => m.role === "BUZZER_PERSON");

/** Promote the earliest-joined member if the team has no captain. Returns the new captain's name. */
export const ensureTeamCaptain = async (team: ITeam): Promise<string | null> => {
  if (!team.members?.length || getCaptain(team)) return null;

  const firstJoined = [...team.members].sort(
    (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
  )[0];

  // Conditional update so two concurrent calls can't create two captains.
  const result = await Team.updateOne(
    {
      _id: team._id,
      "members.role": { $ne: "BUZZER_PERSON" },
      "members.name": firstJoined.name,
    },
    { $set: { "members.$[m].role": "BUZZER_PERSON" } },
    { arrayFilters: [{ "m.name": firstJoined.name }] },
  );
  if (result.modifiedCount === 0) return null;

  firstJoined.role = "BUZZER_PERSON";
  const sessionId = String((team.session as any)?._id ?? team.session);
  SessionEmitters.toTeam(sessionId, String(team._id), Events.TEAM_ROLE_UPDATED, {
    teamId: String(team._id),
    captainName: firstJoined.name,
    autoAssigned: true,
  });
  SessionEmitters.toSessionAdmins(sessionId, Events.TEAM_ROLE_UPDATED, {
    teamId: String(team._id),
    captainName: firstJoined.name,
    autoAssigned: true,
  });
  return firstJoined.name;
};

/** Run ensureTeamCaptain for every team in the session (idempotent). */
export const ensureSessionCaptains = async (sessionId: Types.ObjectId | string) => {
  const teams = await Team.find({ session: sessionId });
  await Promise.all(teams.map((team) => ensureTeamCaptain(team)));
};

/**
 * Effective role of a logged-in player, read from the team document.
 * Falls back to the JWT role for old tokens that carry no player name.
 */
export const getPlayerRole = async (user: {
  id: string;
  playerName?: string;
  playerRole?: "BUZZER_PERSON" | "TEAM_MEMBER";
}): Promise<"BUZZER_PERSON" | "TEAM_MEMBER"> => {
  if (!user.playerName) return user.playerRole ?? "TEAM_MEMBER";
  const team = await Team.findById(user.id).select("members").lean();
  const captain = getCaptain(team as any);
  return sameName(captain?.name, user.playerName) ? "BUZZER_PERSON" : "TEAM_MEMBER";
};

export const isTeamCaptain = async (user: Parameters<typeof getPlayerRole>[0]) =>
  (await getPlayerRole(user)) === "BUZZER_PERSON";
