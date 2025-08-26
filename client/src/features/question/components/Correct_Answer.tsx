import React from "react";
import { Box, Typography } from "@mui/material";
import normalBg from "../../../assets/background/normal_bg.webp";
import correctAnswerFrame from "../../../assets/questions/Correct_Answer.webp";
import coinImage from "../../../assets/questions/coin.webp";
import doubleCoinImage from "../../../assets/questions/double_coin.webp";
import starImage from "../../../assets/questions/star.webp";

interface CorrectAnswerProps {
  pointsEarned: number;
  totalScore: number;
  teamRank: number;
  teamName: string;
}

const CorrectAnswer: React.FC<CorrectAnswerProps> = ({
  pointsEarned,
  totalScore,
  teamRank,
  teamName,
}) => {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(180deg, #87CEEB 0%, #4682B4 100%)",
        backgroundImage: `url(${normalBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Green Frame Container */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: "400px",
          aspectRatio: "1", // Keep it square-ish based on the frame
          backgroundImage: `url(${correctAnswerFrame})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Content Container - Positioned in center of frame */}
        <Box
          sx={{
            position: "absolute",
            top: "25%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "80%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            zIndex: 10,
          }}
        >
          {/* Points Earned */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              padding: "8px 16px",
            }}
          >
            <Box
              component="img"
              src={coinImage}
              alt="Coin"
              sx={{
                width: "28px",
                height: "28px",
              }}
            />
            <Typography
              variant="h6"
              sx={{
                color: "white",
                fontWeight: 700,
                fontSize: "32px",
              }}
            >
              X {pointsEarned}
            </Typography>
          </Box>

          {/* Total Score */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              backgroundColor: "white",
              borderRadius: "20px",
              padding: "8px 16px",
            }}
          >
            <Box
              component="img"
              src={doubleCoinImage}
              alt="Score"
              sx={{
                width: "26px",
                height: "26px",
              }}
            />
            <Typography
              variant="body1"
              sx={{
                color: "#DD19FF",
                fontWeight: 700,
                fontSize: {
                  xs: "14px",
                  sm: "16px",
                  md: "18px",
                },
              }}
            >
              Score: {totalScore}
            </Typography>
          </Box>
        </Box>

        {/* Team Info - Positioned at bottom of frame */}
        <Box
          sx={{
            position: "absolute",
            bottom: "12%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "55%",
            zIndex: 10,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              backgroundColor: "#FFED31",
              borderRadius: "12px",
              padding: "8px",
            }}
          >
            <Box
              display={"flex"}
              alignItems="center"
              gap={0.5}
              bgcolor={"white"}
              padding="2px 8px"
              borderRadius="20px"
            >
              <Box
                component="img"
                src={starImage}
                alt="Star"
                sx={{
                  width: {
                    xs: "16px",
                    sm: "20px",
                    md: "24px",
                  },
                  height: {
                    xs: "16px",
                    sm: "20px",
                    md: "24px",
                  },
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: "#1E293B",
                  fontWeight: 700,
                  fontSize: {
                    xs: "14px",
                    sm: "16px",
                    md: "18px",
                  },
                }}
              >
                {teamRank}
              </Typography>
            </Box>
            <Typography
              variant="body1"
              sx={{
                color: "#1E293B",
                fontWeight: 600,
                fontSize: {
                  xs: "14px",
                  sm: "16px",
                  md: "18px",
                },
                marginLeft: 1,
              }}
            >
              {teamName}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CorrectAnswer;
