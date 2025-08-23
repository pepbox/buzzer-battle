import { IPlayer, IQuestion } from '../types';
import questionaireImage from '../assets/questinaireImage.webp';

export const mockPlayers: IPlayer[] = [
  {
    id: '1',
    name: 'Udhay',
    profilePhoto: '/assets/images/udhay.jpg',
    sessionId: 'session1',
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'Pareek',
    profilePhoto: '/assets/images/pareek.jpg',
    sessionId: 'session1',
    createdAt: new Date(),
  },
];

export const mockQuestions: IQuestion[] = [
  {
    id: '1',
    questionText: 'You were born in...?',
    keyAspect: 'birthplace',
    questionImage: questionaireImage,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    questionText: 'One food you\'ll never say no to?',
    keyAspect: 'food',
    questionImage: questionaireImage,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    questionText: 'Your most-used emoji?',
    keyAspect: 'emoji',
    questionImage: questionaireImage,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    questionText: 'Something you vibe with daily?',
    keyAspect: 'daily_vibe',
    questionImage: questionaireImage,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];