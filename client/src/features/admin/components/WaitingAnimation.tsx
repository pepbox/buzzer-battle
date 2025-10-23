import React from "react";
import { Box, Typography, keyframes } from "@mui/material";
import { styled } from "@mui/material/styles";
import normalbg from "../../../assets/background/normal_bg.webp";

// Pulsing animation
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

// Floating animation
const float = keyframes`
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
  100% {
    transform: translateY(0px);
  }
`;

// // Rotating animation
// const rotate = keyframes`
//   0% {
//     transform: rotate(0deg);
//   }
//   100% {
//     transform: rotate(360deg);
//   }
// `;

// Fade in/out animation
const fadeInOut = keyframes`
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
`;

// Styled components
const AnimationContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  width: "100%",
  backgroundImage: `url(${normalbg})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  position: "relative",
  overflow: "hidden",
});

const CircleContainer = styled(Box)({
  position: "relative",
  width: 300,
  height: 300,
  marginBottom: 40,
});

const Circle = styled(Box)<{ delay?: number }>(({ delay = 0 }) => ({
  position: "absolute",
  width: "100%",
  height: "100%",
  border: "4px solid rgba(255, 255, 255, 0.3)",
  borderRadius: "50%",
  animation: `${pulse} 2s ease-in-out infinite`,
  animationDelay: `${delay}s`,
}));

const CenterIcon = styled(Box)({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  fontSize: 80,
  animation: `${float} 3s ease-in-out infinite`,
});

const WaitingText = styled(Typography)({
  color: "#ffffff",
  fontSize: 48,
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: 20,
  textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)",
  animation: `${fadeInOut} 2s ease-in-out infinite`,
});

const SubText = styled(Typography)({
  color: "rgba(255, 255, 255, 0.9)",
  fontSize: 24,
  textAlign: "center",
  maxWidth: 600,
  lineHeight: 1.6,
});

const DotsContainer = styled(Box)({
  display: "flex",
  gap: 12,
  marginTop: 30,
});

const Dot = styled(Box)<{ delay?: number }>(({ delay = 0 }) => ({
  width: 16,
  height: 16,
  borderRadius: "50%",
  backgroundColor: "#ffffff",
  animation: `${pulse} 1.4s ease-in-out infinite`,
  animationDelay: `${delay}s`,
}));

// const BackgroundCircle = styled(Box)<{
//   size: number;
//   top: string;
//   left: string;
//   delay?: number;
// }>(({ size, top, left, delay = 0 }) => ({
//   position: "absolute",
//   width: size,
//   height: size,
//   borderRadius: "50%",
//   background: "rgba(255, 255, 255, 0.05)",
//   top,
//   left,
//   animation: `${rotate} 20s linear infinite`,
//   animationDelay: `${delay}s`,
// }));

interface WaitingAnimationProps {
  sessionName?: string;
  customMessage?: string;
}

const WaitingAnimation: React.FC<WaitingAnimationProps> = ({
  sessionName,
  customMessage = "Get ready for the next question!",
}) => {
  return (
    <AnimationContainer>
      {/* Background decorative circles */}
      {/* <BackgroundCircle size={400} top="10%" left="10%" delay={0} />
      <BackgroundCircle size={300} top="60%" left="70%" delay={5} />
      <BackgroundCircle size={200} top="30%" left="80%" delay={3} /> */}

      {/* Main content */}
      <CircleContainer>
        <Circle delay={0} />
        <Circle delay={0.3} />
        <Circle delay={0.6} />
        <CenterIcon>🎯</CenterIcon>
      </CircleContainer>

      <WaitingText>Waiting for Next Question</WaitingText>

      <SubText>{customMessage}</SubText>

      {sessionName && (
        <SubText sx={{ mt: 2, fontSize: 20, opacity: 0.8 }}>
          Session: {sessionName}
        </SubText>
      )}

      <DotsContainer>
        <Dot delay={0} />
        <Dot delay={0.2} />
        <Dot delay={0.4} />
      </DotsContainer>
    </AnimationContainer>
  );
};

export default WaitingAnimation;
