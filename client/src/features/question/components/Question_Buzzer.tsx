import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import collarImage from "../../../assets/questions/collor.webp";

interface QuestionBuzzerProps {
  questionNumber: number;
  questionText: string;
}

const QuestionBuzzer: React.FC<QuestionBuzzerProps> = ({
  questionNumber,
  questionText,
}) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: "380px",
        flex: "1",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Question Number Banner */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "90px",
          backgroundImage: `url(${collarImage})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          zIndex: 2,
          marginBottom: "-40px",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mt: "10px",
            color: "white",
            fontWeight: "bold",
            fontSize: {
              xs: "16px",
              sm: "18px",
              md: "20px",
            },
            textAlign: "center",
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          QUESTION {questionNumber}
        </Typography>
      </Box>

      {/* Question Content Box */}
      <Box
        sx={{
          position: "relative",
          width: "78%",
          backgroundColor: "white",
          borderRadius: "20px",
          padding: {
            xs: "25px 20px 70px 20px",
            sm: "30px 25px 70px 25px",
            md: "35px 30px 70px 30px",
          },
          boxShadow: "0px 3.67px 3.67px 1.83px #00000040",
          border: `6px solid ${theme.palette.primary.dark}`,
          zIndex: 1,
          minHeight: "120px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            color: "#333",
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {questionText}
        </Typography>
      </Box>
    </Box>
  );
};

export default QuestionBuzzer;
