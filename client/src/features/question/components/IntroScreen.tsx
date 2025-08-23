import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Typography, Paper } from "@mui/material";
import GlobalButton from "../../../components/ui/button";
import GameHeader from "../../../components/layout/GameHeader";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { setCurrentStep } from "../../game/services/gameSlice";
import { RootState } from "../../../app/store";

const IntroScreen: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const sessionId = useParams<{ sessionId: string }>().sessionId;
  const [currentStep, setCurrentStepLocal] = useState(0);
  const [viewedSteps, setViewedSteps] = useState<Set<number>>(new Set([0])); // Track viewed steps, start with step 0

  const GameCompleted = useAppSelector(
    (state: RootState) => state.gameArena.gameCompleted
  );
  const isGameStarted = useAppSelector(
    (state: RootState) => state.game.isGameStarted
  );

  const handleJumpIn = () => {
    dispatch(setCurrentStep(4));
    navigate(`/game/${sessionId}/questionnaire`);
  };

  const handleStepChange = (stepIndex: number) => {
    setCurrentStepLocal(stepIndex);
    setViewedSteps((prev) => new Set([...prev, stepIndex]));
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      handleStepChange(currentStep - 1);
    }
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      handleStepChange(currentStep + 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    handleStepChange(stepIndex);
  };

  // Check if all steps have been viewed
  const allStepsViewed = viewedSteps.size === 4;

  useEffect(() => {
    if (GameCompleted) {
      navigate(`/game/${sessionId}/completion`, { replace: true });
    } else if (isGameStarted) {
      navigate(`/game/${sessionId}/arena`, { replace: true });
    }
  }, [GameCompleted, isGameStarted, navigate, sessionId]);

  const gameSteps = [
    {
      id: 0,
      icon: "📝",
      title: "Answer Questions",
      description: "Share fun facts about yourself",
      color: "cardColors.yellow",
    },
    {
      id: 1,
      icon: "🧠",
      title: "Guess Players",
      description: "Match facts to people",
      color: "cardColors.lightPurple",
    },
    {
      id: 2,
      icon: "📸",
      title: "Find & Capture",
      description: "Take a selfie with them",
      color: "cardColors.green",
    },
    {
      id: 3,
      icon: "🏆",
      title: "Complete Game",
      description: "Guess everyone to win!",
      color: "cardColors.peach",
    },
  ];

  return (
    <Box
      sx={{
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <GameHeader />

      {/* Game Board Section */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          bgcolor: "primary.main",
          position: "relative",
          overflow: "hidden",
          gap: 0,
          p: 2,
          minHeight: "450px",
        }}
      >
        {/* Left Side - Game Path */}
        <Box
          sx={{
            maxWidth: "120px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            py: 2,
          }}
        >
          {/* Title */}
          <Typography
            variant="h6"
            sx={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
              mb: 2,
              fontSize: "16px",
              textWrap: "nowrap",
            }}
          >
            Game Flow
          </Typography>

          {/* Vertical Path */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              minHeight: "300px",
            }}
          >
            {/* Path Line */}
            <Box
              sx={{
                position: "absolute",
                left: "50%",
                top: "10%",
                bottom: "10%",
                width: "3px",
                bgcolor: "rgba(255,255,255,0.4)",
                transform: "translateX(-50%)",
              }}
            />

            {/* Game Steps */}
            {gameSteps.map((step, index) => {
              const isActive = currentStep === index;
              const isViewed = viewedSteps.has(index);

              return (
                <Box
                  key={step.id}
                  sx={{
                    position: "relative",
                    zIndex: 2,
                    cursor: "pointer",
                  }}
                  onClick={() => handleStepClick(index)}
                >
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      border: "2px solid white",
                      bgcolor: isActive
                        ? "#FFFFFF"
                        : isViewed
                        ? "#4FD1C5"
                        : "rgba(255,255,255,0.3)",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "scale(1.1)",
                      },
                    }}
                  >
                    {step.icon}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Right Side - Step Content */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 3,
              bgcolor: "white",
              borderRadius: 2,
              width: "100%",
              maxWidth: "280px", // Increased max width
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                mb: 1,
                textAlign: "center",
              }}
            >
              {gameSteps[currentStep].title}
            </Typography>

            <Typography
              variant="body1"
              sx={{
                fontSize: "14px",
                color: "text.secondary",
                textAlign: "center",
                mb: gameSteps[currentStep].id === 1 ? 1 : 0,
                display: gameSteps[currentStep].id === 1 ? "none" : "block",
              }}
            >
              {gameSteps[currentStep].description}
            </Typography>

            {/* Scoring Info for Guess Step */}
            {gameSteps[currentStep].id === 1 && (
              <Box sx={{ mt: 1 }}>
                {/* <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  Points = 100 - (10 × wrong attempts)
                </Typography> */}
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  Example: If you guess a person correctly then you earn{" "}
                  <b>100 pts</b>, and the person you guessed receives{" "}
                  <b>50 pts</b>.
                </Typography>

                <Typography
                  variant="subtitle2"
                  sx={{
                    mt: 1,
                    fontSize: "10px",
                    color: "text.secondary",
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  Note: For every wrong guess, you lose 10 points.
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Bottom Section */}
      <Box
        sx={{
          width: "100%",
          bgcolor: "white",
          py: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        {/* Show Back/Next buttons or Jump In button */}
        {allStepsViewed ? (
          <GlobalButton
            onClick={handleJumpIn}
            sx={{
              maxWidth: "300px",
            }}
          >
            Jump in
          </GlobalButton>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              width: "100%",
              maxWidth: "300px",
              justifyContent: "space-between",
            }}
          >
            <GlobalButton
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              sx={{
                flex: 1,
                maxWidth: "120px",
                opacity: currentStep === 0 ? 0.5 : 1,
              }}
            >
              Back
            </GlobalButton>

            <Typography
              variant="body2"
              sx={{
                fontWeight: "bold",
                color: "text.secondary",
              }}
            >
              {currentStep + 1} of 4
            </Typography>

            <GlobalButton
              onClick={handleNextStep}
              disabled={currentStep === 3}
              sx={{
                flex: 1,
                maxWidth: "120px",
                opacity: currentStep === 3 ? 0.5 : 1,
              }}
            >
              Next
            </GlobalButton>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default IntroScreen;
