import React, { useState } from "react";
import QuestionRound from "../compoenents/Question_Round";
import { QuestionData } from "../../question/components/Question";

const QuestionRoundPage: React.FC = () => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isAnswered, setIsAnswered] = useState(false);

  // Dummy question data - will be replaced with RTK Query later
  const dummyQuestionData: QuestionData = {
    id: "q1",
    text: "Which feature in Figma allows multiple people to work on a design file at the same time?",
    media: {
      url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop", // Fish image placeholder
      alt: "Fish swimming in water",
    },
    options: ["Alt/Option + Drag", "shift + f1", "ctrl + f2", "super + f3"],
  };

  // Dummy team data - will be replaced with RTK Query later
  const dummyTeamData = {
    teamName: "Mystery Masters",
    teamNumber: 2,
    totalPoints: 1500,
    questionPoints: 10,
  };

  const handleAnswerSelect = (answer: string) => {
    console.log("Answer selected:", answer);
    setSelectedAnswer(answer);
    setIsAnswered(true);
  };

  const handleTimeUp = () => {
    console.log("Time's up!");
    setIsAnswered(true);
  };

  // TODO: Replace with actual RTK Query hooks
  // const { data: questionData, isLoading: questionLoading } = useGetCurrentQuestionQuery();
  // const { data: teamData, isLoading: teamLoading } = useGetTeamDataQuery();
  // const { data: gameState, isLoading: gameLoading } = useGetGameStateQuery();

  return (
    <QuestionRound
      questionData={dummyQuestionData}
      teamName={dummyTeamData.teamName}
      teamNumber={dummyTeamData.teamNumber}
      totalPoints={dummyTeamData.totalPoints}
      questionPoints={dummyTeamData.questionPoints}
      timeLimit={30}
      selectedAnswer={selectedAnswer}
      disabled={isAnswered}
      onAnswerSelect={handleAnswerSelect}
      onTimeUp={handleTimeUp}
    />
  );
};

export default QuestionRoundPage;
