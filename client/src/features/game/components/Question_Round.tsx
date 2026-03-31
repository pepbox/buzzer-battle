import React from "react";
import { Box, Typography } from "@mui/material";
import Question, { QuestionData } from "../../question/components/Question";
import normalBg from "../../../assets/background/normal_bg.webp";
import coinImage from "../../../assets/questions/coin.webp";
import starImage from "../../../assets/questions/star.webp";
import doubleCoin from "../../../assets/questions/double_coin.webp";

interface QuestionRoundProps {
  questionData: QuestionData;
  teamName: string;
  teamNumber: number;
  totalPoints: number;
  questionPoints: number;
  onAnswerSelect?: (answer: string) => void;
  selectedAnswer?: string;
  disabled?: boolean;
  showOptions?: boolean; // NEW: When false, hide MCQ options (for verbal answer flow)
  showVerbalHint?: boolean;
}

const QuestionRound: React.FC<QuestionRoundProps> = ({
  questionData,
  teamName,
  teamNumber,
  totalPoints,
  questionPoints,
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
        width: "100vw",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #87CEEB 0%, #4682B4 100%)",
        backgroundImage: `url(${normalBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        justifyContent: "space-between",
        pt: "16px",
      }}
    >
      {/* Top Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px 16px 20px",
          zIndex: 5,
        }}
      >
        {/* Left side - Coins */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <Box
            component="img"
            src={coinImage}
            alt="Coin"
            sx={{
              width: "24px",
              height: "24px",
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: "white",
              fontWeight: "bold",
              fontSize: "18px",
            }}
          >
            X {questionPoints}
          </Typography>
        </Box>

        {/* Right side - Total Points */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            boxShadow: "2px 4px 1px 0px #00000033",
            borderRadius: "20px",
            padding: "2px 10px 2px 2px",
            gap: 1,
          }}
        >
          <Box
            component="img"
            src={doubleCoin}
            alt=""
            sx={{
              width: "26px",
              height: "26px",
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: "#991CAF",
              fontWeight: "bold",
              fontSize: "16px",
            }}
          >
            {totalPoints}
          </Typography>
        </Box>
      </Box>

      {/* Main Content - Question */}
      <Box
        sx={{
          flex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: {
            xs: "20px 16px",
            sm: "30px 20px",
            md: "40px 24px",
          },
        }}
      >
        <Question
          questionData={questionData}
          selectedOptionId={selectedAnswer}
          onOptionSelect={handleAnswerSelect}
          disabled={disabled}
          showOptions={showOptions}
          showVerbalHint={showVerbalHint}
        />
      </Box>

      {/* Bottom Team Info */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 24px 8px 24px",
          backgroundColor: "#B7DFFF",
          color: "white",
        }}
      >
        {/* Team Avatar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              p: "2px 8px",
              borderRadius: "20px",
              backgroundColor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
            }}
          >
            <Box
              component="img"
              src={starImage}
              alt=""
              sx={{
                width: "16px",
                height: "16px",
              }}
            />
            <Typography
              variant="h6"
              sx={{
                color: "purple",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              {teamNumber}
            </Typography>
          </Box>
        </Box>

        {/* Team Info */}
        <Box>
          <Typography
            variant="body2"
            sx={{
              color: "black",
              fontSize: "12px",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            TEAM: {teamName}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default QuestionRound;
