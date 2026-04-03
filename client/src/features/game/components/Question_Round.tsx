import React from "react";
import { Box } from "@mui/material";
import Question, { QuestionData } from "../../question/components/Question";
import normalBg from "../../../assets/background/normal_bg.webp";

interface QuestionRoundProps {
  questionData: QuestionData;
  questionNumber?: number;
  onAnswerSelect?: (answer: string) => void;
  selectedAnswer?: string;
  disabled?: boolean;
  showOptions?: boolean; // NEW: When false, hide MCQ options (for verbal answer flow)
  showVerbalHint?: boolean;
}

const QuestionRound: React.FC<QuestionRoundProps> = ({
  questionData,
  questionNumber,
  onAnswerSelect,
  selectedAnswer,
  disabled = false,
  showOptions = true,
  showVerbalHint = true,
}) => {
  const handleAnswerSelect = (answer: string) => {
    if (onAnswerSelect) {
      onAnswerSelect(answer);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        flex: "1 0 auto",
        minHeight: "100%",
        background: "linear-gradient(180deg, #87CEEB 0%, #4682B4 100%)",
        backgroundImage: `url(${normalBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        pt: "16px",
      }}
    >
      {/* Main Content - Question */}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: {
            xs: "10px 8px",
            sm: "14px 10px",
            md: "18px 12px",
          },
        }}
      >
        <Question
          key={questionData.id}
          questionData={questionData}
          questionNumber={questionNumber}
          selectedOptionId={selectedAnswer}
          onOptionSelect={handleAnswerSelect}
          disabled={disabled}
          showOptions={showOptions}
          showVerbalHint={showVerbalHint}
        />
      </Box>
    </Box>
  );
};

export default QuestionRound;
