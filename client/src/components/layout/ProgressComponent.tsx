import React from "react";
import { LinearProgress, Box } from "@mui/material";
import { useAppSelector } from "../../app/hooks";

const ProgressComponent: React.FC = () => {
  const { totalSteps, currentStep } = useAppSelector((state) => state.game);
  const progressValue = (currentStep / totalSteps) * 100;

  return (
    <Box
      sx={{
        width: "100%",
        height: "50px",
        zIndex: 1000,
        display: "flex",
        px: 2,
        alignItems: "center",
      }}
    >
      <LinearProgress
        variant="determinate"
        value={progressValue}
        sx={{
          width: "100%",
          height: 6,
          borderRadius: 0,
          backgroundColor: "#78788029",
          "& .MuiLinearProgress-bar": {
            borderRadius: 0,
            backgroundColor: "secondary.main",
          },
        }}
      />
    </Box>
  );
};
export default ProgressComponent;
