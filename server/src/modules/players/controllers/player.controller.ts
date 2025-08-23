import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../utils/appError';
import PlayerService from '../services/player.service';
import { Player } from '../models/player.model';
import { generateAccessToken, generateRefreshToken } from '../../../utils/jwtUtils';
import { setCookieOptions } from '../../../utils/cookieOptions';
import QuestionService from '../../questions/services/question.service';
import { Question } from '../../questions/models/question.model';
import { Types } from 'mongoose';
import { NextFunction } from 'express';
import { SessionEmitters } from '../../../services/socket/sessionEmitters';
import { Events } from '../../../services/socket/enums/Events';
import { deleteFromS3 } from '../../../services/fileUpload';
import SessionService from '../../session/services/session.service';
import FileService from '../../files/services/fileService';
import { SessionStatus } from '../../session/types/enums';
import TeamService from '../../teams/services/team.service';

const playerService = new PlayerService(Player);
const questionService = new QuestionService(Question);
const fileService = new FileService();
const teamService = new TeamService();


export const onboardPlayer = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { name,
            session,
            teamNumber
        } = req.body;

        if (!req.file) {
            return next(new AppError("Profile image is required.", 400));
        }

        if (!name || !session) {
            deleteFromS3(req.file.key!);
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Name and session are required",
            });
            return;
        }

        const fileService = new FileService();

        const sessionDoc = await SessionService.fetchSessionById(session);
        if (!sessionDoc) {
            deleteFromS3(req.file.key!);
            return next(new AppError("Session not found.", 404));
        }

        if (sessionDoc.status === SessionStatus.ENDED) {
            deleteFromS3(req.file.key!);
            return next(new AppError("Session has ended. Player cannot be onboarded.", 403));
        }

        const profileImageInfo = {
            originalName: req.file.originalname!,
            fileName: req.file.key!,
            size: req.file.size!,
            mimetype: req.file.mimetype!,
            location: req.file.location!,
            bucket: req.file.bucket!,
            etag: req.file.etag!,
        };

        const profileImage = await fileService.uploadFile(profileImageInfo);
        const team = await teamService.fetchTeamByNumber(teamNumber, session);
        // const players = await playerService.getPlayersBySession(session);
        // const existingPlayer = players.find(
        //     (player: any) => player.name === name
        // );

        // if (existingPlayer) {
        //     if (existingPlayer?.team?.toString() === team?._id?.toString()) {
        //         deleteFromS3(req.file.key!);
        //         return next(new AppError("A player with this name already exists in team.", 400));
        //     }
        // }


        const playerData = {
            name,
            profilePhoto: profileImage._id,
            session,
            team: team._id,
        };

        const player = await playerService.createPlayer(playerData);
        const accessToken = generateAccessToken({
            id: player._id.toString(),
            role: "USER",
            sessionId: player.session.toString()
        });
        const refreshToken = generateRefreshToken(player._id.toString());

        res.cookie("accessToken", accessToken, setCookieOptions);
        res.cookie("refreshToken", refreshToken, { ...setCookieOptions, httpOnly: true });
        SessionEmitters.toSessionAdmins(session.toString(), Events.PLAYERS_UPDATE, {});
        res.status(StatusCodes.CREATED).json({
            success: true,
            message: "Player onboarded successfully",
            data: player,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
        } else {
            console.error("Error onboarding player:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: "Internal Server Error",
            });
        }
    }
};

export const fetchPlayer = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const playerId = req.user?.id;
        if (!playerId) {
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Player ID is required",
            });
            return;
        }

        const player = await playerService.getPlayerById(playerId.toString());
        if (!player) {
            res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Player not found",
            });
            return;
        }

        res.status(StatusCodes.OK).json({
            success: true,
            data: player,
        });
    } catch (error) {
        console.error("Error fetching player:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal Server Error",
        });
    }
};


export const getPlayersCards = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const sessionId = req.user?.sessionId;
        const currentUserId = req.user?.id;

        if (!sessionId || !currentUserId) {
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Session ID is required",
            });
            return;
        }
        const CurrentPlayer = await playerService.getPlayerById(currentUserId.toString());
        if (!CurrentPlayer) {
            res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Current player not found",
            });
            return;
        }
        console.log("Current Player:", CurrentPlayer);
        // Fetch all players in the session except the current user
        const players = await playerService.getPlayersBySession(new Types.ObjectId(sessionId));
        const otherPlayers = players.filter(
            (player: any) => player._id.toString() !== currentUserId && player.team.toString() === CurrentPlayer?.team?.toString()
        );
        console.log("Other Players:", otherPlayers);

        // Prepare the result array
        const result = [];

        for (const player of otherPlayers) {
            // Get responses by player id
            const responses = await questionService.getResponsesByPlayerId(player._id.toString());

            // Map keyAspect to response
            const aspectResponseMap: Record<string, any> = {};

            for (const response of responses) {
                // Get question by id
                const question = await questionService.getQuestionById(response.question.toString());
                if (question) {
                    aspectResponseMap[question.keyAspect] = response.response;
                }
            }
            const guess = await playerService.createGuess({
                user: currentUserId,
                personId: player._id,
            })

            result.push({
                guessId: guess._id,
                guessedPersonId: guess.guessedPersonId || null, // This will be null until the user guesses
                responses: aspectResponseMap,
            });
        }

        // Shuffle the result array
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }

        res.status(StatusCodes.OK).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Error fetching players' responses:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal Server Error",
        });
    }
};

export const getPlayersBySession = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const sessionId = req.user?.sessionId;
        const currentUserId = req.user?.id;
        const role = req.user?.role;

        if (!sessionId || !currentUserId) {
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Session ID is required",
            });
            return;
        }
        const players = await playerService.getPlayersBySession(new Types.ObjectId(sessionId));
        let filteredPlayers = players.filter(
            (player: any) => player._id.toString() !== currentUserId
        );
        if (role === "USER") {
            const currentPlayer = await playerService.getPlayerById(currentUserId.toString());
            filteredPlayers = filteredPlayers.filter(
                (player: any) => player.team.toString() === currentPlayer?.team?.toString()
            );
        }
        for (let i = filteredPlayers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filteredPlayers[i], filteredPlayers[j]] = [filteredPlayers[j], filteredPlayers[i]];
        }
        // Add profilePhoto URL to each player
        for (const player of filteredPlayers) {
            let profilePhotoUrl = "";
            if (player.profilePhoto) {
                const file = await fileService.getFileById(player.profilePhoto.toString());
                profilePhotoUrl = file?.location || "";
            }
            (player as any).profilePhotoUrl = profilePhotoUrl;
        }

        res.status(StatusCodes.OK).json({
            success: true,
            data: filteredPlayers,
        });
    } catch (error) {
        console.error("Error fetching players by session:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal Server Error",
        });
    }
};

export const submitGuess = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { guessId, guessedPersonId } = req.body;
        const sessionId = req.user?.sessionId;

        if (!guessId || !guessedPersonId) {
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "guessId and guessedPersonId are required",
            });
            return;
        }

        // Find the guess by ID
        const guess = await playerService.getGuessById(guessId);
        if (!guess) {
            res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Guess not found",
            });
            return;
        }

        // Check if the guess is correct
        const isCorrect = guess.personId.toString() === guessedPersonId;

        let profilePicture = "";
        let score = 0;
        const guessedPerson = await playerService.getPlayerById(guess.personId.toString());
        if (isCorrect) {
            // Update player score if the guess is correct
            score = 100 - (guess.attempts || 0) * 10;
            const player = await playerService.updatePlayerScore(guess.user.toString(), score);
            //update target player score.
            await playerService.updatePlayerScore(guess?.personId.toString(), score / 2);
            if (!player) {
                res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: "Player not found",
                });
                return;
            }
            SessionEmitters.toUser(guess.personId?.toString() ?? "", Events.PLAYER_STAT_UPDATE, {});
            if (guess.personId) {
                console.log("Guessing personId:", guess.personId.toString());
                const file = await fileService.getFileById(guessedPerson?.profilePhoto?.toString() || "");
                console.log("File for personId:", file);
                profilePicture = file?.location || "";
            }
        }

        const updatedAttempts = (guess.attempts ?? 0) + 1;
        await playerService.updateGuessById(guessId, {
            attempts: updatedAttempts, // Increment attempts
            guessedPersonId: guessedPersonId
        });
        SessionEmitters.toSessionAdmins(sessionId?.toString() ?? "", Events.PLAYERS_UPDATE, {});
        res.status(StatusCodes.OK).json({
            success: true,
            correct: isCorrect,
            profilePhoto: profilePicture,
            name: isCorrect ? guessedPerson?.name : "",
            attempts: updatedAttempts,
            score: score,
        });

    } catch (error) {
        console.error("Error submitting guess:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal Server Error",
        });
    }
};

export const submitSelfie = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { guessId } = req.body;
        const currentUserId = req.user?.id;
        const sessionId = req.user?.sessionId;

        if (!req.file) {
            return next(new AppError("Selfie image is required.", 400));
        }

        if (!guessId) {
            deleteFromS3(req.file.key!);
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "guessId is required",
            });
            return;
        }

        if (!currentUserId) {
            deleteFromS3(req.file.key!);
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "User ID is required",
            });
            return;
        }

        // Find the guess by ID and verify it belongs to the current user
        const guess = await playerService.getGuessById(guessId);
        if (!guess) {
            deleteFromS3(req.file.key!);
            res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Guess not found",
            });
            return;
        }

        // Check if the guess belongs to the current user
        if (guess.user.toString() !== currentUserId.toString()) {
            deleteFromS3(req.file.key!);
            res.status(StatusCodes.FORBIDDEN).json({
                success: false,
                message: "You can only upload selfies for your own guesses",
            });
            return;
        }

        // Check if the guess is correct (only allow selfie upload for correct guesses)
        const isCorrect = guess.personId.toString() === guess.guessedPersonId?.toString();
        if (!isCorrect) {
            deleteFromS3(req.file.key!);
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "You can only upload selfies for correctly guessed players",
            });
            return;
        }

        // Upload the selfie file
        const selfieImageInfo = {
            originalName: req.file.originalname!,
            fileName: req.file.key!,
            size: req.file.size!,
            mimetype: req.file.mimetype!,
            location: req.file.location!,
            bucket: req.file.bucket!,
            etag: req.file.etag!,
        };

        const selfieFile = await fileService.uploadFile(selfieImageInfo);

        // Update the guess with the selfie reference
        const updatedGuess = await playerService.updateGuessById(guessId, {
            selfie: selfieFile._id,
        });

        if (!updatedGuess) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to update guess with selfie",
            });
            return;
        }
        // Emit event to update session admins
        SessionEmitters.toSessionAdmins(sessionId?.toString() ?? "", Events.PLAYER_SELFIE_UPDATE, {});

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Selfie uploaded successfully",
            data: {
                guessId: guessId,
                selfieUrl: selfieFile.location,
            },
        });

    } catch (error) {
        if (req.file?.key) {
            deleteFromS3(req.file.key);
        }
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        } else {
            console.error("Error uploading selfie:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal Server Error",
            });
        }
    }
};



export const getUserGuesses = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const currentUserId = req.user?.id;

        if (!currentUserId) {
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "User ID is required",
            });
            return;
        }

        // Fetch all guesses made by the user
        const guesses = await playerService.getGuessesByUserId(currentUserId);

        const result = guesses.map((guess: any) => {
            if (!guess.guessedPersonId) {
                return {
                    guessId: guess._id,
                    status: "no guess",
                    guessedPersonId: null, // No guess made yet
                    hasSelfie: false,
                    requiresSelfie: false,
                };
            }
            const isCorrect = guess.personId.toString() === guess.guessedPersonId.toString();
            return {
                guessId: guess._id,
                status: isCorrect ? "correct" : "wrong",
                guessedPersonId: isCorrect ? guess.guessedPersonId : null,
                hasSelfie: !!guess.selfie,
                requiresSelfie: isCorrect && !guess.selfie, // Requires selfie if correct but no selfie uploaded
            };
        });

        res.status(StatusCodes.OK).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Error fetching user guesses:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal Server Error",
        });
    }
};

export const updatePlayer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { playerId, name, score } = req.body;

        const updateData: Partial<{ name: string; score: number }> = {};
        if (name !== undefined) updateData.name = name;
        if (score !== undefined) updateData.score = score;

        if (!playerId) {
            return next(new AppError("Player ID is required.", StatusCodes.BAD_REQUEST));
        }

        const updatedPlayer = await playerService.updatePlayerById(playerId, updateData);

        if (!updatedPlayer) {
            return next(new AppError("Player not found or update failed.", StatusCodes.NOT_FOUND));
        }

        res.status(StatusCodes.OK).json({
            message: "Player updated successfully.",
            data: updatedPlayer,
        });
    } catch (error) {
        console.error("Error updating player:", error);
        next(new AppError("Failed to update player.", StatusCodes.INTERNAL_SERVER_ERROR));
    }
};


export const getPlayerWithResponses = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { playerId } = req.params;
        if (!playerId) {
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Player ID is required",
            });
            return;
        }

        // Get player data
        const player = await playerService.getPlayerById(playerId.toString());
        if (!player) {
            res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Player not found",
            });
            return;
        }

        // Get responses by player id
        const responses = await questionService.getResponsesByPlayerId(playerId);

        // Map responses with question keyAspect and text
        const mappedResponses = [];
        for (const response of responses) {
            const question = await questionService.getQuestionById(response.question.toString());
            if (question) {
                mappedResponses.push({
                    questionId: question._id,
                    keyAspect: question.keyAspect,
                    questionText: question.questionText,
                    response: response.response,
                });
            }
        }

        let profilePicture = "";
        if (player.profilePhoto) {
            const file = await fileService.getFileById(player.profilePhoto.toString());
            profilePicture = file?.location || "";
        }

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                player: {
                    id: player._id,
                    name: player.name,
                    profilePhoto: profilePicture,
                    score: player.score,
                },
                responses: mappedResponses,
            },
        });
    } catch (error) {
        console.error("Error fetching player with responses:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal Server Error",
        });
    }
};

export const getPlayerStats = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const playerId = req.user?.id;
        if (!playerId) {
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Player ID is required",
            });
            return;
        }

        // Get player data
        const player = await playerService.getPlayerById(playerId.toString());
        if (!player) {
            res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Player not found",
            });
            return;
        }

        // Total score
        const totalScore = player.score ?? 0;

        // People you know
        const guessesByUser = await playerService.getGuessesByUserId(player._id);
        const correctGuessesByUser = guessesByUser.filter(
            (guess: any) =>
                guess.guessedPersonId &&
                guess.personId.toString() === guess.guessedPersonId.toString()
        );
        const peopleIKnow = correctGuessesByUser.length;

        // People who know you
        const guessesByPerson = await playerService.getGuessesByPersonId(player._id);
        const correctGuessesByPerson = guessesByPerson.filter(
            (guess: any) =>
                guess.guessedPersonId &&
                guess.personId.toString() === guess.guessedPersonId.toString()
        );
        const peopleWhoKnowMe = correctGuessesByPerson.length;

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                totalScore,
                peopleIKnow,
                peopleWhoKnowMe,
            },
        });
    } catch (error) {
        console.error("Error fetching player stats:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal Server Error",
        });
    }
};

export const getGameCompletionData = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const currentUserId = req.user?.id;
        const sessionId = req.user?.sessionId;

        if (!currentUserId || !sessionId) {
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "User ID and session ID are required",
            });
            return;
        }

        // Get current player details
        const currentPlayer = await playerService.getPlayerById(currentUserId.toString());
        if (!currentPlayer) {
            res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Player not found",
            });
            return;
        }

        // Get current player's profile photo URL
        let currentPlayerProfilePhoto = "";
        if (currentPlayer.profilePhoto) {
            const file = await fileService.getFileById(currentPlayer.profilePhoto.toString());
            currentPlayerProfilePhoto = file?.location || "";
        }

        // Get all players in session
        let allPlayers = await playerService.getPlayersBySession(new Types.ObjectId(sessionId));
        allPlayers = allPlayers.filter(
            (player: any) => player.team.toString() === currentPlayer?.team?.toString()
        );
        const totalPlayers = allPlayers.length;

        // Get people you know (players you guessed correctly)
        const guessesByUser = await playerService.getGuessesByUserId(new Types.ObjectId(currentUserId));
        const correctGuessesByUser = guessesByUser.filter(
            (guess: any) =>
                guess.guessedPersonId &&
                guess.personId.toString() === guess.guessedPersonId.toString()
        );

        const peopleYouKnow = [];
        for (const guess of correctGuessesByUser) {
            const player = await playerService.getPlayerById(guess.personId.toString());
            if (player) {
                let profilePhoto = "";
                if (player.profilePhoto) {
                    const file = await fileService.getFileById(player.profilePhoto.toString());
                    profilePhoto = file?.location || "";
                }
                peopleYouKnow.push({
                    _id: player._id,
                    name: player.name,
                    profilePhoto,
                    score: player.score || 0,
                });
            }
        }

        // Get people who know you (players who guessed you correctly)
        const guessesByPerson = await playerService.getGuessesByPersonId(new Types.ObjectId(currentUserId));
        const correctGuessesByPerson = guessesByPerson.filter(
            (guess: any) =>
                guess.guessedPersonId &&
                guess.personId.toString() === guess.guessedPersonId.toString()
        );

        const peopleWhoKnowYou = [];
        for (const guess of correctGuessesByPerson) {
            const player = await playerService.getPlayerById(guess.user.toString());
            if (player) {
                let profilePhoto = "";
                if (player.profilePhoto) {
                    const file = await fileService.getFileById(player.profilePhoto.toString());
                    profilePhoto = file?.location || "";
                }
                peopleWhoKnowYou.push({
                    _id: player._id,
                    name: player.name,
                    profilePhoto,
                    score: player.score || 0,
                });
            }
        }

        // Calculate current player's rank within the team
        const teamPlayers = allPlayers.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
        const currentPlayerRank = teamPlayers.findIndex((player: any) =>
            player._id.toString() === currentPlayer._id.toString()
        ) + 1; // +1 for 1-based ranking

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                currentPlayer: {
                    _id: currentPlayer._id,
                    name: currentPlayer.name,
                    profilePhoto: currentPlayerProfilePhoto,
                    score: currentPlayer.score || 0,
                    rank: currentPlayerRank,
                },
                peopleYouKnow,
                peopleWhoKnowYou,
                totalPlayers,
            },
        });
    } catch (error) {
        console.error("Error fetching game completion data:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export const logoutPlayer = async (
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

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });

        res.status(200).json({
            success: true,
            message: "Player logged out successfully.",
        });
    } catch (error) {
        console.error("Error logging out player:", error);
        next(new AppError("Failed to log out player.", 500));
    }
};

