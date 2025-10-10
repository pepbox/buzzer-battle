import mongoose, { Types } from "mongoose";
import { Question } from "../models/question.model";
import { QuestionResponse } from "../models/question.response.model";
import { IQuestion, IQuestionResponse } from "../types/interfaces";
import { Session } from "../../session/models/session.model";
import TeamService from "../../teams/services/team.service";

export default class QuestionService {
    private session?: mongoose.ClientSession;

    constructor(session?: mongoose.ClientSession) {
        this.session = session;
    }

    // Fetch current question based on session and question index
    async fetchCurrentQuestion(
        sessionId: Types.ObjectId | string,
        questionIndex: number
    ): Promise<IQuestion | null> {
        const sessionQuery = Session.findById(sessionId).populate('questions');
        if (this.session) {
            sessionQuery.session(this.session);
        }
        
        const sessionData = await sessionQuery;
        if (!sessionData) {
            throw new Error("Session not found");
        }

        if (questionIndex < 0 || questionIndex >= sessionData.questions.length) {
            return null;
        }

        const questionId = sessionData.questions[questionIndex];
        const questionQuery = Question.findById(questionId);
        if (this.session) {
            questionQuery.session(this.session);
        }
        
        return await questionQuery;
    }

    // Fetch question by ID (for teams - without correct answer)
    async fetchQuestionForTeam(
        questionId: Types.ObjectId | string
    ): Promise<Partial<IQuestion> | null> {
        const query = Question.findById(questionId).select('-correctAnswer');
        if (this.session) {
            query.session(this.session);
        }
        
        return await query;
    }

    // Fetch question by ID (for admin - with correct answer)
    async fetchQuestionById(
        questionId: Types.ObjectId | string
    ): Promise<IQuestion | null> {
        const query = Question.findById(questionId);
        if (this.session) {
            query.session(this.session);
        }
        
        return await query;
    }

    // Create question response
    async createQuestionResponse(
        questionId: Types.ObjectId | string,
        teamId: Types.ObjectId | string,
        responseOptionId: Types.ObjectId | string
    ): Promise<IQuestionResponse> {
        // Check if team has already responded to this question
        const existingResponseQuery = QuestionResponse.findOne({
            questionId,
            team: teamId,
        });
        if (this.session) {
            existingResponseQuery.session(this.session);
        }
        
        const existingResponse = await existingResponseQuery;
        if (existingResponse) {
            throw new Error("Team has already responded to this question");
        }

        const questionResponse = new QuestionResponse({
            questionId,
            team: teamId,
            response: responseOptionId,
        });

        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await questionResponse.save(options);
        return questionResponse;
    }

    // Validate answer and update team score
    async validateAndUpdateScore(
        questionId: Types.ObjectId | string,
        teamId: Types.ObjectId | string,
        responseOptionId: Types.ObjectId | string,
        points: number = 150
    ): Promise<{ isCorrect: boolean; pointsAwarded: number }> {
        // Fetch the question
        const questionQuery = Question.findById(questionId);
        if (this.session) {
            questionQuery.session(this.session);
        }
        
        const question = await questionQuery;
        if (!question) {
            throw new Error("Question not found");
        }

        // Check if the answer is correct
        const isCorrect = question.correctAnswer === responseOptionId.toString();

        // Update team score if correct
        if (isCorrect) {
            const teamService = new TeamService(this.session);
            await teamService.updateTeamScore(teamId, points);
            return { isCorrect: true, pointsAwarded: points };
        }

        return { isCorrect: false, pointsAwarded: 0 };
    }

    // Get all questions for a session
    async fetchQuestionsBySession(
        sessionId: Types.ObjectId | string
    ): Promise<IQuestion[]> {
        const sessionQuery = Session.findById(sessionId).populate('questions');
        if (this.session) {
            sessionQuery.session(this.session);
        }
        
        const sessionData = await sessionQuery;
        if (!sessionData) {
            throw new Error("Session not found");
        }

        return sessionData.questions as any;
    }

    // Check if team has responded to a question
    async hasTeamResponded(
        questionId: Types.ObjectId | string,
        teamId: Types.ObjectId | string
    ): Promise<boolean> {
        const query = QuestionResponse.findOne({
            questionId,
            team: teamId,
        });
        if (this.session) {
            query.session(this.session);
        }
        
        const response = await query;
        return response !== null;
    }
}
