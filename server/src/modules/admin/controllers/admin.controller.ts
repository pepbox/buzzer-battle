import { NextFunction, Request, Response } from 'express';
import AppError from '../../../utils/appError';
import SessionService from '../../session/services/session.service';
import { generateAccessToken, generateRefreshToken } from '../../../utils/jwtUtils';
import AdminServices from '../services/admin.service';
import { setCookieOptions } from '../../../utils/cookieOptions';
import PlayerService from '../../players/services/player.service';
import { Player } from '../../players/models/player.model';
import QuestionService from '../../questions/services/question.service';
import { Question } from '../../questions/models/question.model';
import { SessionStatus } from '../../session/types/enums';
import FileService from '../../files/services/fileService';
import TeamService from '../../teams/services/team.service';

const adminService = new AdminServices();
const sessionService = new SessionService();
const playerService = new PlayerService(Player); // Assuming you have a player service
const questionService = new QuestionService(Question); // Assuming you have a question service
const fileService = new FileService();
const teamService = new TeamService();


export const createAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { password, name } = req.body;
        const sessionId = req.user?.sessionId;
        if (!sessionId || !password) {
            return next(new AppError("Session ID and password are required.", 400));
        }
        const session = await sessionService.fetchSessionById(sessionId);
        if (!session) {
            return next(new AppError("Session not found.", 404));
        }

        const admin = await adminService.createAdmin({
            sessionId,
            password,
            name,
        });

        if (!admin) {
            return next(new AppError("Failed to create admin.", 500));
        }

        const accessToken = generateAccessToken({
            id: admin._id.toString(),
            role: "ADMIN",
            sessionId: admin.sessionId.toString(),
        });

        res.cookie("accessToken", accessToken, setCookieOptions);

        res.status(201).json({
            message: "Admin created successfully.",
            data: {
                admin,
            },
        });
    } catch (error) {
        console.error("Error creating admin:", error);
        next(new AppError("Failed to create admin.", 500));
    }
};

export const loginAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { sessionId, password } = req.body;
        if (!sessionId || !password) {
            return next(new AppError("Session ID and password are required.", 400));
        }

        const admin = await adminService.loginAdmin({
            sessionId,
            password,
        });
        const session = await sessionService.fetchSessionById(sessionId);
        if (!session) {
            return next(new AppError("Session not found.", 404));
        }
        if (session.status === SessionStatus.ENDED) {
            return next(new AppError("Session has ended. Admin cannot log in.", 403));
        }
        if (!admin) {
            return next(new AppError("Invalid session ID or password.", 401));
        }

        const accessToken = generateAccessToken({
            id: admin._id.toString(),
            role: "ADMIN",
            sessionId: admin.sessionId.toString(),
        });
        const refreshToken = generateRefreshToken(admin._id.toString());

        res.cookie("accessToken", accessToken, setCookieOptions);
        res.cookie("refreshToken", refreshToken, { ...setCookieOptions, httpOnly: true });


        res.status(200).json({
            message: "Admin logged in successfully.",
            data: {
                admin,
            },
            success: true,
        });
    } catch (error) {
        console.error("Error logging in admin:", error);
        next(new AppError("Failed to log in admin.", 500));
    }
};

export const fetchAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    const sessionId = req.user?.sessionId;
    if (!sessionId) {
        return next(new AppError("Session ID is required or does not match.", 400));
    }

    try {
        const adminId = req.user.id;
        if (!adminId) {
            return next(new AppError("Admin ID is required.", 400));
        }

        const admin = await adminService.fetchAdminById(adminId);
        if (!admin) {
            return next(new AppError("Admin not found.", 404));
        }

        res.status(200).json({
            success: true,
            data: admin,
        });
    } catch (error: any) { }
};

export const logoutAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });

        res.status(200).json({
            success: true,
            message: "Admin logged out successfully.",
        });
    } catch (error) {
        console.error("Error logging out admin:", error);
        next(new AppError("Failed to log out admin.", 500));
    }
};

export const fetchAdminDashboardData = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;
        const adminId = req.user?.id;

        if (!sessionId || !adminId) {
            return next(new AppError("Session ID and Admin ID are required.", 400));
        }

        // Fetch admin and session
        const admin = await adminService.fetchAdminById(adminId);
        const session = await sessionService.fetchSessionById(sessionId);

        // Fetch all players in the session
        const players = await playerService.getPlayersBySession(sessionId);
        const playerDataPromises = players.map(async (player) => {
            // Questions answered
            const totalQuestions = await questionService.getAllQuestions();
            const responses = await questionService.getResponsesByPlayerId(player._id.toString());
            const questionsAnswered = `${responses.length}/${totalQuestions.length}`;

            // People you know
            const guessesByUser = await playerService.getGuessesByUserId(player._id);
            const correctGuessesByUser = guessesByUser.filter(
                (guess) =>
                    guess.guessedPersonId &&
                    guess.personId.toString() === guess.guessedPersonId.toString()
            );
            const peopleYouKnow = `${correctGuessesByUser.length}`;
            // People who know you
            const guessesByPerson = await playerService.getGuessesByPersonId(player._id);
            const correctGuessesByPerson = guessesByPerson.filter(
                (guess) =>
                    guess.guessedPersonId &&
                    guess.personId.toString() === guess.guessedPersonId.toString()
            );
            const peopleWhoKnowYou = `${correctGuessesByPerson.length}`;
            // Status from session 
            const currentStatus = session.status || "Pending";

            // Total score
            const totalScore = player.score || 0;
            const team = await teamService.fetchTeamById(player?.team?.toString() || "");

            return {
                id: player._id.toString(),
                name: player.name,
                questionsAnswered,
                currentStatus,
                rank: 0,
                peopleYouKnow,
                peopleWhoKnowYou,
                totalScore,
                team: team.teamNumber,
            };
        });

        let playersData = await Promise.all(playerDataPromises);

        playersData = playersData.sort((a, b) => b.totalScore - a.totalScore);

        playersData = playersData.map((player, idx) => ({
            ...player,
            rank: idx + 1,
        }));

        const data = {
            headerData: {
                adminName: admin.name,
                gameStatus: session.status,
            },
            players: playersData,
        };

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        next(new AppError("Failed to fetch admin dashboard data.", 500));
    }
};

export const fetchLeaderboardData = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;
        const adminId = req.user?.id;

        if (!sessionId || !adminId) {
            return next(new AppError("Session ID and Admin ID are required.", 400));
        }

        // Fetch all players in the session sorted by score
        const players = await playerService.getPlayersBySession(sessionId);

        // Sort players by score and get top 12
        const sortedPlayers = players
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 12); // Get only top 12 players

        const profilePhotos = await Promise.all(
            sortedPlayers.map(async (player) => {
                if (player.profilePhoto) {
                    const profilePhoto = await fileService.getFileById(player.profilePhoto.toString());
                    return profilePhoto?.location || "";
                }
                return "";
            })
        );

        const playerRankings = sortedPlayers.map((player, index) => ({
            id: player._id.toString(),
            name: player.name,
            profilePhoto: profilePhotos[index],
            score: player.score || 0,
            rank: index + 1,
        }));

        // Fetch all guesses with selfies for this session
        const allGuesses = await playerService.getGuessesWithSelfiesForSession(sessionId);

        const selfies = await Promise.all(
            allGuesses.map(async (guess: any) => {
                // Get guesser and guessed person details
                const guesser = await playerService.getPlayerById(guess.user.toString());
                const guessedPerson = await playerService.getPlayerById(guess.personId.toString());
                let selfiePicture = "";
                if (guess.selfie) {
                    const file = await fileService.getFileById(guess.selfie.toString());
                    selfiePicture = file?.location || "";
                }
                return {
                    id: guess._id.toString(),
                    guesserName: guesser?.name || "Unknown",
                    guessedPersonName: guessedPerson?.name || "Unknown",
                    selfieId: selfiePicture,
                    createdAt: guess.createdAt,
                    updatedAt: guess.updatedAt, // Include updatedAt for proper sorting
                };
            })
        );

        // Filter out selfies without images, sort by latest first, and get top 12
        const filteredAndSortedSelfies = selfies
            .filter((selfie: any) => selfie.selfieId) // Only include selfies that exist
            .sort((a: any, b: any) => {
                // Use updatedAt for sorting since that's when the selfie was actually uploaded
                const dateA = new Date(a.updatedAt || a.createdAt);
                const dateB = new Date(b.updatedAt || b.createdAt);
                return dateB.getTime() - dateA.getTime(); // Sort by latest first
            })
            .slice(0, 12); // Get only top 12 latest selfies

        const data = {
            playerRankings,
            selfies: filteredAndSortedSelfies,
        };

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        next(new AppError("Failed to fetch leaderboard data.", 500));
    }
};

export const checkPlayersReadiness = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;
        const adminId = req.user?.id;

        if (!sessionId || !adminId) {
            return next(new AppError("Session ID and Admin ID are required.", 400));
        }

        // Fetch all players in the session
        const players = await playerService.getPlayersBySession(sessionId);
        
        // Get total number of questions
        const totalQuestions = await questionService.getAllQuestions();
        const totalQuestionCount = totalQuestions.length;

        const pendingPlayers = [];
        
        for (const player of players) {
            // Get responses by player id
            const responses = await questionService.getResponsesByPlayerId(player._id.toString());
            const answeredCount = responses.length;
            
            // If player hasn't answered all questions, add to pending list
            if (answeredCount < totalQuestionCount) {
                const team = await teamService.fetchTeamById(player?.team?.toString() || "");
                pendingPlayers.push({
                    id: player._id.toString(),
                    name: player.name,
                    team: team?.teamNumber || 0,
                    questionsAnswered: `${answeredCount}/${totalQuestionCount}`
                });
            }
        }

        const allReady = pendingPlayers.length === 0;

        res.status(200).json({
            success: true,
            data: {
                allReady,
                pendingPlayers,
                totalPlayers: players.length
            }
        });
    } catch (error) {
        console.error("Error checking players readiness:", error);
        next(new AppError("Failed to check players readiness.", 500));
    }
};