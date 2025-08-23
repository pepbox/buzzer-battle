import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, TextField } from "@mui/material";
import { useAppDispatch } from "../../../app/hooks";
import { setCurrentStep } from "../../game/services/gameSlice";
import GlobalButton from "../../../components/ui/button";
import GameHeader from "../../../components/layout/GameHeader";
import ProgressComponent from "../../../components/layout/ProgressComponent";
import { IQuestion } from "../services/questions.slice";
import { useStoreQuestionResponseMutation } from "../services/questions.api";

interface QuestionnaireScreenProps {
  questions: IQuestion[];
  sessionId?: string;
  initialQuestionIndex?: number;
}
const QuestionnaireScreen: React.FC<QuestionnaireScreenProps> = ({
  questions = [],
  sessionId = "",
  initialQuestionIndex = 0,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [StoreQuestionResponse] = useStoreQuestionResponseMutation();
  const [currentQuestionIndex, setCurrentQuestionIndex] =
    useState<number>(initialQuestionIndex);
  const [answers, setAnswers] = useState<string[]>([]);

  // localStorage key for storing answers
  const STORAGE_KEY = `questionnaire_answers_${sessionId}`;

  // Load answers from localStorage on component mount
  useEffect(() => {
    const savedAnswers = localStorage.getItem(STORAGE_KEY);
    if (savedAnswers) {
      try {
        const parsedAnswers = JSON.parse(savedAnswers);
        setAnswers(parsedAnswers);
      } catch (error) {
        console.error("Error parsing saved answers:", error);
      }
    }
  }, [STORAGE_KEY]);

  // Update URL when question index changes
  useEffect(() => {
    if (currentQuestionIndex > 0) {
      navigate(`/game/${sessionId}/questionnaire/${currentQuestionIndex}`, {
        replace: true,
      });
    }
  }, [currentQuestionIndex, sessionId, navigate]);

  // Save answers to localStorage whenever answers change
  useEffect(() => {
    if (answers.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    }
  }, [answers, STORAGE_KEY]);

  const currentQuestion = questions[currentQuestionIndex];

  // Constants for input limits
  const MAX_WORDS = 5;
  const MAX_CHARACTERS = 30;

  // Helper function to count words
  const countWords = (text: string): number => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  // Function to handle input validation and limiting
  const handleInputChange = (value: string) => {
    // Check character limit
    if (value.length > MAX_CHARACTERS) {
      return; // Don't update if exceeds character limit
    }

    // Check word limit
    if (countWords(value) > MAX_WORDS) {
      return; // Don't update if exceeds word limit
    }

    // Update the answer if within limits
    setAnswers((prev) => {
      const updated = [...prev];
      updated[currentQuestionIndex] = value;
      return updated;
    });
  };

  const handleSubmit = () => {
    if ((answers[currentQuestionIndex] || "").trim()) {
      StoreQuestionResponse({
        question: currentQuestion._id,
        response: answers[currentQuestionIndex] || "",
      })
        .unwrap()
        .then(() => {
          console.log("Response stored successfully");
          if (currentQuestionIndex < questions.length - 1) {
            dispatch(setCurrentStep(currentQuestionIndex + 1));
            setCurrentQuestionIndex(currentQuestionIndex + 1);
          } else {
            navigate(`/game/${sessionId}/waiting`);
          }
        })
        .catch((error) => {
          console.error("Error storing response:", error);
        });
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(newIndex);
      dispatch(setCurrentStep(newIndex));
    }
  };

  if (!currentQuestion) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <GameHeader />
      <ProgressComponent />

      <Box
        position={"relative"}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "primary.main",
          height: "300px",
        }}
      >
        <Box
          position={"absolute"}
          top={"62%"}
          sx={{
            width: "100%",
            maxWidth: 300,
            bgcolor: "white",
            border: "1px solid black",
            borderRadius: 2,
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box
            position={"absolute"}
            top={0}
            component="img"
            sx={{
              // width: "185px",
              height: "150px",
              objectFit: "contain",
              transform: "translateY(-100%) translateX(-50%)",
              left: "50%",
            }}
            src={currentQuestion.questionImage}
            alt="Character 1"
          />

          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              textAlign: "center",
              mb: 2,
            }}
          >
            {currentQuestion.questionText}
          </Typography>

          <TextField
            fullWidth
            value={answers[currentQuestionIndex] || ""}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Your answer..."
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />

          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            {currentQuestionIndex > 0 && (
              <GlobalButton onClick={handlePrevious} sx={{ flex: 1 }}>
                Previous
              </GlobalButton>
            )}
            <GlobalButton
              onClick={handleSubmit}
              disabled={!(answers[currentQuestionIndex] || "").trim()}
              sx={{ flex: 1 }}
            >
              {currentQuestionIndex < questions.length - 1 ? "Next" : "Submit"}
            </GlobalButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default QuestionnaireScreen;
