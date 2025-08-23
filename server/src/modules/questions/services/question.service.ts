import { Model, Types } from 'mongoose';
import { IQuestion, IQuestionResponse } from '../types/interfaces';
import { QuestionResponse } from '../models/question.response.model';

class QuestionService {
    private questionModel: Model<IQuestion>;

    constructor(questionModel: Model<IQuestion>) {
        this.questionModel = questionModel;
    }

    async createQuestion(data: Partial<IQuestion>): Promise<IQuestion> {
        const question = new this.questionModel({
            questionText: data.questionText,
            keyAspect: data.keyAspect,
            questionImage: data.questionImage,
        });
        return await question.save();
    }

    async getAllQuestions(): Promise<IQuestion[]> {
        return await this.questionModel.find();
    }

    async getQuestionById(id: string): Promise<IQuestion | null> {
        return await this.questionModel.findById(id);
    }

    async storeQuestionResponse(data: {
        question: string;
        player: Types.ObjectId;
        response: string;
    }): Promise<IQuestionResponse | null> {
        // Check if a response already exists for this player and question
        const existing = await QuestionResponse.findOne({
            question: data.question,
            player: data.player,
        });
        if (existing) {
            existing.response = data.response;
            return await existing.save(); // Update and return the updated response
        }
        const questionResponse = new QuestionResponse({
            question: data.question,
            player: data.player,
            response: data.response,
        });
        return await questionResponse.save();
    }

    async getResponsesByPlayerId(playerId: string): Promise<IQuestionResponse[]> {
        return await QuestionResponse.find({ player: playerId });
    }



}

export default QuestionService;